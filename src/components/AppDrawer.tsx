import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface AppDrawerProps {
  open: boolean;
  datasets: Array<{ id: string; label: string }>;
  selectedDatasetId: string;
  selectedControlCount: number;
  exportingCsv: boolean;
  importBusy: boolean;
  offline: boolean;
  theme: "light" | "dark";
  onClose: () => void;
  onGoHome: () => void;
  onOpenSearchOverlay: () => void;
  onDatasetChange: (datasetId: string) => void;
  onToggleTheme: () => void;
  onGoSource: () => void;
  onGoAbout: () => void;
  onExportCsv: () => void;
  onUpload: (file: File) => void;
}

/**
 * Mobile/tablet navigation drawer with secondary actions.
 * REQ: PD-08, RESP-01, US-10, K-02
 */
export function AppDrawer({
  open,
  datasets,
  selectedDatasetId,
  selectedControlCount,
  exportingCsv,
  importBusy,
  offline,
  theme,
  onClose,
  onGoHome,
  onOpenSearchOverlay,
  onDatasetChange,
  onToggleTheme,
  onGoSource,
  onGoAbout,
  onExportCsv,
  onUpload
}: AppDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useFocusTrap(drawerRef, open, onClose);

  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      {/* REQ: A11y-03, RESP-01 */}
      <aside
        ref={drawerRef}
        className="app-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation und Aktionen"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <h2>Menü</h2>
          <button type="button" className="icon-button" aria-label="Menü schließen" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className="drawer-nav" aria-label="Navigation">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              onGoHome();
              onClose();
            }}
          >
            Start
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              onOpenSearchOverlay();
              onClose();
            }}
          >
            Suche
          </button>
        </nav>

        <label className="drawer-field">
          Datensatz
          <select value={selectedDatasetId} aria-label="Datensatz auswählen" onChange={(event) => onDatasetChange(event.target.value)}>
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="drawer-actions">
          <button type="button" className="secondary" onClick={onToggleTheme}>
            {theme === "dark" ? "Tagmodus" : "Nachtmodus"}
          </button>

          <p className="menu-status" aria-live="polite">
            Status: {offline ? "Offline" : "Online"}
          </p>

          <button
            type="button"
            className="secondary"
            onClick={onExportCsv}
            disabled={selectedControlCount === 0 || exportingCsv}
          >
            {exportingCsv
              ? "CSV wird erstellt"
              : selectedControlCount > 0
                ? `CSV exportieren (${selectedControlCount})`
                : "CSV exportieren"}
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={importBusy || offline}
            title={offline ? "Import offline nicht verfügbar" : "JSON-Datei laden"}
          >
            {importBusy ? "JSON wird geladen" : "JSON laden"}
          </button>

          <input
            ref={fileRef}
            type="file"
            hidden
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onUpload(file);
              }
              event.currentTarget.value = "";
              onClose();
            }}
          />

          <button
            type="button"
            className="secondary"
            onClick={() => {
              onGoSource();
              onClose();
            }}
          >
            Quellen &amp; Version
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              onGoAbout();
              onClose();
            }}
          >
            About
          </button>
        </div>
      </aside>
    </div>
  );
}
