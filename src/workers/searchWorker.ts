/// <reference lib="webworker" />

import {
  CatalogIndexSchema,
  DetailChunkSchema,
  NormalizedCatalogSchema,
  UploadCatalogSchema,
  type CatalogIndexPayloadValidated
} from "../lib/dataSchemas";
import { fetchJsonWithValidation } from "../lib/fetchJsonSafe";
import { normalizeCatalog } from "../lib/normalize-core.js";
import { limitQueryTokens, sanitizeSearchText } from "../lib/searchSafety";
import { SECURITY_BUDGETS } from "../lib/securityBudgets";
import { makeSnippet, normalizeGerman, tokenize } from "../lib/text";
import { assertByteBudget, parseJsonOrThrow, validateOrThrow } from "../lib/validation";
import type {
  CatalogMeta as CatalogMetaType,
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
  type: "init" | "search" | "get-control" | "get-neighborhood" | "load-upload" | "cancel";
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

class RequestCancelledError extends Error {
  constructor() {
    super("Anfrage wurde abgebrochen.");
    this.name = "RequestCancelledError";
  }
}

let docs: IndexedDoc[] = [];
let docsById = new Map<string, IndexedDoc>();
let facetOptions: CatalogIndexPayloadValidated["facetOptions"] = {
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
const cancelledRequests = new Set<string>();

function assertRequestNotCancelled(requestId: string) {
  if (cancelledRequests.has(requestId)) {
    throw new RequestCancelledError();
  }
}

async function checkpoint(
  requestId: string,
  startedAt: number,
  context: string,
  maxDurationMs: number = SECURITY_BUDGETS.searchTimeBudgetMs
) {
  assertRequestNotCancelled(requestId);
  if (performance.now() - startedAt > maxDurationMs) {
    throw new Error(`${context} hat das Zeitbudget von ${maxDurationMs}ms ueberschritten.`);
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  assertRequestNotCancelled(requestId);
}

function setIndexedDocs(inputDocs: SearchDoc[]) {
  if (inputDocs.length > SECURITY_BUDGETS.maxControlCount) {
    throw new Error(
      `Index enthaelt zu viele Controls (${inputDocs.length} > ${SECURITY_BUDGETS.maxControlCount}).`
    );
  }
  docs = toIndexedDocs(inputDocs);
  docsById = new Map(docs.map((doc) => [doc.id, doc]));
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

function clampFilterValues(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => String(value ?? "").trim().slice(0, SECURITY_BUDGETS.maxShortTextChars))
    .filter(Boolean)
    .slice(0, SECURITY_BUDGETS.maxArrayItems);
}

function normalizeSearchQuery(rawQuery: SearchQuery): SearchQuery {
  const safeText = sanitizeSearchText(rawQuery?.text ?? "");
  return {
    text: safeText,
    sort:
      rawQuery?.sort === "id-asc" ||
      rawQuery?.sort === "id-desc" ||
      rawQuery?.sort === "title-asc" ||
      rawQuery?.sort === "title-desc" ||
      rawQuery?.sort === "effort-asc" ||
      rawQuery?.sort === "effort-desc"
        ? rawQuery.sort
        : "relevance",
    filters: {
      topGroupId: clampFilterValues(rawQuery?.filters?.topGroupId),
      groupId: clampFilterValues(rawQuery?.filters?.groupId),
      secLevel: clampFilterValues(rawQuery?.filters?.secLevel),
      effortLevel: clampFilterValues(rawQuery?.filters?.effortLevel),
      class: clampFilterValues(rawQuery?.filters?.class),
      modalverbs: clampFilterValues(rawQuery?.filters?.modalverbs),
      targetObjects: clampFilterValues(rawQuery?.filters?.targetObjects),
      tags: clampFilterValues(rawQuery?.filters?.tags),
      relationTypes: clampFilterValues(rawQuery?.filters?.relationTypes)
    },
    limit: Math.max(0, Math.min(rawQuery?.limit ?? 120, 1200)),
    offset: Math.max(0, Math.min(rawQuery?.offset ?? 0, SECURITY_BUDGETS.maxControlCount))
  };
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

async function buildSearchResponse(query: SearchQuery, requestId: string): Promise<SearchResponse> {
  const startedAt = performance.now();
  const normalizedQuery = normalizeSearchQuery(query);
  const queryNorm = normalizeGerman(normalizedQuery.text || "");
  const queryTokens = limitQueryTokens(tokenize(normalizedQuery.text || ""));

  const filteredDocs: IndexedDoc[] = [];
  for (let i = 0; i < docs.length; i += 1) {
    if (matchesFilters(docs[i], normalizedQuery)) {
      filteredDocs.push(docs[i]);
    }

    if (i > 0 && i % SECURITY_BUDGETS.searchCheckpointInterval === 0) {
      await checkpoint(requestId, startedAt, "Suche");
    }
  }

  let scored = filteredDocs.map((doc) => ({
    doc,
    score: scoreDoc(doc, queryNorm, queryTokens)
  }));

  if (queryNorm) {
    scored = scored.filter((item) => item.score > 0);
  }

  if (normalizedQuery.sort === "id-asc") {
    scored.sort((a, b) => a.doc.id.localeCompare(b.doc.id, "de"));
  } else if (normalizedQuery.sort === "id-desc") {
    scored.sort((a, b) => b.doc.id.localeCompare(a.doc.id, "de"));
  } else if (normalizedQuery.sort === "title-asc") {
    scored.sort((a, b) => a.doc.title.localeCompare(b.doc.title, "de"));
  } else if (normalizedQuery.sort === "title-desc") {
    scored.sort((a, b) => b.doc.title.localeCompare(a.doc.title, "de"));
  } else if (normalizedQuery.sort === "effort-asc" || normalizedQuery.sort === "effort-desc") {
    const direction = normalizedQuery.sort === "effort-asc" ? "asc" : "desc";
    /* REQ: Clarification Pack §10 (fehlende Aufwandwerte immer am Ende) */
    scored.sort((a, b) => {
      const valueA = a.doc.facets.effortLevel;
      const valueB = b.doc.facets.effortLevel;

      const missingA = valueA == null || valueA === "";
      const missingB = valueB == null || valueB === "";
      if (missingA && !missingB) {
        return 1;
      }
      if (!missingA && missingB) {
        return -1;
      }
      if (missingA && missingB) {
        return a.doc.id.localeCompare(b.doc.id, "de");
      }

      const numA = Number(valueA);
      const numB = Number(valueB);
      const bothNumeric = Number.isFinite(numA) && Number.isFinite(numB);
      const baseCompare = bothNumeric
        ? numA - numB
        : String(valueA).localeCompare(String(valueB), "de");

      const directionalCompare = direction === "asc" ? baseCompare : -baseCompare;
      return directionalCompare || a.doc.id.localeCompare(b.doc.id, "de");
    });
  } else {
    scored.sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id, "de"));
  }

  const total = scored.length;
  const offset = normalizedQuery.offset ?? 0;
  const limit = normalizedQuery.limit ?? 120;
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

  const docsForFacets = scored.map((item) => item.doc);
  const facets = {
    topGroupId: countFacetValues(docsForFacets, (doc) => doc.facets.topGroupId),
    secLevel: countFacetValues(docsForFacets, (doc) => doc.facets.secLevel),
    effortLevel: countFacetValues(docsForFacets, (doc) => doc.facets.effortLevel),
    class: countFacetValues(docsForFacets, (doc) => doc.facets.class),
    modalverbs: countFacetValues(docsForFacets, (doc) => doc.facets.modalverbs),
    targetObjects: countFacetValues(docsForFacets, (doc) => doc.facets.targetObjects),
    tags: countFacetValues(docsForFacets, (doc) => doc.facets.tags),
    relationTypes: countFacetValues(docsForFacets, (doc) => doc.facets.relationTypes)
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

  const payload = await fetchJsonWithValidation({
    url: `${detailBasePath}/${encodeURIComponent(topGroupId)}.json`,
    label: `Detail-Chunk fuer ${topGroupId}`,
    schema: DetailChunkSchema,
    maxBytes: SECURITY_BUDGETS.maxRemoteJsonBytes.detailChunk
  });

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

async function buildNeighborhoodGraph(controlId: string, hops: 1 | 2, requestId: string): Promise<RelationGraphPayload> {
  const startedAt = performance.now();
  const clampedHops: 1 | 2 = hops === 2 ? 2 : 1;
  const maxNodes = clampedHops === 2 ? 120 : 80;
  const nodes = new Map<string, { id: string; title: string; topGroupId: string | null; depth: 0 | 1 | 2 }>();
  const edges = new Map<
    string,
    { sourceControlId: string; targetControlId: string; relType: string; depth: 1 | 2; direction: "incoming" | "outgoing" }
  >();
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
      assertRequestNotCancelled(requestId);
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

      if (visited.size % SECURITY_BUDGETS.searchCheckpointInterval === 0) {
        await checkpoint(requestId, startedAt, "Graph-Berechnung");
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
    const indexUrl = String(request.payload?.indexUrl ?? "").trim();
    const nextDetailBasePath = String(request.payload?.detailBasePath ?? "").trim();

    if (!indexUrl) {
      throw new Error("Index-URL fehlt.");
    }

    detailBasePath = nextDetailBasePath || detailBasePath;
    const payload = await fetchJsonWithValidation({
      url: indexUrl,
      label: "Indexdaten",
      schema: CatalogIndexSchema,
      maxBytes: SECURITY_BUDGETS.maxRemoteJsonBytes.catalogIndex
    });

    setIndexedDocs(payload.docs as SearchDoc[]);
    facetOptions = payload.facetOptions as CatalogIndexPayloadValidated["facetOptions"];
    detailChunks.clear();
    inlineDetails.clear();

    return {
      stats: payload.stats,
      facetOptions
    };
  }

  if (request.type === "search") {
    const query = normalizeSearchQuery(request.payload as SearchQuery);
    return buildSearchResponse(query, request.requestId);
  }

  if (request.type === "get-control") {
    const controlId: string = String(request.payload?.id ?? "").trim();
    const topGroupId: string = String(request.payload?.topGroupId ?? "").trim();
    if (!controlId) {
      throw new Error("Control-ID fehlt.");
    }

    const detail = await getControlDetailById(controlId, topGroupId || null);
    if (!detail) {
      throw new Error(`Control ${controlId} wurde nicht gefunden.`);
    }

    return detail;
  }

  if (request.type === "get-neighborhood") {
    const controlId: string = String(request.payload?.id ?? "").trim();
    const hops = request.payload?.hops === 2 ? 2 : 1;
    if (!controlId) {
      throw new Error("Control-ID fehlt.");
    }
    return buildNeighborhoodGraph(controlId, hops, request.requestId);
  }

  if (request.type === "load-upload") {
    const startedAt = performance.now();
    assertRequestNotCancelled(request.requestId);
    const rawText = String(request.payload?.rawText ?? "");
    assertByteBudget(rawText, SECURITY_BUDGETS.maxUploadFileSizeBytes, "Upload-Datei");

    const parsed = parseJsonOrThrow(rawText, "Upload-Datei");
    const validatedInput = validateOrThrow(parsed, UploadCatalogSchema, "Upload-Katalogstruktur");

    await checkpoint(request.requestId, startedAt, "Upload-Validierung", SECURITY_BUDGETS.uploadIngestionBudgetMs);
    const normalized = normalizeCatalog(validatedInput);
    await checkpoint(request.requestId, startedAt, "Upload-Normalisierung", SECURITY_BUDGETS.uploadIngestionBudgetMs);
    const validatedNormalized = validateOrThrow(normalized, NormalizedCatalogSchema, "Upload-Kataloginhalt");

    setIndexedDocs(validatedNormalized.docs as SearchDoc[]);
    facetOptions = computeFacetOptions(validatedNormalized.docs as SearchDoc[]);
    detailChunks.clear();
    inlineDetails.clear();

    let importedControls = 0;
    for (const chunk of Object.values(validatedNormalized.detailsByTopGroup) as Array<{ controls: Record<string, ControlDetail> }>) {
      for (const [id, detail] of Object.entries(chunk.controls)) {
        inlineDetails.set(id, detail);
        importedControls += 1;
        if (importedControls % SECURITY_BUDGETS.searchCheckpointInterval === 0) {
          await checkpoint(request.requestId, startedAt, "Upload-Indexierung", SECURITY_BUDGETS.uploadIngestionBudgetMs);
        }
      }
    }

    const meta = {
      ...validatedNormalized.meta,
      stats: validatedNormalized.stats as CatalogMetaType["stats"],
      groups: validatedNormalized.groups as CatalogMetaType["groups"],
      groupTree: validatedNormalized.groupTree as CatalogMetaType["groupTree"]
    } as Partial<CatalogMetaType>;

    return {
      facetOptions,
      meta,
      stats: validatedNormalized.stats
    };
  }

  throw new Error(`Unbekannter Request-Typ: ${request.type}`);
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (!request || !request.type || !request.requestId) {
    return;
  }

  if (request.type === "cancel") {
    cancelledRequests.add(request.requestId);
    return;
  }

  cancelledRequests.delete(request.requestId);

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
  } finally {
    cancelledRequests.delete(request.requestId);
  }

  self.postMessage(response);
});
