// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost/"}

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogMeta, ControlDetail, RelationGraphPayload, SearchResponse, SearchResultItem } from "./types";

const mocks = vi.hoisted(() => ({
  fetchJsonWithValidation: vi.fn(),
  downloadBlob: vi.fn(),
  toCsv: vi.fn(() => "id;title"),
  extractControlExportRow: vi.fn((detail: ControlDetail) => ({ id: detail.id })),
  searchClient: {
    init: vi.fn(),
    search: vi.fn(),
    getControl: vi.fn(),
    getNeighborhood: vi.fn(),
    destroy: vi.fn()
  }
}));

vi.mock("./hooks/useDebouncedValue", () => ({
  useDebouncedValue: (value: unknown) => value
}));

vi.mock("./hooks/useMediaQuery", () => ({
  useMediaQuery: (query: string) => {
    if (query.includes("1280")) {
      return true;
    }
    if (query.includes("768")) {
      return true;
    }
    return false;
  }
}));

vi.mock("./lib/fetchJsonSafe", () => ({
  fetchJsonWithValidation: (...args: unknown[]) =>
    (mocks.fetchJsonWithValidation as (...input: unknown[]) => unknown)(...args)
}));

vi.mock("./lib/csv", () => ({
  toCsv: (...args: unknown[]) => (mocks.toCsv as (...input: unknown[]) => unknown)(...args),
  downloadBlob: (...args: unknown[]) => (mocks.downloadBlob as (...input: unknown[]) => unknown)(...args)
}));

vi.mock("./lib/controlExport", () => ({
  CONTROL_EXPORT_COLUMNS: [{ key: "id", label: "ID" }],
  extractControlExportRow: (...args: unknown[]) =>
    (mocks.extractControlExportRow as (...input: unknown[]) => unknown)(...args)
}));

vi.mock("./lib/searchClient", () => {
  class SearchClient {
    init(...args: unknown[]) {
      return mocks.searchClient.init(...args);
    }

    search(...args: unknown[]) {
      return mocks.searchClient.search(...args);
    }

    getControl(...args: unknown[]) {
      return mocks.searchClient.getControl(...args);
    }

    getNeighborhood(...args: unknown[]) {
      return mocks.searchClient.getNeighborhood(...args);
    }

    destroy(...args: unknown[]) {
      return mocks.searchClient.destroy(...args);
    }
  }

  return { SearchClient };
});

vi.mock("./components/AppHeader", () => ({
  AppHeader: (props: any) => (
    <div data-testid="app-header">
      <button type="button" data-testid="header-export" onClick={props.onExportCsv}>
        export
      </button>
      <button type="button" data-testid="header-home" onClick={props.onGoHome}>
        home
      </button>
      <span data-testid="header-selected-count">{String(props.selectedControlCount)}</span>
    </div>
  )
}));

vi.mock("./components/GroupOverview", () => ({
  GroupOverview: (props: any) => (
    <section data-testid="group-overview">
      <button type="button" data-testid="home-select-all" onClick={props.onSelectAllControls}>
        home-select-all
      </button>
      <button type="button" data-testid="home-search" onClick={props.onStartSearch}>
        home-search
      </button>
    </section>
  )
}));

vi.mock("./components/ResultList", () => ({
  ResultList: (props: any) => {
    const firstItem = props.items[0] as SearchResultItem | undefined;
    return (
      <section data-testid="result-list" data-selected-id={props.selectedId ?? ""}>
        <div data-search-results-focus={props.error ? "status" : "results"} tabIndex={-1}>
          focus-target
        </div>
        <div data-testid="result-list-query">{props.query}</div>
        <div data-testid="result-list-error">{props.error ?? ""}</div>
        <div data-testid="result-list-count">{String(props.total)}</div>
        <button
          type="button"
          data-testid="result-select-first"
          disabled={!firstItem}
          onClick={() => {
            if (firstItem) {
              props.onSelect(firstItem);
            }
          }}
        >
          select-first
        </button>
        <button
          type="button"
          data-testid="result-toggle-first"
          disabled={!firstItem}
          onClick={() => {
            if (firstItem) {
              props.onToggleSelection(firstItem, !props.selectedControlIds.has(firstItem.id));
            }
          }}
        >
          toggle-first
        </button>
        <button type="button" data-testid="result-select-all" onClick={props.onSelectAllControls}>
          select-all
        </button>
        <button type="button" data-testid="result-reset" onClick={props.onResetFilters}>
          reset
        </button>
      </section>
    );
  }
}));

vi.mock("./components/ControlDetailPanel", () => ({
  ControlDetailPanel: (props: any) => (
    <section data-testid="control-detail-panel">
      <div data-testid="detail-id">{props.detail?.id ?? ""}</div>
      <div data-testid="detail-error">{props.error ?? ""}</div>
      {props.onBackToResults ? (
        <button type="button" data-testid="back-to-results" onClick={props.onBackToResults}>
          back
        </button>
      ) : null}
    </section>
  )
}));

vi.mock("./components/GroupPage", () => ({
  GroupPage: (props: any) => (
    <section data-testid="group-page">
      <div data-testid="group-page-loading">{String(Boolean(props.loading))}</div>
      <div data-testid="group-page-controls">{String(props.controls?.length ?? 0)}</div>
    </section>
  )
}));

vi.mock("./components/SearchOverlay", () => ({
  SearchOverlay: (_props: any) => null
}));

vi.mock("./components/FacetPanel", () => ({
  FacetPanel: (_props: any) => null
}));

vi.mock("./components/FilterSheet", () => ({
  FilterSheet: (_props: any) => null
}));

vi.mock("./components/SourcePanel", () => ({
  SourcePanel: () => <section data-testid="source-page">source</section>
}));

vi.mock("./components/AboutPage", () => ({
  AboutPage: () => <section data-testid="about-page">about</section>
}));

vi.mock("./components/ImpressumPage", () => ({
  ImpressumPage: () => <section data-testid="impressum-page">impressum</section>
}));

vi.mock("./components/DatenschutzPage", () => ({
  DatenschutzPage: () => <section data-testid="datenschutz-page">datenschutz</section>
}));

vi.mock("./components/AppFooter", () => ({
  AppFooter: () => <footer data-testid="app-footer">footer</footer>
}));

vi.mock("./components/StatusToast", () => ({
  StatusToast: (props: any) => <div data-testid="status-toast">{props.message ?? ""}</div>
}));

import App from "./App";

function createMeta(controlCount = 1): CatalogMeta {
  return {
    catalogId: "catalog-1",
    title: "Testkatalog",
    version: "2026.03",
    lastModified: "2026-03-09",
    oscalVersion: "1.1.2",
    remarks: null,
    props: [],
    publisher: {
      name: "BSI",
      type: null,
      email: null,
      uuid: null
    },
    sourceReferences: [],
    stats: {
      topGroupCount: 1,
      groupCount: 1,
      controlCount,
      relationCount: 0,
      controlsWithRelations: 0
    },
    groups: [
      {
        id: "APP.1",
        title: "Applikationen",
        altIdentifier: null,
        label: null,
        parentGroupId: "APP",
        topGroupId: "APP",
        pathIds: ["APP", "APP.1"],
        pathTitles: ["APP", "APP.1"],
        depth: 2
      }
    ],
    groupTree: [],
    buildInfo: {
      buildTimestamp: "2026-03-09T00:00:00.000Z",
      appVersion: "0.1.0",
      indexVersion: "v1",
      catalogFileName: "Grundschutz++-catalog.json",
      catalogFileSha256: "abc",
      catalogFileSizeBytes: 123
    }
  };
}

function createSearchItem(id: string, topGroupId = "APP"): SearchResultItem {
  return {
    id,
    title: `Control ${id}`,
    score: 1,
    topGroupId,
    groupId: `${topGroupId}.1`,
    class: null,
    secLevel: "hoch",
    effortLevel: "2",
    modalverbs: ["SOLL"],
    targetObjects: ["SYS.1"],
    tags: ["netzwerk"],
    snippet: "snippet",
    breadcrumbs: [topGroupId, `${topGroupId}.1`]
  };
}

function createSearchResponse(items: SearchResultItem[]): SearchResponse {
  return {
    total: items.length,
    items,
    facets: {
      topGroupId: items.length ? [{ value: items[0].topGroupId, count: items.length }] : [],
      secLevel: [],
      effortLevel: [],
      class: [],
      modalverbs: [],
      targetObjects: [],
      tags: [],
      relationTypes: []
    },
    elapsedMs: 5
  };
}

function createControlDetail(id: string, topGroupId = "APP"): ControlDetail {
  return {
    id,
    title: `Control ${id}`,
    class: null,
    topGroupId,
    parentGroupId: `${topGroupId}.1`,
    parentControlId: null,
    controlDepth: 1,
    groupPathIds: [topGroupId],
    groupPathTitles: [topGroupId],
    controlPathIds: [id],
    controlPathTitles: [id],
    pathIds: [topGroupId, id],
    breadcrumbs: [topGroupId, id],
    statementText: "Statement",
    guidanceText: "Guidance",
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
    relationsIncoming: []
  };
}

function createGraphPayload(focusId = "APP.1"): RelationGraphPayload {
  return {
    focusId,
    hops: 1,
    nodes: [{ id: focusId, title: focusId, topGroupId: "APP", depth: 0 }],
    edges: []
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setHash(hash: string) {
  const next = hash.startsWith("#") ? hash : `#${hash}`;
  window.location.hash = next;
}

async function mountApp() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<App />);
  });
}

async function unmountApp() {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
    root = null;
  }
  if (container?.isConnected) {
    container.remove();
  }
  container = null;
}

async function waitFor(check: () => boolean, timeoutMs = 4000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (check()) {
      return;
    }
    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  }
  throw new Error("waitFor timeout");
}

async function clickByTestId(testId: string) {
  const target = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!target) {
    throw new Error(`Element ${testId} wurde nicht gefunden.`);
  }
  await act(async () => {
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function textByTestId(testId: string) {
  return document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.textContent ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  Reflect.set(globalThis as Record<string, unknown>, "IS_REACT_ACT_ENVIRONMENT", true);
  setHash("#/");
  document.body.innerHTML = "";

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  });

  if (!window.requestAnimationFrame) {
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0)
    });
  }

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
  });

  mocks.fetchJsonWithValidation.mockResolvedValue(createMeta());
  mocks.searchClient.init.mockResolvedValue({
    facetOptions: {
      effortLevel: ["1", "2"]
    }
  });
  mocks.searchClient.search.mockResolvedValue(createSearchResponse([]));
  mocks.searchClient.getControl.mockResolvedValue(createControlDetail("APP.1"));
  mocks.searchClient.getNeighborhood.mockResolvedValue(createGraphPayload("APP.1"));
});

afterEach(async () => {
  await unmountApp();
  vi.restoreAllMocks();
});

describe("App orchestration", () => {
  it("zeigt Boot-Ladezustand und fällt bei ungueltiger Gruppe auf Home zurueck", async () => {
    setHash("#/group/");

    const initDeferred = deferred<{ facetOptions: { effortLevel: string[] } }>();
    const metaDeferred = deferred<CatalogMeta>();
    mocks.searchClient.init.mockReturnValueOnce(initDeferred.promise);
    mocks.fetchJsonWithValidation.mockReturnValueOnce(metaDeferred.promise);

    await mountApp();

    expect(document.body.textContent).toContain("Index wird aufgebaut und geladen");

    initDeferred.resolve({ facetOptions: { effortLevel: ["1"] } });
    metaDeferred.resolve(createMeta());

    await waitFor(() => Boolean(document.querySelector('[data-testid="group-overview"]')));

    expect(document.querySelector('[data-testid="group-overview"]')).not.toBeNull();
    expect(window.location.hash).toBe("#/group/");
  });

  it("rendert Legal-Routen auch während laufendem Boot-Prozess", async () => {
    const initDeferred = deferred<{ facetOptions: { effortLevel: string[] } }>();
    const metaDeferred = deferred<CatalogMeta>();
    mocks.searchClient.init.mockReturnValueOnce(initDeferred.promise);
    mocks.fetchJsonWithValidation.mockReturnValueOnce(metaDeferred.promise);

    setHash("#/about/license");
    await mountApp();

    await waitFor(() => Boolean(document.querySelector('[data-testid="source-page"]')));
    expect(document.body.textContent?.includes("Index wird aufgebaut und geladen")).toBe(false);

    await act(async () => {
      initDeferred.resolve({ facetOptions: { effortLevel: ["1"] } });
      metaDeferred.resolve(createMeta());
      await Promise.resolve();
    });
  });

  it("lädt Gruppen-Controls aus der Group-Route mit erwarteten Filtern", async () => {
    const groupItems = [createSearchItem("APP.1"), createSearchItem("APP.2")];
    mocks.searchClient.search.mockResolvedValueOnce(createSearchResponse(groupItems));

    setHash("#/group/APP.1");
    await mountApp();

    await waitFor(() => mocks.searchClient.search.mock.calls.length > 0);
    expect(textByTestId("group-page-loading")).toBe("false");
    expect(mocks.searchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "",
        sort: "id-asc",
        limit: 1200,
        offset: 0,
        filters: expect.objectContaining({
          topGroupId: ["APP"],
          groupId: ["APP.1"]
        })
      })
    );
  });

  it("bleibt stabil bei fehlgeschlagener Gruppenladung", async () => {
    mocks.searchClient.search.mockRejectedValueOnce(new Error("Gruppenladen fehlgeschlagen"));

    setHash("#/group/APP.1");
    await mountApp();

    await waitFor(() => textByTestId("group-page-loading") === "false");
    expect(textByTestId("group-page-controls")).toBe("0");
  });

  it("lädt Suchroute mit Control-Detail und navigiert per Back-to-results ohne Control-Parameter", async () => {
    const searchItems = [createSearchItem("APP.1")];
    mocks.searchClient.search.mockResolvedValue(createSearchResponse(searchItems));
    mocks.searchClient.getControl.mockResolvedValue(createControlDetail("APP.1", "APP"));

    setHash("#/search?q=alpha&control=APP.1&top=APP");
    await mountApp();

    await waitFor(() => textByTestId("detail-id") === "APP.1");
    expect(textByTestId("result-list-query")).toBe("alpha");
    expect(textByTestId("result-list-count")).toBe("1");

    await clickByTestId("back-to-results");

    await waitFor(() => !window.location.hash.includes("control="));
    expect(window.location.hash).toContain("#/search?q=alpha");
    expect(window.location.hash.includes("top=")).toBe(false);
  });

  it("exportiert CSV erfolgreich aus ausgewählten Controls", async () => {
    const searchItems = [createSearchItem("APP.1")];
    mocks.searchClient.search.mockResolvedValue(createSearchResponse(searchItems));
    mocks.searchClient.getControl.mockResolvedValue(createControlDetail("APP.1", "APP"));

    setHash("#/search?q=alpha");
    await mountApp();

    await waitFor(() => textByTestId("result-list-count") === "1");

    await clickByTestId("result-toggle-first");
    expect(textByTestId("header-selected-count")).toBe("1");

    await clickByTestId("header-export");

    await waitFor(() => mocks.downloadBlob.mock.calls.length > 0);

    const [filename, blob] = mocks.downloadBlob.mock.calls[0] as [string, Blob];
    expect(filename).toMatch(/^grundschutz-controls_\d{4}-\d{2}-\d{2}_1\.csv$/);
    expect(blob).toBeInstanceOf(Blob);
    expect(mocks.toCsv).toHaveBeenCalledTimes(1);
    expect(textByTestId("status-toast")).toContain("CSV erfolgreich exportiert");
  });

  it("zeigt Suchfehler im Ergebniszustand, wenn der Worker-Request fehlschlägt", async () => {
    setHash("#/");
    await mountApp();

    await waitFor(() => Boolean(document.querySelector('[data-testid="group-overview"]')));
    mocks.searchClient.search.mockRejectedValueOnce(new Error("Worker ist nicht erreichbar."));

    await clickByTestId("home-search");
    await waitFor(() => textByTestId("result-list-error") === "Worker ist nicht erreichbar.");
  });

  it("zeigt CSV-Exportfehler, wenn Detaildaten nicht geladen werden können", async () => {
    const searchItems = [createSearchItem("APP.1")];
    mocks.searchClient.search.mockResolvedValue(createSearchResponse(searchItems));
    mocks.searchClient.getControl.mockRejectedValueOnce(new Error("Detailfehler"));

    setHash("#/search?q=alpha");
    await mountApp();

    await waitFor(() => textByTestId("result-list-count") === "1");
    await clickByTestId("result-toggle-first");
    await clickByTestId("header-export");

    await waitFor(() => textByTestId("status-toast").includes("CSV-Export fehlgeschlagen"));
    expect(textByTestId("status-toast")).toContain("CSV-Export fehlgeschlagen");
  });

  it("zeigt Initialisierungsfehler wenn Boot-Sequenz fehlschlägt", async () => {
    mocks.searchClient.init.mockRejectedValueOnce(new Error("Index konnte nicht geladen werden."));

    await mountApp();

    await waitFor(() => document.body.textContent?.includes("Initialisierung fehlgeschlagen") ?? false);

    expect(document.body.textContent).toContain("Index konnte nicht geladen werden.");
    const details = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Fehlerdetails"]');
    expect(details?.value).toContain("Index konnte nicht geladen werden.");
  });

  it("kann nach einem Boot-Fehler per Neu-Mount wieder erfolgreich initialisieren", async () => {
    mocks.searchClient.init.mockRejectedValueOnce(new Error("Index konnte nicht geladen werden."));

    await mountApp();
    await waitFor(() => document.body.textContent?.includes("Initialisierung fehlgeschlagen") ?? false);

    await unmountApp();

    mocks.searchClient.init.mockResolvedValueOnce({
      facetOptions: {
        effortLevel: ["1", "2"]
      }
    });
    mocks.fetchJsonWithValidation.mockResolvedValueOnce(createMeta());

    setHash("#/");
    await mountApp();

    await waitFor(() => Boolean(document.querySelector('[data-testid="group-overview"]')));
    expect(document.querySelector('[data-testid="group-overview"]')).not.toBeNull();
  });
});
