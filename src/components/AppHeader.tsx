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
          <button type="button" className="link-button app-logo-button" onClick={onGoHome}>
            Grundschutz++
          </button>
        </div>

        <div className="app-bar-end">
          <button
            type="button"
            className="icon-button"
            aria-label="Suche öffnen"
            aria-haspopup="dialog"
            aria-expanded={searchOverlayOpen}
            onClick={onOpenSearchOverlay}
          >
            🔍
          </button>

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
