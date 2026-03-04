/// <reference lib="webworker" />

import { normalizeCatalog } from "../lib/normalize-core.js";
import { makeSnippet, normalizeGerman, tokenize } from "../lib/text";
import type {
  CatalogIndexPayload,
  CatalogMeta,
  ControlDetail,
  RelationGraphPayload,
  SearchDoc,
  SearchQuery,
  SearchResponse
} from "../types";

type IndexedDoc = SearchDoc & {
  __norm: {
    id: string;
    title: string;
    statement: string;
    guidance: string;
    params: string;
    props: string;
    tags: string;
    targetObjects: string;
  };
};

type WorkerRequest = {
  type: "init" | "search" | "get-control" | "get-neighborhood" | "load-upload";
  requestId: string;
  payload?: any;
};

type WorkerResponse = {
  type: "response";
  requestId: string;
  ok: boolean;
  data?: any;
  error?: string;
};

let docs: IndexedDoc[] = [];
let docsById = new Map<string, IndexedDoc>();
let facetOptions: CatalogIndexPayload["facetOptions"] = {
  topGroupId: [],
  secLevel: [],
  effortLevel: [],
  class: [],
  modalverbs: [],
  targetObjects: [],
  tags: [],
  relationTypes: []
};
let detailBasePath = "./data/details";
let detailChunks = new Map<string, Record<string, ControlDetail>>();
let inlineDetails = new Map<string, ControlDetail>();

function setIndexedDocs(inputDocs: SearchDoc[]) {
  docs = toIndexedDocs(inputDocs);
  docsById = new Map(docs.map((doc) => [doc.id, doc]));
}

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label} konnte nicht geladen werden (HTTP ${response.status}). URL: ${url}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `${label} ist kein JSON. URL: ${url}. content-type=${contentType || "unknown"}. Antwortbeginn: ${snippet}`
    );
  }
}

function toIndexedDocs(inputDocs: SearchDoc[]): IndexedDoc[] {
  return inputDocs.map((doc) => ({
    ...doc,
    __norm: {
      id: normalizeGerman(doc.id),
      title: normalizeGerman(doc.title),
      statement: normalizeGerman(doc.statementText),
      guidance: normalizeGerman(doc.guidanceText),
      params: normalizeGerman(doc.paramsText),
      props: normalizeGerman(doc.propsText),
      tags: normalizeGerman((doc.facets.tags || []).join(" ")),
      targetObjects: normalizeGerman((doc.facets.targetObjects || []).join(" "))
    }
  }));
}

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "de"));
}

function computeFacetOptions(currentDocs: SearchDoc[]) {
  return {
    topGroupId: uniqSorted(currentDocs.map((doc) => doc.facets.topGroupId || "")),
    secLevel: uniqSorted(currentDocs.map((doc) => doc.facets.secLevel || "")),
    effortLevel: uniqSorted(currentDocs.map((doc) => doc.facets.effortLevel || "")),
    class: uniqSorted(currentDocs.map((doc) => doc.facets.class || "")),
    modalverbs: uniqSorted(currentDocs.flatMap((doc) => doc.facets.modalverbs || [])),
    targetObjects: uniqSorted(currentDocs.flatMap((doc) => doc.facets.targetObjects || [])),
    tags: uniqSorted(currentDocs.flatMap((doc) => doc.facets.tags || [])),
    relationTypes: uniqSorted(currentDocs.flatMap((doc) => doc.facets.relationTypes || []))
  };
}

function includesAny(docValues: string[], filterValues: string[]) {
  if (filterValues.length === 0) {
    return true;
  }
  if (docValues.length === 0) {
    return false;
  }
  return filterValues.some((value) => docValues.includes(value));
}

function matchesFilters(doc: IndexedDoc, query: SearchQuery): boolean {
  const filters = query.filters;
  if (filters.topGroupId.length > 0 && !filters.topGroupId.includes(doc.facets.topGroupId)) {
    return false;
  }
  if (filters.groupId.length > 0 && !filters.groupId.includes(doc.facets.groupId || "")) {
    return false;
  }
  if (filters.secLevel.length > 0 && !filters.secLevel.includes(doc.facets.secLevel || "")) {
    return false;
  }
  if (filters.effortLevel.length > 0 && !filters.effortLevel.includes(doc.facets.effortLevel || "")) {
    return false;
  }
  if (filters.class.length > 0 && !filters.class.includes(doc.facets.class || "")) {
    return false;
  }
  if (!includesAny(doc.facets.modalverbs || [], filters.modalverbs)) {
    return false;
  }
  if (!includesAny(doc.facets.targetObjects || [], filters.targetObjects)) {
    return false;
  }
  if (!includesAny(doc.facets.tags || [], filters.tags)) {
    return false;
  }
  if (!includesAny(doc.facets.relationTypes || [], filters.relationTypes)) {
    return false;
  }
  return true;
}

function scoreDoc(doc: IndexedDoc, queryNorm: string, tokens: string[]) {
  if (!queryNorm) {
    return 0;
  }

  let score = 0;
  if (doc.__norm.id === queryNorm) {
    score += 1000;
  }
  if (doc.__norm.id.startsWith(queryNorm)) {
    score += 350;
  }
  if (doc.__norm.id.includes(queryNorm)) {
    score += 120;
  }
  if (doc.__norm.title.includes(queryNorm)) {
    score += 80;
  }

  for (const token of tokens) {
    if (doc.__norm.title.includes(token)) {
      score += 16;
    }
    if (doc.__norm.statement.includes(token)) {
      score += 10;
    }
    if (doc.__norm.guidance.includes(token)) {
      score += 6;
    }
    if (doc.__norm.props.includes(token)) {
      score += 4;
    }
    if (doc.__norm.params.includes(token)) {
      score += 4;
    }
    if (doc.__norm.tags.includes(token)) {
      score += 3;
    }
    if (doc.__norm.targetObjects.includes(token)) {
      score += 3;
    }
  }

  return score;
}

function countFacetValues(
  inputDocs: IndexedDoc[],
  getter: (doc: IndexedDoc) => string | string[] | null | undefined
): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const doc of inputDocs) {
    const raw = getter(doc);
    if (raw == null) {
      continue;
    }
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (!value) {
        continue;
      }
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "de"));
}

function buildSearchResponse(filteredDocs: IndexedDoc[], query: SearchQuery): SearchResponse {
  const startedAt = performance.now();
  const queryNorm = normalizeGerman(query.text || "");
  const queryTokens = tokenize(query.text || "");

  let scored = filteredDocs.map((doc) => ({
    doc,
    score: scoreDoc(doc, queryNorm, queryTokens)
  }));

  if (queryNorm) {
    scored = scored.filter((item) => item.score > 0);
  }

  if (query.sort === "id-asc") {
    scored.sort((a, b) => a.doc.id.localeCompare(b.doc.id, "de"));
  } else if (query.sort === "title-asc") {
    scored.sort((a, b) => a.doc.title.localeCompare(b.doc.title, "de"));
  } else {
    scored.sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id, "de"));
  }

  const total = scored.length;
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 120;
  const page = scored.slice(offset, offset + limit);

  const items = page.map(({ doc, score }) => ({
    id: doc.id,
    title: doc.title,
    score,
    topGroupId: doc.topGroupId,
    groupId: doc.facets.groupId,
    class: doc.class,
    secLevel: doc.facets.secLevel,
    effortLevel: doc.facets.effortLevel,
    modalverbs: doc.facets.modalverbs,
    targetObjects: doc.facets.targetObjects,
    tags: doc.facets.tags,
    snippet: makeSnippet(doc.statementText || doc.guidanceText || "", queryTokens),
    breadcrumbs: doc.breadcrumbs
  }));

  const facets = {
    topGroupId: countFacetValues(scored.map((item) => item.doc), (doc) => doc.facets.topGroupId),
    secLevel: countFacetValues(scored.map((item) => item.doc), (doc) => doc.facets.secLevel),
    effortLevel: countFacetValues(scored.map((item) => item.doc), (doc) => doc.facets.effortLevel),
    class: countFacetValues(scored.map((item) => item.doc), (doc) => doc.facets.class),
    modalverbs: countFacetValues(scored.map((item) => item.doc), (doc) => doc.facets.modalverbs),
    targetObjects: countFacetValues(scored.map((item) => item.doc), (doc) => doc.facets.targetObjects),
    tags: countFacetValues(scored.map((item) => item.doc), (doc) => doc.facets.tags),
    relationTypes: countFacetValues(scored.map((item) => item.doc), (doc) => doc.facets.relationTypes)
  };

  return {
    total,
    items,
    facets,
    elapsedMs: performance.now() - startedAt
  };
}

async function loadChunk(topGroupId: string): Promise<Record<string, ControlDetail>> {
  if (detailChunks.has(topGroupId)) {
    return detailChunks.get(topGroupId)!;
  }

  const payload = await fetchJson<{ controls?: Record<string, ControlDetail> }>(
    `${detailBasePath}/${encodeURIComponent(topGroupId)}.json`,
    `Detail-Chunk fuer ${topGroupId}`
  );
  const controls = (payload.controls ?? {}) as Record<string, ControlDetail>;
  detailChunks.set(topGroupId, controls);
  for (const [id, detail] of Object.entries(controls)) {
    inlineDetails.set(id, detail);
  }
  return controls;
}

function topGroupIdForControl(controlId: string): string | null {
  return docsById.get(controlId)?.topGroupId ?? null;
}

async function getControlDetailById(controlId: string, topGroupId?: string | null): Promise<ControlDetail | null> {
  if (inlineDetails.has(controlId)) {
    return inlineDetails.get(controlId)!;
  }

  const resolvedTopGroupId = topGroupId ?? topGroupIdForControl(controlId);
  if (!resolvedTopGroupId) {
    return null;
  }

  const controls = await loadChunk(resolvedTopGroupId);
  return controls[controlId] ?? null;
}

async function buildNeighborhoodGraph(controlId: string, hops: 1 | 2): Promise<RelationGraphPayload> {
  const clampedHops: 1 | 2 = hops === 2 ? 2 : 1;
  const maxNodes = clampedHops === 2 ? 120 : 80;
  const nodes = new Map<string, { id: string; title: string; topGroupId: string | null; depth: 0 | 1 | 2 }>();
  const edges = new Map<string, { sourceControlId: string; targetControlId: string; relType: string; depth: 1 | 2; direction: "incoming" | "outgoing" }>();
  const visited = new Set<string>();

  const rootDoc = docsById.get(controlId);
  nodes.set(controlId, {
    id: controlId,
    title: rootDoc?.title ?? controlId,
    topGroupId: rootDoc?.topGroupId ?? null,
    depth: 0
  });

  let frontier = [controlId];
  for (let depth = 1 as 1 | 2; depth <= clampedHops; depth = (depth + 1) as 1 | 2) {
    const nextFrontier: string[] = [];

    for (const currentId of frontier) {
      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      const detail = await getControlDetailById(currentId);
      if (!detail) {
        continue;
      }

      for (const outgoing of detail.relationsOutgoing) {
        const target = outgoing.targetControlId;
        const targetDoc = docsById.get(target);
        if (!nodes.has(target) && nodes.size < maxNodes) {
          nodes.set(target, {
            id: target,
            title: targetDoc?.title ?? target,
            topGroupId: targetDoc?.topGroupId ?? null,
            depth
          });
        }
        if (nodes.has(target)) {
          if (depth < clampedHops && !visited.has(target)) {
            nextFrontier.push(target);
          }
          const key = `${outgoing.sourceControlId}|${target}|${outgoing.relType}|${depth}|out`;
          if (!edges.has(key)) {
            edges.set(key, {
              sourceControlId: outgoing.sourceControlId,
              targetControlId: target,
              relType: outgoing.relType,
              depth,
              direction: "outgoing"
            });
          }
        }
      }

      for (const incoming of detail.relationsIncoming) {
        const source = incoming.sourceControlId;
        const sourceDoc = docsById.get(source);
        if (!nodes.has(source) && nodes.size < maxNodes) {
          nodes.set(source, {
            id: source,
            title: sourceDoc?.title ?? source,
            topGroupId: sourceDoc?.topGroupId ?? null,
            depth
          });
        }
        if (nodes.has(source)) {
          if (depth < clampedHops && !visited.has(source)) {
            nextFrontier.push(source);
          }
          const key = `${source}|${incoming.targetControlId}|${incoming.relType}|${depth}|in`;
          if (!edges.has(key)) {
            edges.set(key, {
              sourceControlId: source,
              targetControlId: incoming.targetControlId,
              relType: incoming.relType,
              depth,
              direction: "incoming"
            });
          }
        }
      }
    }

    frontier = Array.from(new Set(nextFrontier));
  }

  return {
    focusId: controlId,
    hops: clampedHops,
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values())
  };
}

async function handleRequest(request: WorkerRequest): Promise<any> {
  if (request.type === "init") {
    const indexUrl = request.payload?.indexUrl;
    detailBasePath = request.payload?.detailBasePath ?? detailBasePath;
    const payload = await fetchJson<CatalogIndexPayload>(indexUrl, "Indexdaten");
    setIndexedDocs(payload.docs);
    facetOptions = payload.facetOptions;
    detailChunks.clear();
    inlineDetails.clear();

    return {
      stats: payload.stats,
      facetOptions
    };
  }

  if (request.type === "search") {
    const query: SearchQuery = request.payload;
    const filteredDocs = docs.filter((doc) => matchesFilters(doc, query));
    return buildSearchResponse(filteredDocs, query);
  }

  if (request.type === "get-control") {
    const controlId: string = request.payload?.id;
    const topGroupId: string = request.payload?.topGroupId;
    const detail = await getControlDetailById(controlId, topGroupId);
    if (!detail) {
      throw new Error(`Control ${controlId} wurde nicht gefunden.`);
    }

    return detail;
  }

  if (request.type === "get-neighborhood") {
    const controlId: string = request.payload?.id;
    const hops = request.payload?.hops === 2 ? 2 : 1;
    if (!controlId) {
      throw new Error("Control-ID fehlt.");
    }
    return buildNeighborhoodGraph(controlId, hops);
  }

  if (request.type === "load-upload") {
    const rawText = String(request.payload?.rawText ?? "");
    const normalized = normalizeCatalog(JSON.parse(rawText));
    setIndexedDocs(normalized.docs);
    facetOptions = computeFacetOptions(normalized.docs);
    detailChunks.clear();
    inlineDetails.clear();

    for (const chunk of Object.values(normalized.detailsByTopGroup) as Array<{ controls: Record<string, ControlDetail> }>) {
      for (const [id, detail] of Object.entries(chunk.controls)) {
        inlineDetails.set(id, detail);
      }
    }

    const meta: Partial<CatalogMeta> = {
      ...normalized.meta,
      stats: normalized.stats,
      groups: normalized.groups,
      groupTree: normalized.groupTree
    };

    return {
      facetOptions,
      meta,
      stats: normalized.stats
    };
  }

  throw new Error(`Unbekannter Request-Typ: ${request.type}`);
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const response: WorkerResponse = {
    type: "response",
    requestId: request.requestId,
    ok: true
  };

  try {
    response.data = await handleRequest(request);
  } catch (error) {
    response.ok = false;
    response.error = error instanceof Error ? error.message : "Unbekannter Worker-Fehler";
  }

  self.postMessage(response);
});
