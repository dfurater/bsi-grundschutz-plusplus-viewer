interface AppHeaderProps {
  isTabletUp: boolean;
  isShrunk: boolean;
  searchOverlayOpen: boolean;
  datasets: Array<{ id: string; label: string }>;
  selectedDatasetId: string;
  overflowOpen: boolean;
  onDatasetChange: (datasetId: string) => void;
  onOpenSearchOverlay: () => void;
  onToggleOverflow: () => void;
  onGoHome: () => void;
  onGoBack: () => void;
  showBack: boolean;
}

/**
 * Single-line global app bar with primary actions only.
 * REQ: PD-01, PD-02, PD-07, RESP-01, US-01
 */
export function AppHeader({
  isTabletUp,
  isShrunk,
  searchOverlayOpen,
  datasets,
  selectedDatasetId,
  overflowOpen,
  onDatasetChange,
  onOpenSearchOverlay,
  onToggleOverflow,
  onGoHome,
  onGoBack,
  showBack
}: AppHeaderProps) {
  return (
    <header className={`app-header-shell ${isShrunk ? "is-shrunk" : ""}`}>
      {/* REQ: PD-01, PD-07, 4.4.1 */}
      <div className="app-bar" aria-label="App-Bar">
        <div className="app-bar-start">
          {showBack ? (
            <button type="button" className="secondary" onClick={onGoBack}>
              Zurück
            </button>
          ) : null}
          <button
            type="button"
            className="icon-button app-home-button"
            aria-label="Zur Startseite"
            title="Startseite"
            onClick={onGoHome}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M4 11.6 12 5l8 6.6v7.4a1 1 0 0 1-1 1h-4.8v-5.4h-4.4V20H5a1 1 0 0 1-1-1v-7.4Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {isTabletUp ? (
            <button
              type="button"
              className="search-trigger-field"
              aria-label="Suche öffnen"
              aria-haspopup="dialog"
              aria-expanded={searchOverlayOpen}
              onClick={onOpenSearchOverlay}
            >
              <span className="search-trigger-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    d="M10.5 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm9.2 13.8-3.2-3.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="search-trigger-text">Katalog durchsuchen</span>
            </button>
          ) : (
            <button
              type="button"
              className="icon-button"
              aria-label="Suche öffnen"
              aria-haspopup="dialog"
              aria-expanded={searchOverlayOpen}
              onClick={onOpenSearchOverlay}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M10.5 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm9.2 13.8-3.2-3.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="app-bar-end">
          {isTabletUp ? (
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

          <button
            type="button"
            className="icon-button"
            aria-label="Weitere Aktionen"
            aria-haspopup={isTabletUp ? "menu" : "dialog"}
            aria-expanded={overflowOpen}
            onClick={onToggleOverflow}
          >
            ⋯
          </button>
        </div>
      </div>
    </header>
  );
}
