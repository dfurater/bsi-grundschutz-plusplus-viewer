import { useEffect, useMemo, useRef, useState } from "react";
import { AppDrawer } from "./components/AppDrawer";
import { AppHeader } from "./components/AppHeader";
import { ControlDetailPanel } from "./components/ControlDetailPanel";
import { FacetPanel, type ActiveFilters } from "./components/FacetPanel";
import { FilterSheet } from "./components/FilterSheet";
import { GroupOverview } from "./components/GroupOverview";
import { GroupPage } from "./components/GroupPage";
import { OverflowMenu } from "./components/OverflowMenu";
import { ResultList } from "./components/ResultList";
import { SearchOverlay } from "./components/SearchOverlay";
import { SourcePanel } from "./components/SourcePanel";
import { StatusToast } from "./components/StatusToast";
import { AboutPage } from "./components/AboutPage";
import { ImpressumPage } from "./components/ImpressumPage";
import { DatenschutzPage } from "./components/DatenschutzPage";
import { AppFooter } from "./components/AppFooter";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { CONTROL_EXPORT_COLUMNS, extractControlExportRow } from "./lib/controlExport";
import { downloadBlob, toCsv } from "./lib/csv";
import { CatalogMetaSchema, CatalogRegistrySchema, ProfileAnalysisSchema } from "./lib/dataSchemas";
import { fetchJsonWithValidation } from "./lib/fetchJsonSafe";
import { SearchClient } from "./lib/searchClient";
import {
  buildControlHash,
  buildGroupHash,
  buildSearchHash,
  defaultFilters,
  parseHash,
  type AppRoute
} from "./lib/routing";
import { sanitizeSearchText } from "./lib/searchSafety";
import { SECURITY_BUDGETS } from "./lib/securityBudgets";
import type {
  CatalogMeta,
  CatalogRegistry,
  ControlDetail,
  DatasetDescriptor,
  ProfileAnalysis,
  RelationGraphPayload,
  SearchQuery,
  SearchResponse,
  SearchResultItem
} from "./types";
import { validateOrThrow } from "./lib/validation";

const DEFAULT_SEARCH_RESPONSE: SearchResponse = {
  total: 0,
  items: [],
  facets: {
    topGroupId: [],
    secLevel: [],
    effortLevel: [],
    class: [],
    modalverbs: [],
    targetObjects: [],
    tags: [],
    relationTypes: []
  },
  elapsedMs: 0
};

type SortBase = "relevance" | "id" | "title" | "effort";
const BACK_TO_RESULTS_TTL_MS = 30 * 60 * 1000;

function getSortBase(sort: SearchQuery["sort"]): SortBase {
  if (sort.startsWith("id-")) {
    return "id";
  }
  if (sort.startsWith("title-")) {
    return "title";
  }
  if (sort.startsWith("effort-")) {
    return "effort";
  }
  return "relevance";
}

function getSortDirection(sort: SearchQuery["sort"]): "asc" | "desc" {
  return sort.endsWith("-desc") ? "desc" : "asc";
}

function toSortValue(base: SortBase, direction: "asc" | "desc"): SearchQuery["sort"] {
  if (base === "id") {
    return direction === "asc" ? "id-asc" : "id-desc";
  }
  if (base === "title") {
    return direction === "asc" ? "title-asc" : "title-desc";
  }
  if (base === "effort") {
    return direction === "asc" ? "effort-asc" : "effort-desc";
  }
  return "relevance";
}

async function computeSha256(text: string) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}

function mapRouteFilters(filters: ActiveFilters): SearchQuery["filters"] {
  return {
    topGroupId: [...filters.topGroupId],
    groupId: [...filters.groupId],
    secLevel: [...filters.secLevel],
    effortLevel: [...filters.effortLevel],
    class: [...filters.class],
    modalverbs: [...filters.modalverbs],
    targetObjects: [...filters.targetObjects],
    tags: [...filters.tags],
    relationTypes: [...filters.relationTypes]
  };
}

function navigate(hash: string) {
  if (window.location.hash === hash.replace(/^#/, "#")) {
    return;
  }
  window.location.hash = hash;
}

function assetUrl(relativePath: string) {
  const hrefWithoutHash = window.location.href.split("#")[0];
  return new URL(relativePath, hrefWithoutHash).toString();
}

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  try {
    const stored = window.localStorage.getItem("gspp-theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // Ignore storage errors and fall back to system preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getDatasetPaths(datasetId: string | null, withRegistry: boolean) {
  if (withRegistry && datasetId) {
    const base = `./data/datasets/${encodeURIComponent(datasetId)}`;
    return {
      metaUrl: assetUrl(`${base}/catalog-meta.json`),
      indexUrl: assetUrl(`${base}/catalog-index.json`),
      detailsUrl: assetUrl(`${base}/details`)
    };
  }

  return {
    metaUrl: assetUrl("./data/catalog-meta.json"),
    indexUrl: assetUrl("./data/catalog-index.json"),
    detailsUrl: assetUrl("./data/details")
  };
}

export default function App() {
  const client = useMemo(() => new SearchClient(), []);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isWideDesktop = useMediaQuery("(min-width: 1280px)");
  const [route, setRoute] = useState<AppRoute>(() => parseHash(window.location.hash));
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [registry, setRegistry] = useState<CatalogRegistry | null>(null);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("anwender");
  const [bootState, setBootState] = useState<"loading" | "ready" | "error">("loading");
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootErrorDetails, setBootErrorDetails] = useState<string | null>(null);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatusText, setBootStatusText] = useState("Index wird aufgebaut und geladen…");

  const [searchText, setSearchText] = useState("");
  const [searchInputDirty, setSearchInputDirty] = useState(false);
  const [sort, setSort] = useState<SearchQuery["sort"]>("relevance");
  const [effortSortEnabled, setEffortSortEnabled] = useState(true);
  const [filters, setFilters] = useState<ActiveFilters>(defaultFilters());

  const [searchResponse, setSearchResponse] = useState<SearchResponse>(DEFAULT_SEARCH_RESPONSE);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [detail, setDetail] = useState<ControlDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<RelationGraphPayload | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [graphHops, setGraphHops] = useState<1 | 2>(1);
  const [graphFilter, setGraphFilter] = useState<"all" | "required" | "related">("all");

  const [groupControls, setGroupControls] = useState<SearchResultItem[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [selectedControlTopGroups, setSelectedControlTopGroups] = useState<Record<string, string>>({});
  const [exportCsvMessage, setExportCsvMessage] = useState<string | null>(null);
  const [exportCsvRunning, setExportCsvRunning] = useState(false);
  const [selectAllRunningScope, setSelectAllRunningScope] = useState<"home" | "group" | "search" | null>(null);

  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [headerShrunk, setHeaderShrunk] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"info" | "success" | "error">("info");
  const [importBusy, setImportBusy] = useState(false);

  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const requestCounter = useRef(0);
  const graphRequestCounter = useRef(0);
  const lastSearchStateRef = useRef<{
    query: string;
    sort: SearchQuery["sort"];
    filters: ActiveFilters;
    timestamp: number;
  } | null>(null);

  function replaceHash(hash: string) {
    const normalized = hash.replace(/^#/, "#");
    if (window.location.hash === normalized) {
      return;
    }
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${normalized}`);
    setRoute(parseHash(window.location.hash));
  }

  async function initializeDataset(datasetId: string, registryOverride: CatalogRegistry | null) {
    const withRegistry = Boolean(registryOverride?.datasets?.length);
    const paths = getDatasetPaths(datasetId, withRegistry);

    setBootState("loading");
    setBootError(null);
    setBootErrorDetails(null);
    setBootProgress(8);
    setBootStatusText("Datensatz wird vorbereitet…");

    const initPromise = client.init(paths.indexUrl, paths.detailsUrl);
    setBootProgress(24);
    setBootStatusText("Suchindex wird geladen…");

    const metaPromise = fetchJsonWithValidation({
      url: paths.metaUrl,
      label: "Datensatz-Metadaten",
      schema: CatalogMetaSchema,
      maxBytes: SECURITY_BUDGETS.maxRemoteJsonBytes.catalogMeta
    });

    setBootProgress(52);
    setBootStatusText("Metadaten werden gelesen…");

    const [initPayload, metaPayload] = (await Promise.all([initPromise, metaPromise])) as [
      { facetOptions: { effortLevel?: unknown[] } },
      CatalogMeta
    ];
    setBootProgress(76);
    setBootStatusText("Suche wird initialisiert…");
    setBootProgress(92);
    setBootStatusText("Oberfläche wird aufgebaut…");
    setMeta(metaPayload);
    setEffortSortEnabled(Array.isArray(initPayload?.facetOptions?.effortLevel) && initPayload.facetOptions.effortLevel.length > 0);
    setSelectedDatasetId(datasetId);
    setSearchResponse(DEFAULT_SEARCH_RESPONSE);
    setSearchError(null);
    setDetail(null);
    setDetailError(null);
    setGraphData(null);
    setGraphError(null);
    setGroupControls([]);
    setSelectedControlTopGroups({});
    setExportCsvMessage(null);
    setSelectAllRunningScope(null);
    setBootProgress(100);
    setBootStatusText("Fertig");
    setBootState("ready");
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("gspp-theme", theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  useEffect(() => {
    let scheduled = false;
    function onScroll() {
      if (scheduled) {
        return;
      }
      scheduled = true;
      window.requestAnimationFrame(() => {
        /* REQ: PD-07, RESP-02, PERF-03 */
        setHeaderShrunk(window.scrollY > 24);
        scheduled = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [toastMessage]);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash(window.location.hash));
      setOverflowOpen(false);
      setFilterSheetOpen(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setBootState("loading");
        setBootError(null);
        setBootErrorDetails(null);
        setBootProgress(4);
        setBootStatusText("Katalogverzeichnis wird geladen…");
        const [registryPayload, profilePayload] = (await Promise.all([
          fetchJsonWithValidation({
            url: assetUrl("./data/catalog-registry.json"),
            label: "Katalog-Registry",
            schema: CatalogRegistrySchema,
            maxBytes: SECURITY_BUDGETS.maxRemoteJsonBytes.catalogRegistry
          }),
          fetchJsonWithValidation({
            url: assetUrl("./data/profile-links.json"),
            label: "Profilanalyse",
            schema: ProfileAnalysisSchema,
            maxBytes: SECURITY_BUDGETS.maxRemoteJsonBytes.profileLinks
          })
        ])) as [CatalogRegistry, ProfileAnalysis];
        setBootProgress(16);
        setBootStatusText("Datensatzbeziehungen werden geprüft…");

        if (!cancelled) {
          setProfileAnalysis(profilePayload);
        }

        if (cancelled) {
          return;
        }

        if (registryPayload?.datasets?.length) {
          setRegistry(registryPayload);
          const hasDefault = registryPayload.datasets.some((dataset) => dataset.id === registryPayload.defaultDatasetId);
          const initialId = hasDefault ? registryPayload.defaultDatasetId : registryPayload.datasets[0].id;
          await initializeDataset(initialId, registryPayload);
          return;
        }

        await initializeDataset("legacy", null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setBootState("error");
        setBootError(getErrorMessage(error, "Initialisierung fehlgeschlagen."));
        setBootErrorDetails(getErrorDetails(error));
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (route.view !== "search") {
      return;
    }

    lastSearchStateRef.current = {
      query: route.query,
      sort: route.sort,
      filters: mapRouteFilters(route.filters),
      timestamp: Date.now()
    };
    setSearchText(route.query);
    setSearchInputDirty(false);
    setSort(route.sort);
    setFilters(route.filters);
  }, [route]);

  useEffect(() => {
    if (bootState !== "ready") {
      return;
    }
    if (!searchInputDirty) {
      return;
    }

    /* REQ: Clarification Pack §5 (Debounce immer aktiv, Enter bypass) */
    const safeQuery = sanitizeSearchText(debouncedSearchText);

    if (route.view === "search") {
      if (route.query === safeQuery && !route.controlId) {
        return;
      }
      replaceHash(buildSearchHash(safeQuery, sort, filters, null, null));
      return;
    }

    if (!safeQuery) {
      return;
    }

    navigate(buildSearchHash(safeQuery, sort, filters, null, null));
  }, [
    bootState,
    debouncedSearchText,
    filters,
    route.view,
    searchInputDirty,
    sort,
    route.view === "search" ? route.query : "",
    route.view === "search" ? route.controlId : null
  ]);

  useEffect(() => {
    if (effortSortEnabled) {
      return;
    }
    if (getSortBase(sort) !== "effort") {
      return;
    }

    const fallbackSort: SearchQuery["sort"] = "relevance";
    setSort(fallbackSort);

    if (route.view === "search") {
      navigate(buildSearchHash(searchText, fallbackSort, filters, route.controlId, route.controlTopGroupId));
    } else {
      navigate(buildSearchHash(searchText, fallbackSort, filters, null, null));
    }
  }, [
    effortSortEnabled,
    filters,
    route.view,
    searchText,
    sort,
    route.view === "search" ? route.controlId : null,
    route.view === "search" ? route.controlTopGroupId : null
  ]);

  async function resolveTopGroupId(controlId: string): Promise<string | null> {
    const response = await client.search({
      text: controlId,
      sort: "relevance",
      filters: defaultFilters(),
      limit: 8,
      offset: 0
    });

    const exact = response.items.find((item) => item.id.toLowerCase() === controlId.toLowerCase());
    return exact?.topGroupId ?? response.items[0]?.topGroupId ?? null;
  }

  async function loadControl(controlId: string, topGroupId: string | null) {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const resolvedTopGroupId = topGroupId ?? (await resolveTopGroupId(controlId));
      if (!resolvedTopGroupId) {
        throw new Error(`Top-Gruppe für ${controlId} konnte nicht bestimmt werden.`);
      }

      const payload = await client.getControl(controlId, resolvedTopGroupId);
      setDetail(payload);
      setGraphError(null);
    } catch (error) {
      setDetail(null);
      setDetailError(error instanceof Error ? error.message : "Control konnte nicht geladen werden.");
      setGraphData(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadGraph(controlId: string, hops: 1 | 2) {
    const current = ++graphRequestCounter.current;
    setGraphLoading(true);
    setGraphError(null);

    try {
      const payload = await client.getNeighborhood(controlId, hops);
      if (current !== graphRequestCounter.current) {
        return;
      }
      setGraphData(payload);
    } catch (error) {
      if (current !== graphRequestCounter.current) {
        return;
      }
      setGraphData(null);
      setGraphError(error instanceof Error ? error.message : "Graph konnte nicht geladen werden.");
    } finally {
      if (current === graphRequestCounter.current) {
        setGraphLoading(false);
      }
    }
  }

  useEffect(() => {
    if (bootState !== "ready") {
      return;
    }

    if (route.view !== "search") {
      if (route.view !== "control") {
        setDetail(null);
        setGraphData(null);
      }
      return;
    }

    const current = ++requestCounter.current;
    setSearchLoading(true);
    setSearchError(null);

    client
      .search({
        text: sanitizeSearchText(route.query),
        sort: route.sort,
        filters: mapRouteFilters(route.filters),
        limit: 400,
        offset: 0
      })
      .then((response) => {
        if (current !== requestCounter.current) {
          return;
        }

        setSearchResponse(response);

        if (route.controlId) {
          return loadControl(route.controlId, route.controlTopGroupId);
        }

        setDetail(null);
        setGraphData(null);
      })
      .catch((error) => {
        if (current !== requestCounter.current) {
          return;
        }
        setSearchResponse(DEFAULT_SEARCH_RESPONSE);
        setSearchError(error instanceof Error ? error.message : "Suche fehlgeschlagen.");
      })
      .finally(() => {
        if (current === requestCounter.current) {
          setSearchLoading(false);
        }
      });
  }, [bootState, client, route]);

  useEffect(() => {
    if (bootState !== "ready" || route.view !== "group" || !meta) {
      return;
    }

    const group = meta.groups.find((item) => item.id === route.groupId);
    if (!group) {
      setGroupControls([]);
      return;
    }

    const queryFilters = defaultFilters();
    queryFilters.topGroupId = [group.topGroupId];
    if (group.depth > 1) {
      queryFilters.groupId = [group.id];
    }

    setGroupLoading(true);
    client
      .search({
        text: "",
        sort: "id-asc",
        filters: queryFilters,
        limit: 1200,
        offset: 0
      })
      .then((response) => {
        setGroupControls(response.items);
      })
      .catch(() => {
        setGroupControls([]);
      })
      .finally(() => {
        setGroupLoading(false);
      });
  }, [bootState, client, route, meta]);

  useEffect(() => {
    if (bootState !== "ready" || route.view !== "control") {
      return;
    }
    loadControl(route.controlId, route.topGroupId);
  }, [bootState, route]);

  useEffect(() => {
    if (!detail) {
      setGraphData(null);
      return;
    }
    loadGraph(detail.id, graphHops);
  }, [detail?.id, graphHops]);

  async function handleUpload(file: File) {
    setImportBusy(true);
    try {
      if (file.size > SECURITY_BUDGETS.maxUploadFileSizeBytes) {
        throw new Error(
          `Datei zu gross (${file.size} Bytes). Maximal erlaubt: ${SECURITY_BUDGETS.maxUploadFileSizeBytes} Bytes.`
        );
      }

      setBootState("loading");
      setBootError(null);
      setBootErrorDetails(null);
      setBootProgress(10);
      setBootStatusText("Lokale Datei wird gelesen…");
      const rawText = await file.text();
      setBootProgress(32);
      setBootStatusText("Datei wird validiert…");
      const hash = await computeSha256(rawText);
      const uploadPayload = await client.loadUpload(rawText);
      setBootProgress(76);
      setBootStatusText("Lokaler Datensatz wird integriert…");

      const currentBuildInfo = meta?.buildInfo;
      const nextMeta = validateOrThrow(
        {
          ...(meta as CatalogMeta),
          ...(uploadPayload.meta as CatalogMeta),
          buildInfo: {
            buildTimestamp: new Date().toISOString(),
            appVersion: currentBuildInfo?.appVersion ?? "0.1.0",
            indexVersion: currentBuildInfo?.indexVersion ?? "2",
            catalogFileName: file.name,
            catalogFileSha256: hash,
            catalogFileSizeBytes: file.size
          }
        },
        CatalogMetaSchema,
        "Upload-Metadaten"
      ) as CatalogMeta;

      setMeta(nextMeta);
      setBootProgress(100);
      setBootStatusText("Fertig");
      setBootState("ready");
      setGraphData(null);
      setSelectedControlTopGroups({});
      setExportCsvMessage(null);
      setSelectAllRunningScope(null);
      navigate(buildSearchHash("", "relevance", defaultFilters()));
      setToastTone("success");
      setToastMessage("JSON erfolgreich geladen.");
    } catch (error) {
      setBootState("error");
      setBootError(getErrorMessage(error, "Upload konnte nicht verarbeitet werden."));
      setBootErrorDetails(getErrorDetails(error));
      setToastTone("error");
      setToastMessage("JSON-Import fehlgeschlagen.");
    } finally {
      setImportBusy(false);
    }
  }

  async function handleDatasetChange(datasetId: string) {
    if (datasetId === selectedDatasetId) {
      return;
    }

    try {
      await initializeDataset(datasetId, registry);
      navigate("#/");
    } catch (error) {
      setBootState("error");
      setBootError(getErrorMessage(error, "Datensatzwechsel fehlgeschlagen."));
      setBootErrorDetails(getErrorDetails(error));
    }
  }

  function handleToggleControlSelection(item: SearchResultItem, selected: boolean) {
    setSelectedControlTopGroups((prev) => {
      if (selected) {
        if (prev[item.id] === item.topGroupId) {
          return prev;
        }
        return {
          ...prev,
          [item.id]: item.topGroupId
        };
      }

      if (!prev[item.id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  }

  async function fetchAllMatchingControls(baseQuery: Omit<SearchQuery, "limit" | "offset">): Promise<SearchResultItem[]> {
    const limit = 1200;
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    const byId = new Map<string, SearchResultItem>();

    while (offset < total && offset < SECURITY_BUDGETS.maxControlCount) {
      const response = await client.search({
        ...baseQuery,
        limit,
        offset
      });

      total = response.total;
      for (const item of response.items) {
        byId.set(item.id, item);
      }

      if (!response.items.length) {
        break;
      }
      offset += response.items.length;
    }

    return Array.from(byId.values());
  }

  function toggleSelectionForItems(items: SearchResultItem[]): "selected" | "deselected" | "none" {
    if (!items.length) {
      return "none";
    }

    const allAlreadySelected = items.every((item) => selectedControlIds.has(item.id));
    setSelectedControlTopGroups((prev) => {
      const next = { ...prev };
      if (allAlreadySelected) {
        for (const item of items) {
          delete next[item.id];
        }
        return next;
      }

      for (const item of items) {
        next[item.id] = item.topGroupId;
      }
      return next;
    });

    return allAlreadySelected ? "deselected" : "selected";
  }

  async function handleSelectAllHomeControls() {
    if (selectAllRunningScope || bootState !== "ready") {
      return;
    }
    setSelectAllRunningScope("home");
    try {
      const items = await fetchAllMatchingControls({
        text: "",
        sort: "id-asc",
        filters: defaultFilters()
      });
      const action = toggleSelectionForItems(items);
      if (action === "none") {
        setExportCsvMessage("Keine Controls gefunden.");
      } else if (action === "selected") {
        setExportCsvMessage(`${items.length} Controls zur CSV-Auswahl hinzugefuegt.`);
      } else {
        setExportCsvMessage(`${items.length} Controls aus der CSV-Auswahl entfernt.`);
      }
    } catch (error) {
      setExportCsvMessage(getErrorMessage(error, "Alles auswaehlen fehlgeschlagen."));
    } finally {
      setSelectAllRunningScope(null);
    }
  }

  async function handleSelectAllGroupControls() {
    if (selectAllRunningScope || route.view !== "group" || !meta) {
      return;
    }

    const group = meta.groups.find((item) => item.id === route.groupId);
    if (!group) {
      return;
    }

    const queryFilters = defaultFilters();
    queryFilters.topGroupId = [group.topGroupId];
    if (group.depth > 1) {
      queryFilters.groupId = [group.id];
    }

    setSelectAllRunningScope("group");
    try {
      const items = await fetchAllMatchingControls({
        text: "",
        sort: "id-asc",
        filters: queryFilters
      });
      const action = toggleSelectionForItems(items);
      if (action === "none") {
        setExportCsvMessage("Keine Gruppen-Controls gefunden.");
      } else if (action === "selected") {
        setExportCsvMessage(`${items.length} Gruppen-Controls zur CSV-Auswahl hinzugefuegt.`);
      } else {
        setExportCsvMessage(`${items.length} Gruppen-Controls aus der CSV-Auswahl entfernt.`);
      }
    } catch (error) {
      setExportCsvMessage(getErrorMessage(error, "Alles auswaehlen in Gruppe fehlgeschlagen."));
    } finally {
      setSelectAllRunningScope(null);
    }
  }

  async function handleSelectAllSearchControls() {
    if (selectAllRunningScope || route.view !== "search") {
      return;
    }

    setSelectAllRunningScope("search");
    try {
      const items = await fetchAllMatchingControls({
        text: sanitizeSearchText(route.query),
        sort: route.sort,
        filters: mapRouteFilters(route.filters)
      });
      const action = toggleSelectionForItems(items);
      if (action === "none") {
        setExportCsvMessage("Keine Suchtreffer gefunden.");
      } else if (action === "selected") {
        setExportCsvMessage(`${items.length} Suchtreffer zur CSV-Auswahl hinzugefuegt.`);
      } else {
        setExportCsvMessage(`${items.length} Suchtreffer aus der CSV-Auswahl entfernt.`);
      }
    } catch (error) {
      setExportCsvMessage(getErrorMessage(error, "Alles auswaehlen in Suche fehlgeschlagen."));
    } finally {
      setSelectAllRunningScope(null);
    }
  }

  async function handleExportCsv() {
    if (!meta || exportCsvRunning) {
      return;
    }
    const selectedEntries = Object.entries(selectedControlTopGroups);
    if (selectedEntries.length === 0) {
      return;
    }

    setExportCsvRunning(true);
    setExportCsvMessage(null);
    try {
      const rows = [];
      for (let index = 0; index < selectedEntries.length; index += 1) {
        const [controlId, knownTopGroupId] = selectedEntries[index];
        const resolvedTopGroupId = knownTopGroupId || (await resolveTopGroupId(controlId));
        if (!resolvedTopGroupId) {
          throw new Error(`Top-Gruppe für ${controlId} konnte nicht aufgelöst werden.`);
        }

        const detailPayload = await client.getControl(controlId, resolvedTopGroupId);
        rows.push(
          extractControlExportRow(detailPayload, {
            sourceVersion: meta.version,
            sourceLastModified: meta.lastModified
          })
        );

        if (index > 0 && index % 25 === 0) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
          });
        }
      }

      const csvText = toCsv(rows, CONTROL_EXPORT_COLUMNS, {
        delimiter: ";",
        lineEnding: "\r\n",
        withBom: true
      });
      const now = new Date().toISOString().slice(0, 10);
      const filename = `grundschutz-controls_${now}_${rows.length}.csv`;
      const csvBlob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      downloadBlob(filename, csvBlob);
      setSelectedControlTopGroups({});
      setExportCsvMessage(`CSV erfolgreich exportiert (${rows.length} Controls).`);
      setToastTone("success");
      setToastMessage(`CSV erfolgreich exportiert (${rows.length}).`);
    } catch (error) {
      setExportCsvMessage(getErrorMessage(error, "CSV-Export fehlgeschlagen."));
      setToastTone("error");
      setToastMessage("CSV-Export fehlgeschlagen.");
    } finally {
      setExportCsvRunning(false);
    }
  }

  useEffect(() => {
    if (!exportCsvMessage) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setExportCsvMessage(null);
    }, 4800);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [exportCsvMessage]);

  function handleSubmitSearch(valueOverride?: string) {
    /* REQ: US-02, PD-04 */
    const nextSearch = sanitizeSearchText(typeof valueOverride === "string" ? valueOverride : searchText);
    setSearchText(nextSearch);
    setSearchInputDirty(false);
    navigate(buildSearchHash(nextSearch, sort, filters, null, null));
    setSearchOverlayOpen(false);
    setDrawerOpen(false);
  }

  function handleClearSearch() {
    setSearchText("");
    setSearchInputDirty(false);
    const nextFilters = route.view === "search" ? filters : defaultFilters();
    navigate(buildSearchHash("", sort, nextFilters, null, null));
  }

  function handleSearchTextChange(nextValue: string) {
    setSearchInputDirty(true);
    setSearchText(nextValue);
  }

  function toggleFilter(key: keyof ActiveFilters, value: string) {
    const nextFilters: ActiveFilters = {
      ...filters,
      [key]: filters[key].includes(value) ? filters[key].filter((item) => item !== value) : [...filters[key], value]
    };
    setFilters(nextFilters);
    navigate(buildSearchHash(searchText, sort, nextFilters, null, null));
  }

  function handleSortBaseChange(base: SortBase) {
    if (base === "effort" && !effortSortEnabled) {
      return;
    }
    const nextSort = base === "relevance" ? "relevance" : toSortValue(base, "asc");
    handleSortChange(nextSort);
  }

  function handleSortDirectionToggle() {
    const base = getSortBase(sort);
    if (base === "relevance") {
      return;
    }
    const currentDirection = getSortDirection(sort);
    const nextSort = toSortValue(base, currentDirection === "asc" ? "desc" : "asc");
    handleSortChange(nextSort);
  }

  function handleSortChange(nextSort: SearchQuery["sort"]) {
    setSort(nextSort);
    navigate(buildSearchHash(searchText, nextSort, filters, null, null));
  }

  function handlePropertyFilterClick(facet: "secLevel" | "effortLevel" | "tags", value: string) {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    const baseFilters = route.view === "search" ? filters : defaultFilters();
    const baseSort = route.view === "search" ? sort : "relevance";
    const baseText = route.view === "search" ? searchText : "";

    const alreadyPresent = baseFilters[facet].some(
      (entry) => entry.toLocaleLowerCase("de-DE") === normalizedValue.toLocaleLowerCase("de-DE")
    );

    const nextFilters: ActiveFilters = {
      ...baseFilters,
      [facet]: alreadyPresent ? [...baseFilters[facet]] : [...baseFilters[facet], normalizedValue]
    };

    setFilters(nextFilters);
    setSort(baseSort);
    setSearchText(baseText);
    setSearchInputDirty(false);
    navigate(buildSearchHash(baseText, baseSort, nextFilters, null, null));
  }

  function handleSelectResult(item: SearchResultItem) {
    if (route.view === "search") {
      navigate(buildSearchHash(searchText, sort, filters, item.id, item.topGroupId));
      return;
    }
    navigate(buildControlHash(item.id, item.topGroupId));
  }

  async function handleRelationClick(controlId: string) {
    const topGroupId = await resolveTopGroupId(controlId);
    if (route.view === "search") {
      navigate(buildSearchHash(searchText, sort, filters, controlId, topGroupId));
      return;
    }
    navigate(buildControlHash(controlId, topGroupId));
  }

  function handleBreadcrumbGroupClick(groupId: string) {
    navigate(buildGroupHash(groupId));
  }

  function handleBreadcrumbControlClick(controlId: string) {
    handleRelationClick(controlId);
  }

  function getRecentSearchState() {
    const last = lastSearchStateRef.current;
    if (!last) {
      return null;
    }
    if (Date.now() - last.timestamp > BACK_TO_RESULTS_TTL_MS) {
      return null;
    }
    return last;
  }

  function handleBackToResults() {
    if (route.view === "search") {
      navigate(buildSearchHash(searchText, sort, filters, null, null));
      return;
    }

    const fallbackState = getRecentSearchState();
    if (fallbackState) {
      setSearchText(fallbackState.query);
      setSort(fallbackState.sort);
      setFilters(fallbackState.filters);
      setSearchInputDirty(false);
      navigate(buildSearchHash(fallbackState.query, fallbackState.sort, fallbackState.filters, null, null));
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("#/");
    }
  }

  const selectedControlId =
    route.view === "search" ? route.controlId : route.view === "control" ? route.controlId : detail?.id ?? null;
  const selectedControlIds = useMemo(() => new Set(Object.keys(selectedControlTopGroups)), [selectedControlTopGroups]);
  const selectedControlCount = selectedControlIds.size;

  const currentGroup =
    route.view === "group" && meta ? meta.groups.find((group) => group.id === route.groupId) ?? null : null;
  const currentSubgroups =
    route.view === "group" && meta && currentGroup
      ? meta.groups.filter((group) => group.parentGroupId === currentGroup.id)
      : [];

  const datasetOptions = registry?.datasets?.length
    ? registry.datasets.map((dataset) => ({ id: dataset.id, label: dataset.label }))
    : [{ id: selectedDatasetId, label: meta?.title || "Katalog" }];

  const activeDataset: DatasetDescriptor | null =
    registry?.datasets?.find((dataset) => dataset.id === selectedDatasetId) ?? null;

  const isLegalRoute = route.view === "impressum" || route.view === "datenschutz";
  const homeAllControlsSelected = Boolean(
    meta && meta.stats.controlCount > 0 && selectedControlCount === meta.stats.controlCount
  );
  const groupAllControlsSelected = Boolean(
    currentGroup && groupControls.length > 0 && groupControls.every((item) => selectedControlIds.has(item.id))
  );
  const searchAllControlsSelected = Boolean(
    route.view === "search" &&
      searchResponse.items.length > 0 &&
      searchResponse.items.every((item) => selectedControlIds.has(item.id))
  );
  const hasActiveFilters = Object.values(filters).some((entries) => entries.length > 0);
  const sortBase = getSortBase(sort);
  const sortDirection = getSortDirection(sort);
  const hasRecentSearchState = Boolean(getRecentSearchState());
  const showBackToResults = route.view === "search" ? Boolean(route.controlId) : route.view === "control" && hasRecentSearchState;

  if (bootState === "loading" && !meta && !isLegalRoute) {
    const progress = Math.min(100, Math.max(4, Math.round(bootProgress)));
    return (
      <main className="app-shell">
        <section className="status-screen" aria-live="polite">
          <div className="status-box loading-box">
            <h1>Index wird aufgebaut und geladen…</h1>
            <p>{bootStatusText}</p>
            <progress className="status-progress" value={progress} max={100} />
            <small>{progress}%</small>
          </div>
        </section>
        <AppFooter />
      </main>
    );
  }

  if (bootState === "error" && !isLegalRoute) {
    return (
      <main className="app-shell">
        <section className="status-screen error">
          <div className="status-box error-box">
            <h1>Initialisierung fehlgeschlagen</h1>
            <p>{bootError}</p>
            <textarea
              readOnly
              value={bootErrorDetails || bootError || "Kein Fehlerdetail verfügbar."}
              aria-label="Fehlerdetails"
            />
            <button
              className="secondary"
              type="button"
              onClick={() =>
                navigator.clipboard
                  .writeText(bootErrorDetails || bootError || "Kein Fehlerdetail verfügbar.")
                  .catch(() => {
                    // Clipboard support may be unavailable in hardened browser settings.
                  })
              }
            >
              Fehlerdetails kopieren
            </button>
          </div>
        </section>
        <AppFooter />
      </main>
    );
  }

  return (
    <main className="app-shell">
      {/* REQ: A11y-03 */}
      <a className="skip-link" href="#main-content">
        Zum Inhalt springen
      </a>

      <AppHeader
        isDesktop={isDesktop}
        isShrunk={headerShrunk}
        searchValue={searchText}
        theme={theme}
        datasets={datasetOptions}
        selectedDatasetId={selectedDatasetId}
        overflowOpen={overflowOpen}
        drawerOpen={drawerOpen}
        onSearchChange={handleSearchTextChange}
        onSearchSubmit={handleSubmitSearch}
        onSearchClear={handleClearSearch}
        onDatasetChange={handleDatasetChange}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        onOpenSearchOverlay={() => setSearchOverlayOpen(true)}
        onToggleOverflow={() => {
          setOverflowOpen((prev) => !prev);
          setDrawerOpen(false);
        }}
        onToggleDrawer={() => {
          setDrawerOpen((prev) => !prev);
          setOverflowOpen(false);
        }}
        onGoHome={() => navigate("#/")}
        onGoBack={() => {
          if (window.history.length > 1) {
            window.history.back();
            return;
          }
          navigate("#/");
        }}
        showBack={route.view !== "home"}
      />

      <OverflowMenu
        open={overflowOpen}
        selectedControlCount={selectedControlCount}
        exportingCsv={exportCsvRunning}
        importBusy={importBusy}
        onClose={() => setOverflowOpen(false)}
        onGoSource={() => navigate("#/about/source")}
        onGoAbout={() => navigate("#/about")}
        onExportCsv={handleExportCsv}
        onUpload={handleUpload}
      />

      <AppDrawer
        open={drawerOpen}
        datasets={datasetOptions}
        selectedDatasetId={selectedDatasetId}
        selectedControlCount={selectedControlCount}
        exportingCsv={exportCsvRunning}
        importBusy={importBusy}
        onClose={() => setDrawerOpen(false)}
        onGoHome={() => navigate("#/")}
        onOpenSearchOverlay={() => setSearchOverlayOpen(true)}
        onDatasetChange={handleDatasetChange}
        onGoSource={() => navigate("#/about/source")}
        onGoAbout={() => navigate("#/about")}
        onExportCsv={handleExportCsv}
        onUpload={handleUpload}
      />

      <SearchOverlay
        open={searchOverlayOpen && !isDesktop}
        value={searchText}
        onChange={handleSearchTextChange}
        onClear={handleClearSearch}
        onSubmit={handleSubmitSearch}
        onClose={() => setSearchOverlayOpen(false)}
      />

      <StatusToast message={toastMessage ?? exportCsvMessage} tone={toastMessage ? toastTone : "info"} />

      <div id="main-content" className="app-main-content">
        {route.view === "home" ? (
          <GroupOverview
            meta={meta}
            datasetId={selectedDatasetId}
            onOpenGroup={(groupId) => navigate(buildGroupHash(groupId))}
            onStartSearch={() => navigate(buildSearchHash(searchText, sort, filters))}
            onSelectAllControls={handleSelectAllHomeControls}
            selectingAllControls={selectAllRunningScope === "home"}
            allControlsSelected={homeAllControlsSelected}
          />
        ) : null}

        {route.view === "source" ? (
          <SourcePanel meta={meta} activeDataset={activeDataset} registry={registry} profileAnalysis={profileAnalysis} />
        ) : null}

        {route.view === "about" ? <AboutPage meta={meta} activeDataset={activeDataset} /> : null}

        {route.view === "group" ? (
          <GroupPage
            group={currentGroup}
            subgroups={currentSubgroups}
            controls={groupControls}
            selectedControlIds={selectedControlIds}
            loading={groupLoading}
            selectingAllControls={selectAllRunningScope === "group"}
            allControlsSelected={groupAllControlsSelected}
            onOpenSubgroup={(groupId) => navigate(buildGroupHash(groupId))}
            onOpenControl={(item) => navigate(buildControlHash(item.id, item.topGroupId))}
            onToggleControlSelection={handleToggleControlSelection}
            onSelectAllControls={handleSelectAllGroupControls}
          />
        ) : null}

        {route.view === "search" ? (
          <section className={`search-layout ${isWideDesktop ? "wide" : "compact"}`}>
            {!isWideDesktop ? (
              <div className="search-layout-actions">
                <button type="button" className="secondary" onClick={() => setFilterSheetOpen(true)}>
                  Filter
                </button>
              </div>
            ) : null}

            {isWideDesktop ? (
              <FacetPanel
                facets={searchResponse.facets}
                filters={filters}
                sortBase={sortBase}
                sortDirection={sortDirection}
                effortSortEnabled={effortSortEnabled}
                onToggle={toggleFilter}
                onSortBaseChange={handleSortBaseChange}
                onSortDirectionToggle={handleSortDirectionToggle}
                onReset={() => {
                  const next = defaultFilters();
                  setFilters(next);
                  navigate(buildSearchHash(searchText, sort, next, null, null));
                }}
              />
            ) : null}

            <ResultList
              items={searchResponse.items}
              total={searchResponse.total}
              query={searchText}
              selectedId={selectedControlId}
              selectedControlIds={selectedControlIds}
              loading={searchLoading}
              error={searchError}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={() => {
                const next = defaultFilters();
                setFilters(next);
                navigate(buildSearchHash(searchText, sort, next, null, null));
              }}
              onSelect={handleSelectResult}
              onToggleSelection={handleToggleControlSelection}
              onSelectAllControls={handleSelectAllSearchControls}
              selectingAllControls={selectAllRunningScope === "search"}
              allControlsSelected={searchAllControlsSelected}
            />

            {isWideDesktop ? (
              <ControlDetailPanel
                detail={detail}
                loading={detailLoading}
                error={detailError}
                graphData={graphData}
                graphLoading={graphLoading}
                graphError={graphError}
                graphHops={graphHops}
                graphFilter={graphFilter}
                onGraphHopsChange={setGraphHops}
                onGraphFilterChange={setGraphFilter}
                onRelationClick={handleRelationClick}
                onPropertyFilterClick={handlePropertyFilterClick}
                onBreadcrumbGroupClick={handleBreadcrumbGroupClick}
                onBreadcrumbControlClick={handleBreadcrumbControlClick}
                onBackToResults={showBackToResults ? handleBackToResults : null}
              />
            ) : null}
          </section>
        ) : null}

        {route.view === "control" ? (
          <section className="single-control-layout">
            <ControlDetailPanel
              detail={detail}
              loading={detailLoading}
              error={detailError}
              graphData={graphData}
              graphLoading={graphLoading}
              graphError={graphError}
              graphHops={graphHops}
              graphFilter={graphFilter}
              onGraphHopsChange={setGraphHops}
              onGraphFilterChange={setGraphFilter}
              onRelationClick={handleRelationClick}
              onPropertyFilterClick={handlePropertyFilterClick}
              onBreadcrumbGroupClick={handleBreadcrumbGroupClick}
              onBreadcrumbControlClick={handleBreadcrumbControlClick}
              onBackToResults={showBackToResults ? handleBackToResults : null}
            />
          </section>
        ) : null}

        {route.view === "impressum" ? <ImpressumPage /> : null}
        {route.view === "datenschutz" ? <DatenschutzPage /> : null}
      </div>

      {route.view === "search" ? (
        <FilterSheet
          open={filterSheetOpen && !isWideDesktop}
          title="Filter"
          variant="filter"
          onClose={() => setFilterSheetOpen(false)}
        >
          <FacetPanel
            facets={searchResponse.facets}
            filters={filters}
            sortBase={sortBase}
            sortDirection={sortDirection}
            effortSortEnabled={effortSortEnabled}
            onToggle={toggleFilter}
            onSortBaseChange={handleSortBaseChange}
            onSortDirectionToggle={handleSortDirectionToggle}
            onReset={() => {
              const next = defaultFilters();
              setFilters(next);
              navigate(buildSearchHash(searchText, sort, next, null, null));
            }}
          />
        </FilterSheet>
      ) : null}

      {route.view === "search" && !isWideDesktop && route.controlId ? (
        <FilterSheet
          open={Boolean(route.controlId)}
          title="Control-Detail"
          variant="detail"
          onClose={() => navigate(buildSearchHash(searchText, sort, filters, null, null))}
        >
          {/* REQ: PD-06, Clarification Pack §8 */}
          <ControlDetailPanel
            detail={detail}
            loading={detailLoading}
            error={detailError}
            graphData={graphData}
            graphLoading={graphLoading}
            graphError={graphError}
            graphHops={graphHops}
            graphFilter={graphFilter}
            onGraphHopsChange={setGraphHops}
            onGraphFilterChange={setGraphFilter}
            onRelationClick={handleRelationClick}
            onPropertyFilterClick={handlePropertyFilterClick}
            onBreadcrumbGroupClick={handleBreadcrumbGroupClick}
            onBreadcrumbControlClick={handleBreadcrumbControlClick}
            onBackToResults={showBackToResults ? handleBackToResults : null}
          />
        </FilterSheet>
      ) : null}

      <AppFooter />
    </main>
  );
}
