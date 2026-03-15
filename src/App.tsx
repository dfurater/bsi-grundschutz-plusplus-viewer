import { useCallback, useEffect, useMemo, useState } from "react";
import { AboutPage } from "./components/AboutPage";
import { AppFooter } from "./components/AppFooter";
import { AppHeader } from "./components/AppHeader";
import { ControlDetailPanel } from "./components/ControlDetailPanel";
import { DatenschutzPage } from "./components/DatenschutzPage";
import { FacetPanel } from "./components/FacetPanel";
import { FilterSheet } from "./components/FilterSheet";
import { GroupOverview } from "./components/GroupOverview";
import { GroupPage } from "./components/GroupPage";
import { ImpressumPage } from "./components/ImpressumPage";
import { ResultList } from "./components/ResultList";
import { SearchOverlay } from "./components/SearchOverlay";
import { SourcePanel } from "./components/SourcePanel";
import { StatusToast } from "./components/StatusToast";
import { navigate } from "./hooks/appFlowUtils";
import { useAppBoot } from "./hooks/useAppBoot";
import { useControlDetail } from "./hooks/useControlDetail";
import { useCsvExport } from "./hooks/useCsvExport";
import { useGroupPage } from "./hooks/useGroupPage";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useRelationGraph } from "./hooks/useRelationGraph";
import { useSearchFlow } from "./hooks/useSearchFlow";
import { buildControlHash, buildGroupHash, buildSearchHash, parseHash, type AppRoute } from "./lib/routing";
import { SearchClient } from "./lib/searchClient";

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

export default function App() {
  const client = useMemo(() => new SearchClient(), []);
  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const isWideDesktop = useMediaQuery("(min-width: 1280px)");
  const [route, setRoute] = useState<AppRoute>(() => parseHash(window.location.hash));

  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [headerShrunk, setHeaderShrunk] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const replaceHash = useCallback((hash: string) => {
    const normalized = hash.replace(/^#/, "#");
    if (window.location.hash === normalized) {
      return;
    }
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${normalized}`);
    setRoute(parseHash(window.location.hash));
  }, []);

  const { meta, bootState, bootError, bootErrorDetails, bootProgress, bootStatusText, effortSortEnabled } = useAppBoot(client);

  const controlDetail = useControlDetail({
    client,
    bootState,
    route
  });

  const relationGraph = useRelationGraph({
    client,
    detailId: controlDetail.detail?.id ?? null
  });

  const clearDetailAndGraph = useCallback(() => {
    controlDetail.clearDetail();
    relationGraph.clearGraph();
  }, [controlDetail.clearDetail, relationGraph.clearGraph]);

  const searchFlow = useSearchFlow({
    client,
    bootState,
    route,
    effortSortEnabled,
    searchOverlayOpen,
    navigate,
    replaceHash,
    onLoadControl: controlDetail.loadControl,
    onClearDetailAndGraph: clearDetailAndGraph
  });

  const groupPage = useGroupPage({
    client,
    bootState,
    route,
    meta
  });

  const csvExport = useCsvExport({
    client,
    meta,
    bootState,
    route,
    resolveTopGroupId: controlDetail.resolveTopGroupId
  });

  useEffect(() => {
    if (route.view === "search" || route.view === "control") {
      return;
    }
    clearDetailAndGraph();
  }, [route.view, clearDetailAndGraph]);

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
    const onHash = () => {
      setRoute(parseHash(window.location.hash));
      setFilterSheetOpen(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  useEffect(() => {
    const detailSheetOpen = route.view === "search" && !isWideDesktop && Boolean(route.controlId);
    const shouldLockScroll = searchOverlayOpen || filterSheetOpen || detailSheetOpen;
    if (!shouldLockScroll) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [filterSheetOpen, isWideDesktop, route.view, route.view === "search" ? route.controlId : null, searchOverlayOpen]);

  const handleRelationClick = useCallback(
    async (controlId: string) => {
      const topGroupId = await controlDetail.resolveTopGroupId(controlId);
      if (route.view === "search") {
        navigate(
          buildSearchHash(searchFlow.searchText, searchFlow.sort, searchFlow.filters, controlId, topGroupId, {
            page: route.page,
            pageSize: route.pageSize
          })
        );
        return;
      }
      navigate(buildControlHash(controlId, topGroupId));
    },
    [
      controlDetail.resolveTopGroupId,
      route.view,
      route.view === "search" ? route.page : null,
      route.view === "search" ? route.pageSize : null,
      searchFlow.searchText,
      searchFlow.sort,
      searchFlow.filters
    ]
  );

  const handleBreadcrumbGroupClick = useCallback((groupId: string) => {
    navigate(buildGroupHash(groupId));
  }, []);

  const handleBreadcrumbControlClick = useCallback(
    (controlId: string) => {
      void handleRelationClick(controlId);
    },
    [handleRelationClick]
  );

  const selectedControlId =
    route.view === "search" ? route.controlId : route.view === "control" ? route.controlId : controlDetail.detail?.id ?? null;

  const isLegalRoute = route.view === "impressum" || route.view === "datenschutz" || route.view === "source";
  const homeAllControlsSelected =
    Boolean(meta && meta.stats.controlCount > 0) && csvExport.selectedControlCount === (meta?.stats.controlCount ?? 0);
  const groupAllControlsSelected =
    Boolean(groupPage.currentGroup) &&
    groupPage.groupControls.length > 0 &&
    groupPage.groupControls.every((item) => csvExport.selectedControlIds.has(item.id));
  const searchAllControlsSelected =
    route.view === "search" &&
    searchFlow.searchResponse.items.length > 0 &&
    searchFlow.searchResponse.items.every((item) => csvExport.selectedControlIds.has(item.id));

  const detailPanelProps = {
    detail: controlDetail.detail,
    loading: controlDetail.detailLoading,
    error: controlDetail.detailError,
    graphData: relationGraph.graphData,
    graphLoading: relationGraph.graphLoading,
    graphError: relationGraph.graphError,
    graphHops: relationGraph.graphHops,
    graphFilter: relationGraph.graphFilter,
    onGraphHopsChange: relationGraph.setGraphHops,
    onGraphFilterChange: relationGraph.setGraphFilter,
    onRelationClick: handleRelationClick,
    onPropertyFilterClick: searchFlow.handlePropertyFilterClick,
    onBreadcrumbGroupClick: handleBreadcrumbGroupClick,
    onBreadcrumbControlClick: handleBreadcrumbControlClick,
    onBackToResults: searchFlow.showBackToResults ? searchFlow.handleBackToResults : null,
    expandAllByDefault: true
  };

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
        isTabletUp={isTabletUp}
        isShrunk={headerShrunk}
        searchOverlayOpen={searchOverlayOpen}
        theme={theme}
        selectedControlCount={csvExport.selectedControlCount}
        exportingCsv={csvExport.exportCsvRunning}
        onOpenSearchOverlay={() => setSearchOverlayOpen(true)}
        onExportCsv={csvExport.handleExportCsv}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
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

      <SearchOverlay
        open={searchOverlayOpen}
        value={searchFlow.searchOverlayText}
        onChange={searchFlow.handleSearchTextChange}
        onClear={searchFlow.handleClearSearch}
        onSubmit={(value) => {
          searchFlow.handleSubmitSearch(value);
          setSearchOverlayOpen(false);
        }}
        onClose={() => setSearchOverlayOpen(false)}
      />

      <StatusToast
        message={csvExport.toastMessage ?? csvExport.exportCsvMessage}
        tone={csvExport.toastMessage ? csvExport.toastTone : "info"}
      />

      <div id="main-content" className="app-main-content">
        {route.view === "home" ? (
          <GroupOverview
            meta={meta}
            onOpenGroup={(groupId) => navigate(buildGroupHash(groupId))}
            onStartSearch={searchFlow.handleStartSearch}
            onSelectAllControls={csvExport.handleSelectAllHomeControls}
            selectingAllControls={csvExport.selectAllRunningScope === "home"}
            allControlsSelected={homeAllControlsSelected}
          />
        ) : null}

        {route.view === "source" ? <SourcePanel meta={meta} /> : null}

        {route.view === "about" ? <AboutPage meta={meta} /> : null}

        {route.view === "group" ? (
          <GroupPage
            group={groupPage.currentGroup}
            subgroups={groupPage.currentSubgroups}
            controls={groupPage.groupControls}
            page={route.page}
            pageSize={route.pageSize}
            selectedControlIds={csvExport.selectedControlIds}
            loading={groupPage.groupLoading}
            selectingAllControls={csvExport.selectAllRunningScope === "group"}
            allControlsSelected={groupAllControlsSelected}
            onOpenSubgroup={(groupId) => navigate(buildGroupHash(groupId))}
            onOpenControl={(item) => navigate(buildControlHash(item.id, item.topGroupId))}
            onPageChange={(nextPage) => navigate(buildGroupHash(route.groupId, { page: nextPage, pageSize: route.pageSize }))}
            onToggleControlSelection={csvExport.handleToggleControlSelection}
            onSelectAllControls={csvExport.handleSelectAllGroupControls}
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
                facets={searchFlow.searchResponse.facets}
                filters={searchFlow.filters}
                sortBase={searchFlow.sortBase}
                sortDirection={searchFlow.sortDirection}
                effortSortEnabled={effortSortEnabled}
                onToggle={searchFlow.toggleFilter}
                onSortBaseChange={searchFlow.handleSortBaseChange}
                onSortDirectionToggle={searchFlow.handleSortDirectionToggle}
                onReset={searchFlow.handleResetFilters}
              />
            ) : null}

            <ResultList
              items={searchFlow.searchResponse.items}
              total={searchFlow.searchResponse.total}
              query={searchFlow.searchText}
              selectedId={selectedControlId}
              selectedControlIds={csvExport.selectedControlIds}
              loading={searchFlow.searchLoading}
              error={searchFlow.searchError}
              hasActiveFilters={searchFlow.hasActiveFilters}
              page={route.page}
              pageSize={route.pageSize}
              onResetFilters={searchFlow.handleResetFilters}
              onSelect={searchFlow.handleSelectResult}
              onPageChange={(nextPage) =>
                navigate(
                  buildSearchHash(searchFlow.searchText, searchFlow.sort, searchFlow.filters, route.controlId, route.controlTopGroupId, {
                    page: nextPage,
                    pageSize: route.pageSize
                  })
                )
              }
              onToggleSelection={csvExport.handleToggleControlSelection}
              onSelectAllControls={csvExport.handleSelectAllSearchControls}
              selectingAllControls={csvExport.selectAllRunningScope === "search"}
              allControlsSelected={searchAllControlsSelected}
            />

            {isWideDesktop ? <ControlDetailPanel {...detailPanelProps} /> : null}
          </section>
        ) : null}

        {route.view === "control" ? (
          <section className="single-control-layout">
            <ControlDetailPanel {...detailPanelProps} />
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
            facets={searchFlow.searchResponse.facets}
            filters={searchFlow.filters}
            sortBase={searchFlow.sortBase}
            sortDirection={searchFlow.sortDirection}
            effortSortEnabled={effortSortEnabled}
            onToggle={searchFlow.toggleFilter}
            onSortBaseChange={searchFlow.handleSortBaseChange}
            onSortDirectionToggle={searchFlow.handleSortDirectionToggle}
            onReset={searchFlow.handleResetFilters}
          />
        </FilterSheet>
      ) : null}

      {route.view === "search" && !isWideDesktop && route.controlId ? (
        <FilterSheet
          open={Boolean(route.controlId)}
          title="Control-Detail"
          variant="detail"
          onClose={() =>
            navigate(
              buildSearchHash(searchFlow.searchText, searchFlow.sort, searchFlow.filters, null, null, {
                page: route.page,
                pageSize: route.pageSize
              })
            )
          }
        >
          {/* REQ: PD-06, Clarification Pack §8 */}
          <ControlDetailPanel {...detailPanelProps} />
        </FilterSheet>
      ) : null}

      <AppFooter />
    </main>
  );
}
