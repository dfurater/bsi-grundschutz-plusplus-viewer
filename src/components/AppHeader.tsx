interface AppHeaderProps {
  isTabletUp: boolean;
  isShrunk: boolean;
  searchOverlayOpen: boolean;
  secondaryActionsOpen: boolean;
  theme: "light" | "dark";
  selectedControlCount: number;
  exportingCsv: boolean;
  onOpenSearchOverlay: () => void;
  onExportCsv: () => void;
  onToggleSecondaryActions: () => void;
  onToggleTheme: () => void;
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
  secondaryActionsOpen,
  theme,
  selectedControlCount,
  exportingCsv,
  onOpenSearchOverlay,
  onExportCsv,
  onToggleSecondaryActions,
  onToggleTheme,
  onGoHome,
  onGoBack,
  showBack
}: AppHeaderProps) {
  const nextThemeLabel = theme === "dark" ? "Hellmodus" : "Dunkelmodus";

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
          <button
            type="button"
            className={isTabletUp ? "search-trigger-field" : "icon-button"}
            aria-label="Suche öffnen"
            aria-haspopup="dialog"
            aria-expanded={searchOverlayOpen}
            onClick={onOpenSearchOverlay}
          >
            {isTabletUp ? (
              <>
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
              </>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M10.5 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm9.2 13.8-3.2-3.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="app-bar-end">
          {selectedControlCount > 0 ? (
            <button
              type="button"
              className="secondary"
              onClick={onExportCsv}
              disabled={exportingCsv}
              title="Ausgewählte Controls als CSV herunterladen"
            >
              {exportingCsv ? "CSV wird erstellt" : `Export CSV (${selectedControlCount})`}
            </button>
          ) : null}
          {!isTabletUp ? (
            <button
              type="button"
              className="icon-button app-actions-button"
              aria-label="Weitere Aktionen"
              aria-haspopup="dialog"
              aria-expanded={secondaryActionsOpen}
              title="Weitere Aktionen"
              onClick={onToggleSecondaryActions}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d="M5 7.5h14M5 12h14M5 16.5h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            className="icon-button app-theme-button theme-toggle-button"
            aria-label={nextThemeLabel}
            aria-pressed={theme === "dark"}
            title={nextThemeLabel}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 2.8v2.4M12 18.8v2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d="M18.2 14.6a7.2 7.2 0 1 1-8.8-8.8 8 8 0 1 0 8.8 8.8Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {selectedControlCount > 0 ? (
        <p className="app-header-export-note">
          Exportierte Daten basieren auf Inhalten aus der Stand-der-Technik-Bibliothek des BSI (CC BY-SA 4.0).
          Details unter <a href="#/about/license">„Quellen &amp; Lizenz“</a>.
        </p>
      ) : null}
    </header>
  );
}
