interface AppHeaderProps {
  isDesktop: boolean;
  isShrunk: boolean;
  searchValue: string;
  datasets: Array<{ id: string; label: string }>;
  selectedDatasetId: string;
  overflowOpen: boolean;
  drawerOpen: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (valueOverride?: string) => void;
  onSearchClear: () => void;
  onDatasetChange: (datasetId: string) => void;
  onOpenSearchOverlay: () => void;
  onToggleOverflow: () => void;
  onToggleDrawer: () => void;
  onGoHome: () => void;
  onGoBack: () => void;
  showBack: boolean;
}

/**
 * Global app bar with desktop search row and responsive action triggers.
 * REQ: PD-01, PD-02, PD-07, RESP-01, US-01
 */
export function AppHeader({
  isDesktop,
  isShrunk,
  searchValue,
  datasets,
  selectedDatasetId,
  overflowOpen,
  drawerOpen,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  onDatasetChange,
  onOpenSearchOverlay,
  onToggleOverflow,
  onToggleDrawer,
  onGoHome,
  onGoBack,
  showBack
}: AppHeaderProps) {
  return (
    <header className={`app-header-shell ${isShrunk ? "is-shrunk" : ""}`}>
      {/* REQ: PD-01, PD-07, 4.4.1 */}
      <div className="app-bar" aria-label="App-Bar">
        <div className="app-bar-start">
          {!isDesktop ? (
            <button
              type="button"
              className="icon-button"
              aria-label="Navigation öffnen"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={onToggleDrawer}
            >
              ☰
            </button>
          ) : null}
          {showBack ? (
            <button type="button" className="secondary" onClick={onGoBack}>
              Zurück
            </button>
          ) : null}
          <button type="button" className="link-button app-logo-button" onClick={onGoHome}>
            Grundschutz++
          </button>
        </div>

        <h1 className="app-title">Grundschutz++</h1>

        <div className="app-bar-end">
          {isDesktop ? (
            <select
              className="dataset-select"
              aria-label="Datensatz auswählen"
              value={selectedDatasetId}
              onChange={(event) => onDatasetChange(event.target.value)}
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.label}
                </option>
              ))}
            </select>
          ) : null}

          {!isDesktop ? (
            <button type="button" className="icon-button" aria-label="Suche öffnen" onClick={onOpenSearchOverlay}>
              🔍
            </button>
          ) : null}

          <button
            type="button"
            className="icon-button"
            aria-label="Weitere Aktionen"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            onClick={onToggleOverflow}
          >
            ⋯
          </button>
        </div>
      </div>

      {/* REQ: RESP-01, PD-04 */}
      {isDesktop ? (
        <div className="search-row" aria-label="Suche">
          <div className="search-input-wrap">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearchSubmit(event.currentTarget.value);
                }
              }}
              placeholder="Suche"
              aria-label="Suche"
            />
            <button
              type="button"
              className="icon-button clear-button"
              aria-label="Suche leeren"
              onClick={onSearchClear}
              disabled={!searchValue}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
