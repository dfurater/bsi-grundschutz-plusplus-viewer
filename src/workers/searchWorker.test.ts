import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ControlDetail, SearchDoc, SearchResponse } from "../types";
import { defaultFilters } from "../lib/routing";
import { SECURITY_BUDGETS } from "../lib/securityBudgets";

const fetchJsonWithValidationMock = vi.fn();

vi.mock("../lib/fetchJsonSafe", () => ({
  fetchJsonWithValidation: fetchJsonWithValidationMock
}));

interface WorkerMessageRequest {
  type: string;
  requestId: string;
  payload?: unknown;
}

interface WorkerMessageResponse {
  type: "response";
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

class MockWorkerScope {
  private onMessage: ((event: MessageEvent<WorkerMessageRequest>) => Promise<void> | void) | null = null;
  responses: WorkerMessageResponse[] = [];

  addEventListener(type: string, handler: (event: MessageEvent<WorkerMessageRequest>) => Promise<void> | void) {
    if (type === "message") {
      this.onMessage = handler;
    }
  }

  postMessage(message: WorkerMessageResponse) {
    this.responses.push(message);
  }

  async dispatch(data: Partial<WorkerMessageRequest>) {
    if (!this.onMessage) {
      throw new Error("Worker message listener wurde nicht registriert.");
    }
    await this.onMessage({ data: data as WorkerMessageRequest } as MessageEvent<WorkerMessageRequest>);
  }
}

function createDoc(id: string, overrides: Partial<SearchDoc> = {}): SearchDoc {
  const topGroupId = overrides.topGroupId ?? "APP";
  return {
    docId: `doc-${id}`,
    entityType: "control",
    id,
    title: `Control ${id}`,
    class: null,
    topGroupId,
    parentGroupId: null,
    parentControlId: null,
    breadcrumbs: [topGroupId, id],
    groupPathIds: [topGroupId],
    groupPathTitles: [topGroupId],
    statementText: `Statement fuer ${id}`,
    guidanceText: `Guidance fuer ${id}`,
    paramsText: "",
    propsText: "",
    facets: {
      topGroupId,
      groupId: `${topGroupId}.1`,
      secLevel: "hoch",
      effortLevel: "2",
      class: null,
      tags: ["netzwerk"],
      modalverbs: ["SOLL"],
      targetObjects: ["SYS.1"],
      relationTypes: ["required"],
      hasRelations: false
    },
    ...overrides
  };
}

function createDetail(
  id: string,
  topGroupId: string,
  overrides: Partial<ControlDetail> = {}
): ControlDetail {
  return {
    id,
    title: `Control ${id}`,
    class: null,
    topGroupId,
    parentGroupId: null,
    parentControlId: null,
    controlDepth: 1,
    groupPathIds: [topGroupId],
    groupPathTitles: [topGroupId],
    controlPathIds: [id],
    controlPathTitles: [id],
    pathIds: [topGroupId, id],
    breadcrumbs: [topGroupId, id],
    statementText: `Statement fuer ${id}`,
    guidanceText: "",
    props: [],
    propsMap: {},
    params: [],
    parts: [],
    tags: ["netzwerk"],
    modalverbs: ["SOLL"],
    targetObjects: ["SYS.1"],
    secLevel: "hoch",
    effortLevel: "2",
    links: [],
    relationsOutgoing: [],
    relationsIncoming: [],
    ...overrides
  };
}

function findResponse(scope: MockWorkerScope, requestId: string): WorkerMessageResponse {
  const response = scope.responses.find((entry) => entry.requestId === requestId);
  if (!response) {
    throw new Error(`Antwort fuer ${requestId} fehlt.`);
  }
  return response;
}

async function loadWorker(scope: MockWorkerScope) {
  Object.defineProperty(globalThis, "self", {
    configurable: true,
    writable: true,
    value: scope
  });
  await import("./searchWorker");
}

const originalSelf = (globalThis as { self?: unknown }).self;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalSelf === undefined) {
    Reflect.deleteProperty(globalThis as Record<string, unknown>, "self");
  } else {
    Object.defineProperty(globalThis, "self", {
      configurable: true,
      writable: true,
      value: originalSelf
    });
  }
});

describe("searchWorker contract", () => {
  it("ignores malformed inbound messages without request envelope", async () => {
    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({ payload: { any: true } });
    expect(scope.responses).toHaveLength(0);
  });

  it("returns init/search responses for valid worker message contracts", async () => {
    const docs = [createDoc("APP.1"), createDoc("APP.2")];
    fetchJsonWithValidationMock.mockImplementation(async ({ label }: { label: string }) => {
      if (label === "Indexdaten") {
        return {
          stats: {
            topGroupCount: 1,
            groupCount: 2,
            controlCount: 2,
            relationCount: 0,
            controlsWithRelations: 0
          },
          facetOptions: {
            topGroupId: ["APP"],
            secLevel: ["hoch"],
            effortLevel: ["2"],
            class: [],
            modalverbs: ["SOLL"],
            targetObjects: ["SYS.1"],
            tags: ["netzwerk"],
            relationTypes: []
          },
          docs
        };
      }
      throw new Error(`Unerwartetes Label: ${label}`);
    });

    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "init",
      requestId: "init-1",
      payload: {
        indexUrl: "/data/catalog-index.json",
        detailBasePath: "/data/details"
      }
    });
    await scope.dispatch({
      type: "search",
      requestId: "search-1",
      payload: {
        text: "APP.1",
        sort: "relevance",
        filters: defaultFilters(),
        limit: 10,
        offset: 0
      }
    });

    const initResponse = findResponse(scope, "init-1");
    expect(initResponse.ok).toBe(true);
    expect(initResponse.data).toMatchObject({
      stats: {
        controlCount: 2
      }
    });

    const searchResponse = findResponse(scope, "search-1");
    expect(searchResponse.ok).toBe(true);
    expect(searchResponse.data).toMatchObject({
      total: 1,
      items: [{ id: "APP.1" }]
    });
  });

  it("returns a protocol error response for unknown request types", async () => {
    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "unknown",
      requestId: "req-unknown",
      payload: {}
    });

    const response = findResponse(scope, "req-unknown");
    expect(response.ok).toBe(false);
    expect(response.error).toContain("Unbekannter Request-Typ");
  });

  it("sorts effort ascending/descending and keeps missing effort values at the end", async () => {
    const effortDoc = (id: string, effort: string | null) =>
      createDoc(id, {
        facets: {
          topGroupId: "APP",
          groupId: "APP.1",
          secLevel: "hoch",
          effortLevel: effort,
          class: null,
          tags: [],
          modalverbs: [],
          targetObjects: [],
          relationTypes: [],
          hasRelations: false
        }
      });

    fetchJsonWithValidationMock.mockResolvedValue({
      stats: {
        topGroupCount: 1,
        groupCount: 1,
        controlCount: 4,
        relationCount: 0,
        controlsWithRelations: 0
      },
      facetOptions: {
        topGroupId: ["APP"],
        secLevel: ["hoch"],
        effortLevel: ["1", "2"],
        class: [],
        modalverbs: [],
        targetObjects: [],
        tags: [],
        relationTypes: []
      },
      docs: [effortDoc("APP.1", "2"), effortDoc("APP.2", "1"), effortDoc("APP.3", ""), effortDoc("APP.4", null)]
    });

    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "init",
      requestId: "init-effort-sort",
      payload: {
        indexUrl: "/data/catalog-index.json",
        detailBasePath: "/data/details"
      }
    });

    await scope.dispatch({
      type: "search",
      requestId: "search-effort-asc",
      payload: {
        text: "",
        sort: "effort-asc",
        filters: defaultFilters(),
        limit: 20,
        offset: 0
      }
    });
    await scope.dispatch({
      type: "search",
      requestId: "search-effort-desc",
      payload: {
        text: "",
        sort: "effort-desc",
        filters: defaultFilters(),
        limit: 20,
        offset: 0
      }
    });

    const ascResponse = findResponse(scope, "search-effort-asc");
    const descResponse = findResponse(scope, "search-effort-desc");
    expect(ascResponse.ok).toBe(true);
    expect(descResponse.ok).toBe(true);

    expect((ascResponse.data as SearchResponse).items.map((item) => item.id)).toEqual(["APP.2", "APP.1", "APP.3", "APP.4"]);
    expect((descResponse.data as SearchResponse).items.map((item) => item.id)).toEqual(["APP.1", "APP.2", "APP.3", "APP.4"]);
  });

  it("applies filter combinations, computes facets on filtered results, and enforces offset/limit bounds", async () => {
    const app1 = createDoc("APP.1", {
      facets: {
        topGroupId: "APP",
        groupId: "APP.1",
        secLevel: "hoch",
        effortLevel: "1",
        class: null,
        tags: ["netzwerk"],
        modalverbs: ["SOLL"],
        targetObjects: ["SYS.1"],
        relationTypes: ["required"],
        hasRelations: true
      }
    });
    const app2 = createDoc("APP.2", {
      facets: {
        topGroupId: "APP",
        groupId: "APP.1",
        secLevel: "hoch",
        effortLevel: "2",
        class: null,
        tags: ["cloud"],
        modalverbs: ["MUSS"],
        targetObjects: ["SYS.2"],
        relationTypes: ["related"],
        hasRelations: true
      }
    });
    const ops1 = createDoc("OPS.1", {
      topGroupId: "OPS",
      facets: {
        topGroupId: "OPS",
        groupId: "OPS.1",
        secLevel: "normal",
        effortLevel: "3",
        class: null,
        tags: ["netzwerk"],
        modalverbs: ["SOLL"],
        targetObjects: ["SYS.3"],
        relationTypes: ["required"],
        hasRelations: true
      }
    });

    fetchJsonWithValidationMock.mockResolvedValue({
      stats: {
        topGroupCount: 2,
        groupCount: 2,
        controlCount: 3,
        relationCount: 3,
        controlsWithRelations: 3
      },
      facetOptions: {
        topGroupId: ["APP", "OPS"],
        secLevel: ["hoch", "normal"],
        effortLevel: ["1", "2", "3"],
        class: [],
        modalverbs: ["MUSS", "SOLL"],
        targetObjects: ["SYS.1", "SYS.2", "SYS.3"],
        tags: ["cloud", "netzwerk"],
        relationTypes: ["related", "required"]
      },
      docs: [app1, app2, ops1]
    });

    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "init",
      requestId: "init-filters",
      payload: {
        indexUrl: "/data/catalog-index.json",
        detailBasePath: "/data/details"
      }
    });

    const filtered = defaultFilters();
    filtered.topGroupId = ["APP"];
    await scope.dispatch({
      type: "search",
      requestId: "search-filters",
      payload: {
        text: "",
        sort: "id-asc",
        filters: filtered,
        limit: 1,
        offset: 1
      }
    });

    const response = findResponse(scope, "search-filters");
    expect(response.ok).toBe(true);
    expect(response.data).toMatchObject({
      total: 2
    });

    const payload = response.data as SearchResponse;
    expect(payload.items.map((item) => item.id)).toEqual(["APP.2"]);
    expect(payload.facets.topGroupId).toEqual([{ value: "APP", count: 2 }]);
    expect(payload.facets.tags).toEqual([
      { value: "cloud", count: 1 },
      { value: "netzwerk", count: 1 }
    ]);
    expect(payload.facets.relationTypes).toEqual([
      { value: "related", count: 1 },
      { value: "required", count: 1 }
    ]);
  });

  it("fails closed for missing required request payload fields", async () => {
    fetchJsonWithValidationMock.mockResolvedValue({
      stats: {
        topGroupCount: 1,
        groupCount: 1,
        controlCount: 1,
        relationCount: 0,
        controlsWithRelations: 0
      },
      facetOptions: {
        topGroupId: ["APP"],
        secLevel: [],
        effortLevel: [],
        class: [],
        modalverbs: [],
        targetObjects: [],
        tags: [],
        relationTypes: []
      },
      docs: [createDoc("APP.1")]
    });

    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "init",
      requestId: "init-missing-index-url",
      payload: {
        indexUrl: " ",
        detailBasePath: "/data/details"
      }
    });
    await scope.dispatch({
      type: "get-control",
      requestId: "get-control-missing-id",
      payload: {
        id: " ",
        topGroupId: "APP"
      }
    });
    await scope.dispatch({
      type: "get-neighborhood",
      requestId: "get-neighborhood-missing-id",
      payload: {
        id: " ",
        hops: 2
      }
    });

    expect(findResponse(scope, "init-missing-index-url")).toMatchObject({
      ok: false,
      error: "Index-URL fehlt."
    });
    expect(findResponse(scope, "get-control-missing-id")).toMatchObject({
      ok: false,
      error: "Control-ID fehlt."
    });
    expect(findResponse(scope, "get-neighborhood-missing-id")).toMatchObject({
      ok: false,
      error: "Control-ID fehlt."
    });
  });

  it("returns timeout errors when search exceeds security time budget", async () => {
    const docs = Array.from({ length: SECURITY_BUDGETS.searchCheckpointInterval + 1 }, (_, index) =>
      createDoc(`APP.${index + 1}`)
    );

    fetchJsonWithValidationMock.mockResolvedValue({
      stats: {
        topGroupCount: 1,
        groupCount: 1,
        controlCount: docs.length,
        relationCount: 0,
        controlsWithRelations: 0
      },
      facetOptions: {
        topGroupId: ["APP"],
        secLevel: [],
        effortLevel: [],
        class: [],
        modalverbs: [],
        targetObjects: [],
        tags: [],
        relationTypes: []
      },
      docs
    });

    let nowCallCount = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      nowCallCount += 1;
      if (nowCallCount === 1) {
        return 0;
      }
      return SECURITY_BUDGETS.searchTimeBudgetMs + 10;
    });

    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "init",
      requestId: "init-timeout-search",
      payload: {
        indexUrl: "/data/catalog-index.json",
        detailBasePath: "/data/details"
      }
    });
    await scope.dispatch({
      type: "search",
      requestId: "search-timeout",
      payload: {
        text: "",
        sort: "relevance",
        filters: defaultFilters(),
        limit: 1200,
        offset: 0
      }
    });

    const response = findResponse(scope, "search-timeout");
    expect(response.ok).toBe(false);
    expect(response.error).toContain("Suche hat das Zeitbudget");
  });

  it("returns an error for unresolved control IDs", async () => {
    fetchJsonWithValidationMock.mockImplementation(async ({ label, url }: { label: string; url: string }) => {
      if (label === "Indexdaten") {
        return {
          stats: {
            topGroupCount: 1,
            groupCount: 1,
            controlCount: 1,
            relationCount: 0,
            controlsWithRelations: 0
          },
          facetOptions: {
            topGroupId: ["APP"],
            secLevel: [],
            effortLevel: [],
            class: [],
            modalverbs: [],
            targetObjects: [],
            tags: [],
            relationTypes: []
          },
          docs: [createDoc("APP.1")]
        };
      }
      if (label === "Detail-Chunk fuer APP" && url.endsWith("/APP.json")) {
        return { controls: {} };
      }
      throw new Error(`Unerwartete Anfrage: ${label} (${url})`);
    });

    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "init",
      requestId: "init-for-control",
      payload: {
        indexUrl: "/data/catalog-index.json",
        detailBasePath: "/data/details"
      }
    });
    await scope.dispatch({
      type: "get-control",
      requestId: "control-missing",
      payload: {
        id: "APP.404",
        topGroupId: "APP"
      }
    });

    const response = findResponse(scope, "control-missing");
    expect(response.ok).toBe(false);
    expect(response.error).toContain("Control APP.404 wurde nicht gefunden.");
  });

  it("clamps neighborhood hops and returns graph payload with resolved relations", async () => {
    const app1 = createDoc("APP.1");
    const app2 = createDoc("APP.2");
    fetchJsonWithValidationMock.mockImplementation(async ({ label, url }: { label: string; url: string }) => {
      if (label === "Indexdaten") {
        return {
          stats: {
            topGroupCount: 1,
            groupCount: 1,
            controlCount: 2,
            relationCount: 1,
            controlsWithRelations: 2
          },
          facetOptions: {
            topGroupId: ["APP"],
            secLevel: [],
            effortLevel: [],
            class: [],
            modalverbs: [],
            targetObjects: [],
            tags: [],
            relationTypes: ["required"]
          },
          docs: [app1, app2]
        };
      }
      if (label === "Detail-Chunk fuer APP" && url.endsWith("/APP.json")) {
        return {
          controls: {
            "APP.1": createDetail("APP.1", "APP", {
              relationsOutgoing: [{ sourceControlId: "APP.1", targetControlId: "APP.2", relType: "required" }]
            }),
            "APP.2": createDetail("APP.2", "APP", {
              relationsIncoming: [{ sourceControlId: "APP.1", targetControlId: "APP.2", relType: "required" }]
            })
          }
        };
      }
      throw new Error(`Unerwartete Anfrage: ${label} (${url})`);
    });

    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "init",
      requestId: "init-for-graph",
      payload: {
        indexUrl: "/data/catalog-index.json",
        detailBasePath: "/data/details"
      }
    });
    await scope.dispatch({
      type: "get-neighborhood",
      requestId: "graph-1",
      payload: {
        id: "APP.1",
        hops: 99
      }
    });

    const response = findResponse(scope, "graph-1");
    expect(response.ok).toBe(true);
    expect(response.data).toMatchObject({
      focusId: "APP.1",
      hops: 1
    });
    expect((response.data as { nodes: Array<{ id: string }> }).nodes.map((node) => node.id)).toContain("APP.2");
    expect((response.data as { edges: Array<{ relType: string }> }).edges[0]?.relType).toBe("required");
  });

  it("fails search requests with a cancellation error after cancel message", async () => {
    const docs = Array.from({ length: 260 }, (_, index) => createDoc(`APP.${index + 1}`));
    fetchJsonWithValidationMock.mockResolvedValue({
      stats: {
        topGroupCount: 1,
        groupCount: 1,
        controlCount: docs.length,
        relationCount: 0,
        controlsWithRelations: 0
      },
      facetOptions: {
        topGroupId: ["APP"],
        secLevel: [],
        effortLevel: [],
        class: [],
        modalverbs: [],
        targetObjects: [],
        tags: [],
        relationTypes: []
      },
      docs
    });

    const scope = new MockWorkerScope();
    await loadWorker(scope);

    await scope.dispatch({
      type: "init",
      requestId: "init-cancel",
      payload: {
        indexUrl: "/data/catalog-index.json",
        detailBasePath: "/data/details"
      }
    });

    const searchPromise = scope.dispatch({
      type: "search",
      requestId: "search-cancel",
      payload: {
        text: "",
        sort: "relevance",
        filters: defaultFilters(),
        limit: 1200,
        offset: 0
      }
    });

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    await scope.dispatch({
      type: "cancel",
      requestId: "search-cancel"
    });
    await searchPromise;

    const response = findResponse(scope, "search-cancel");
    expect(response.ok).toBe(false);
    expect(response.error).toBe("Anfrage wurde abgebrochen.");
  });
});
