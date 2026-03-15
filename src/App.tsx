import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { AboutPage } from "./components/AboutPage";
import { AppFooter } from "./components/AppFooter";
import { AppHeader } from "./components/AppHeader";
import { ControlDetailPanel } from "./components/ControlDetailPanel";
import { DatenschutzPage } from "./components/DatenschutzPage";
import { FACET_LABELS, FacetPanel, type ActiveFilters } from "./components/FacetPanel";
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
import { buildControlHash, buildGroupHash, buildSearchHash, type AppRoute, parseHash } from "./lib/routing";
import { SearchClient } from "./lib/searchClient";

type ActiveFilterChip = {
  facet: keyof ActiveFilters;
  label: string;
  value: string;
};

function currentLabel(route: AppRoute) {
  switch (route.view) {
    case "home":
      return "Start";
    case "search":
      return "Suche";
    case "group":
      return "Gruppe";
    case "control":
      return "Control";
    case "about":
      return "About";
    case "source":
      return "Quellen & Lizenz";
    case "impressum":
      return "Impressum";
    case "datenschutz":
      return "Datenschutz";
    default:
      return "Viewer";
  }
}

function flattenActiveFilters(filters: ActiveFilters): ActiveFilterChip[] {
  return (Object.entries(filters) as Array<[keyof ActiveFilters, string[]]>).flatMap(([facet, values]) =>
    values.map((value) => ({
      facet,
      value,
      label: FACET_LABELS[facet]
    }))
  );
}

export default function App() {
  const client = useMemo(() => new SearchClient(), []);
  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const isWideDesktop = useMediaQuery("(min-width: 1280px)");
  const [route, setRoute] = useState<AppRoute>(() => parseHash(window.location.hash));
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

  const handleSkipLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.focus();
    target.scrollIntoView?.({ block: "start" });
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
    const onHash = () => {
      setRoute(parseHash(window.location.hash));
      setFilterSheetOpen(false);
      setSearchOverlayOpen(false);
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

  const activeFilterChips = useMemo(() => flattenActiveFilters(searchFlow.filters), [searchFlow.filters]);
  const topGroups = useMemo(() => meta?.groups.filter((group) => group.depth === 1) ?? [], [meta]);
  const currentTopGroupId =
    route.view === "group"
      ? groupPage.currentGroup?.topGroupId ?? null
      : route.view === "control"
        ? controlDetail.detail?.topGroupId ?? null
        : route.view === "search" && searchFlow.filters.topGroupId.length === 1
          ? searchFlow.filters.topGroupId[0]
          : controlDetail.detail?.topGroupId ?? null;
  const searchOverlayValue = searchFlow.searchOverlayText || searchFlow.searchText;
  const searchCountLabel = searchFlow.searchLoading ? "Suche läuft…" : `${searchFlow.searchResponse.total} Treffer`;
  const canOpenSearch = route.view !== "search";

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

  function renderSidebar() {
    if (!isTabletUp) {
      return null;
    }

    return (
      <nav className="sidebar app-sidebar" aria-label="Bereichsnavigation">
        <div className="sidebar-section-label">Ansichten</div>
        <a href="#/" className={`sidebar-link ${route.view === "home" ? "active" : ""}`}>
          Start
        </a>
        <a
          href={buildSearchHash(searchFlow.searchText, searchFlow.sort, searchFlow.filters)}
          className={`sidebar-link ${route.view === "search" ? "active" : ""}`}
        >
          Suche
        </a>
        <a href="#/about/license" className={`sidebar-link ${route.view === "source" ? "active" : ""}`}>
          Quellen & Lizenz
        </a>
        <a href="#/about" className={`sidebar-link ${route.view === "about" ? "active" : ""}`}>
          About
        </a>
        <a href="#/impressum" className={`sidebar-link ${route.view === "impressum" ? "active" : ""}`}>
          Impressum
        </a>
        <a href="#/datenschutz" className={`sidebar-link ${route.view === "datenschutz" ? "active" : ""}`}>
          Datenschutz
        </a>

        {topGroups.length > 0 ? (
          <>
            <div className="sidebar-section-label">Katalog</div>
            {topGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`sidebar-link sidebar-link-button ${currentTopGroupId === group.id ? "active" : ""}`}
                onClick={() => navigate(buildGroupHash(group.id))}
              >
                <span className="sidebar-link-code">{group.id}</span>
                <span className="sidebar-link-copy">{group.title}</span>
              </button>
            ))}
          </>
        ) : null}
      </nav>
    );
  }

  function renderSearchFilterStrip() {
    if (!activeFilterChips.length) {
      return null;
    }

    return (
      <div className="c-search-active-filters">
        <span className="c-search-filter-label">Aktiv</span>
        {activeFilterChips.map((chip) => (
          <button
            key={`${chip.facet}-${chip.value}`}
            type="button"
            className="chip chip-active"
            onClick={() => searchFlow.toggleFilter(chip.facet, chip.value)}
            title={`${chip.label}: ${chip.value} entfernen`}
          >
            {chip.value}
            <span className="chip-dismiss" aria-hidden="true">
              <svg viewBox="0 0 7 7" fill="none">
                <path d="M1 1l5 5M6 1L1 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        ))}
        <button type="button" className="search-reset-button" onClick={searchFlow.handleResetFilters}>
          Alle zurücksetzen
        </button>
      </div>
    );
  }

  function renderDesktopSearchHead() {
    return (
      <form
        id="search-workspace"
        className="c-search-wrapper search-console-shell"
        role="search"
        aria-label="Katalog durchsuchen"
        tabIndex={-1}
        onSubmit={(event) => {
          event.preventDefault();
          searchFlow.handleSubmitSearch(searchFlow.searchText);
        }}
      >
        <div className="c-search-head">
          <svg className={`c-search-icon ${searchFlow.searchText.trim() ? "active" : ""}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 12l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            className="c-search-input"
            type="search"
            value={searchFlow.searchText}
            placeholder="ID, Titel oder Begriff suchen"
            onChange={(event) => searchFlow.handleSearchTextChange(event.target.value)}
          />
          <span className="c-search-count">{searchCountLabel}</span>
          <button type="submit" className="btn btn-primary btn-sm">
            Suche
          </button>
        </div>
        {renderSearchFilterStrip()}
      </form>
    );
  }

  function renderMobileSearchHead() {
    return (
      <div id="search-workspace" className="search-mobile-shell" tabIndex={-1}>
        <div className="c-search-wrapper search-console-shell mobile">
          <div className="c-search-head">
            <svg className={`c-search-icon ${searchFlow.searchText.trim() ? "active" : ""}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 12l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <button type="button" className="search-summary-trigger" onClick={() => setSearchOverlayOpen(true)}>
              {searchFlow.searchText.trim() ? searchFlow.searchText : "Suche öffnen"}
            </button>
            <span className="c-search-count">{searchCountLabel}</span>
          </div>
          {renderSearchFilterStrip()}
        </div>

        <div className="search-layout-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilterSheetOpen(true)}>
            Filter
          </button>
        </div>
      </div>
    );
  }

  function renderStatusContent() {
    if (bootState === "loading" && !meta && !isLegalRoute) {
      const progress = Math.min(100, Math.max(4, Math.round(bootProgress)));
      return (
        <section className="status-screen" aria-live="polite">
          <div className="status-box loading-box">
            <h1>Index wird aufgebaut und geladen…</h1>
            <p>{bootStatusText}</p>
            <progress className="status-progress" value={progress} max={100} />
            <small>{progress}%</small>
          </div>
        </section>
      );
    }

    if (bootState === "error" && !isLegalRoute) {
      return (
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
              className="btn btn-secondary btn-sm"
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
      );
    }

    return null;
  }

  const statusContent = renderStatusContent();

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content" onClick={(event) => handleSkipLinkClick(event, "main-content")}>
        Zum Inhalt springen
      </a>
      {route.view === "search" ? (
        <a
          className="skip-link skip-link-secondary"
          href="#search-workspace"
          onClick={(event) => handleSkipLinkClick(event, "search-workspace")}
        >
          Zum Sucharbeitsbereich springen
        </a>
      ) : null}

      <AppHeader
        currentLabel={currentLabel(route)}
        canOpenSearch={canOpenSearch}
        selectedControlCount={csvExport.selectedControlCount}
        exportingCsv={csvExport.exportCsvRunning}
        onOpenSearchOverlay={() => setSearchOverlayOpen(true)}
        onExportCsv={csvExport.handleExportCsv}
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
        value={searchOverlayValue}
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

      <div className="app-shell-body">
        {renderSidebar()}

        <div id="main-content" className="app-main-content" tabIndex={-1}>
          {statusContent ? statusContent : null}

          {!statusContent && route.view === "home" ? (
            <GroupOverview
              meta={meta}
              searchText={searchFlow.searchText}
              onSearchTextChange={searchFlow.handleSearchTextChange}
              onSubmitSearch={searchFlow.handleStartSearch}
              onOpenGroup={(groupId) => navigate(buildGroupHash(groupId))}
              onSelectAllControls={csvExport.handleSelectAllHomeControls}
              selectingAllControls={csvExport.selectAllRunningScope === "home"}
              allControlsSelected={homeAllControlsSelected}
            />
          ) : null}

          {!statusContent && route.view === "source" ? <SourcePanel meta={meta} /> : null}
          {!statusContent && route.view === "about" ? <AboutPage meta={meta} /> : null}

          {!statusContent && route.view === "group" ? (
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

          {!statusContent && route.view === "search" ? (
            <section className="search-route">
              {isWideDesktop ? renderDesktopSearchHead() : renderMobileSearchHead()}

              <section className={`search-layout ${isWideDesktop ? "wide" : "compact"}`}>
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
            </section>
          ) : null}

          {!statusContent && route.view === "control" ? (
            <section className="single-control-layout">
              <ControlDetailPanel {...detailPanelProps} />
            </section>
          ) : null}

          {!statusContent && route.view === "impressum" ? <ImpressumPage /> : null}
          {!statusContent && route.view === "datenschutz" ? <DatenschutzPage /> : null}
        </div>
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
          <ControlDetailPanel {...detailPanelProps} />
        </FilterSheet>
      ) : null}

      <AppFooter />
    </main>
  );
}
