import { useEffect, useMemo, useRef, useState } from "react";
import { buildControlHash, buildSearchHash, defaultFilters, type ActiveFilters, type AppRoute } from "../lib/routing";
import { sanitizeSearchText } from "../lib/searchSafety";
import type { SearchClient } from "../lib/searchClient";
import type { SearchQuery, SearchResponse, SearchResultItem } from "../types";
import { useDebouncedValue } from "./useDebouncedValue";
import { getSortBase, getSortDirection, mapRouteFilters, toSortValue, type SortBase } from "./appFlowUtils";
import type { BootState } from "./useAppBoot";

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

const BACK_TO_RESULTS_TTL_MS = 30 * 60 * 1000;

interface UseSearchFlowArgs {
  client: SearchClient;
  bootState: BootState;
  route: AppRoute;
  effortSortEnabled: boolean;
  searchOverlayOpen: boolean;
  navigate: (hash: string) => void;
  replaceHash: (hash: string) => void;
  onLoadControl: (controlId: string, topGroupId: string | null) => Promise<void>;
  onClearDetailAndGraph: () => void;
}

export function useSearchFlow({
  client,
  bootState,
  route,
  effortSortEnabled,
  searchOverlayOpen,
  navigate,
  replaceHash,
  onLoadControl,
  onClearDetailAndGraph
}: UseSearchFlowArgs) {
  const [searchText, setSearchText] = useState("");
  const [searchOverlayText, setSearchOverlayText] = useState("");
  const [searchInputDirty, setSearchInputDirty] = useState(false);
  const [sort, setSort] = useState<SearchQuery["sort"]>("relevance");
  const [filters, setFilters] = useState<ActiveFilters>(defaultFilters());

  const [searchResponse, setSearchResponse] = useState<SearchResponse>(DEFAULT_SEARCH_RESPONSE);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [pendingSearchResultsFocusQuery, setPendingSearchResultsFocusQuery] = useState<string | null>(null);

  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const requestCounter = useRef(0);
  const lastSearchStateRef = useRef<{
    query: string;
    sort: SearchQuery["sort"];
    filters: ActiveFilters;
    timestamp: number;
  } | null>(null);

  function focusSearchResultsArea() {
    const focusTarget = document.querySelector<HTMLElement>(
      '[data-search-results-focus="results"], [data-search-results-focus="status"]'
    );
    focusTarget?.focus();
  }

  function scheduleSearchResultsFocus() {
    let attempt = 0;

    function run() {
      focusSearchResultsArea();
      if (attempt >= 8) {
        setPendingSearchResultsFocusQuery(null);
        return;
      }
      attempt += 1;
      window.setTimeout(run, 40);
    }

    run();
  }

  function clearPendingSearchResultsFocus() {
    if (pendingSearchResultsFocusQuery !== null) {
      setPendingSearchResultsFocusQuery(null);
    }
  }

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
    route.view === "search" ? route.controlId : null,
    navigate,
    replaceHash
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
    route.view === "search" ? route.controlTopGroupId : null,
    navigate
  ]);

  useEffect(() => {
    if (bootState !== "ready") {
      return;
    }

    if (route.view !== "search") {
      setPendingSearchResultsFocusQuery(null);
      return;
    }

    const current = ++requestCounter.current;
    const shouldFocusAfterSearch =
      pendingSearchResultsFocusQuery !== null && pendingSearchResultsFocusQuery === route.query && !searchOverlayOpen;
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
      .then(async (response) => {
        if (current !== requestCounter.current) {
          return;
        }

        setSearchResponse(response);

        if (route.controlId) {
          await onLoadControl(route.controlId, route.controlTopGroupId);
          return;
        }

        onClearDetailAndGraph();
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
          if (shouldFocusAfterSearch) {
            window.requestAnimationFrame(() => {
              scheduleSearchResultsFocus();
            });
          }
        }
      });
  }, [
    bootState,
    client,
    pendingSearchResultsFocusQuery,
    route,
    searchOverlayOpen,
    onLoadControl,
    onClearDetailAndGraph
  ]);

  function handleSubmitSearch(valueOverride?: string) {
    const nextSearch = sanitizeSearchText(
      typeof valueOverride === "string" ? valueOverride : searchOverlayText || searchText
    );
    const nextHash = buildSearchHash(nextSearch, sort, filters, null, null);
    const hashWillChange = window.location.hash !== nextHash.replace(/^#/, "#");

    setSearchText(nextSearch);
    setSearchOverlayText("");
    setSearchInputDirty(false);
    setPendingSearchResultsFocusQuery(hashWillChange ? nextSearch : null);
    navigate(nextHash);

    if (!hashWillChange) {
      window.requestAnimationFrame(() => {
        scheduleSearchResultsFocus();
      });
    }
  }

  function handleClearSearch() {
    setSearchText("");
    setSearchOverlayText("");
    setSearchInputDirty(false);
    clearPendingSearchResultsFocus();
    const nextFilters = route.view === "search" ? filters : defaultFilters();
    replaceHash(buildSearchHash("", sort, nextFilters, null, null));
  }

  function handleSearchTextChange(nextValue: string) {
    setSearchInputDirty(true);
    setSearchOverlayText(nextValue);
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

  function handleSortChange(nextSort: SearchQuery["sort"]) {
    setSort(nextSort);
    navigate(buildSearchHash(searchText, nextSort, filters, null, null));
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

  function handleStartSearch() {
    navigate(buildSearchHash(searchText, sort, filters));
  }

  function handleResetFilters() {
    const next = defaultFilters();
    setFilters(next);
    navigate(buildSearchHash(searchText, sort, next, null, null));
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

  const hasActiveFilters = useMemo(() => Object.values(filters).some((entries) => entries.length > 0), [filters]);
  const sortBase = useMemo(() => getSortBase(sort), [sort]);
  const sortDirection = useMemo(() => getSortDirection(sort), [sort]);
  const hasRecentSearchState = Boolean(getRecentSearchState());
  const showBackToResults =
    route.view === "search" ? Boolean(route.controlId) : route.view === "control" && hasRecentSearchState;

  return {
    searchText,
    searchOverlayText,
    sort,
    filters,
    searchResponse,
    searchLoading,
    searchError,
    hasActiveFilters,
    sortBase,
    sortDirection,
    showBackToResults,
    handleSubmitSearch,
    handleClearSearch,
    handleSearchTextChange,
    handleStartSearch,
    handleSelectResult,
    handleBackToResults,
    handleResetFilters,
    handlePropertyFilterClick,
    toggleFilter,
    handleSortBaseChange,
    handleSortDirectionToggle
  };
}
