interface AppHeaderProps {
  currentLabel: string;
  canOpenSearch: boolean;
  selectedControlCount: number;
  exportingCsv: boolean;
  onOpenSearchOverlay: () => void;
  onExportCsv: () => void;
  onGoHome: () => void;
  onGoBack: () => void;
  showBack: boolean;
}

/**
 * Global console header with route context and primary actions.
 */
export function AppHeader({
  currentLabel,
  canOpenSearch,
  selectedControlCount,
  exportingCsv,
  onOpenSearchOverlay,
  onExportCsv,
  onGoHome,
  onGoBack,
  showBack
}: AppHeaderProps) {
  return (
    <header className="top-header app-header-shell">
      <div className="app-header-primary">
        {showBack ? (
          <button type="button" className="btn btn-ghost btn-sm header-back-button" onClick={onGoBack}>
            Zurück
          </button>
        ) : null}

        <button type="button" className="top-header-logo top-header-logo-button" onClick={onGoHome} aria-label="Zur Startseite">
          <div className="logo-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".5" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".5" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </div>
          <div className="top-header-logo-copy">
            <div className="logo-name">
              BSI Grundschutz<span className="accent-text">++</span>
            </div>
            <div className="logo-sub">Regulatory Intelligence Console</div>
          </div>
        </button>
      </div>

      <div className="header-sep" aria-hidden="true" />
      <span className="header-tag">{currentLabel}</span>
      {selectedControlCount > 0 ? (
        <span className="header-version header-selection-count">{selectedControlCount} im Export</span>
      ) : (
        <span className="header-version">Static Viewer - BSI Grundschutz++</span>
      )}

      <div className="app-header-actions">
        {canOpenSearch ? (
          <button
            type="button"
            className="icon-btn"
            aria-label="Suche öffnen"
            aria-haspopup="dialog"
            onClick={onOpenSearchOverlay}
            title="Suche öffnen"
          >
            <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
              <path d="M9.5 9.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}

        {selectedControlCount > 0 ? (
          <button
            type="button"
            className="btn btn-amber btn-sm"
            onClick={onExportCsv}
            disabled={exportingCsv}
            title="Ausgewählte Controls als CSV herunterladen"
          >
            <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2 9.5h8M6 2v5M3.5 4.5L6 7l2.5-2.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {exportingCsv ? "CSV wird erstellt" : `CSV Export (${selectedControlCount})`}
          </button>
        ) : null}
      </div>
    </header>
  );
}
