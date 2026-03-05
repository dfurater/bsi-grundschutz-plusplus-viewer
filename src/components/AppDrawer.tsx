import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface AppDrawerProps {
  open: boolean;
  datasets: Array<{ id: string; label: string }>;
  selectedDatasetId: string;
  selectedControlCount: number;
  exportingCsv: boolean;
  importBusy: boolean;
  onClose: () => void;
  onDatasetChange: (datasetId: string) => void;
  onExportCsv: () => void;
  onUpload: (file: File) => void;
}

/**
 * Mobile overflow drawer with grouped secondary actions.
 * REQ: PD-08, RESP-01, US-10, K-02
 */
export function AppDrawer({
  open,
  datasets,
  selectedDatasetId,
  selectedControlCount,
  exportingCsv,
  importBusy,
  onClose,
  onDatasetChange,
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
        aria-label="Weitere Aktionen"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <h2>Weitere Aktionen</h2>
          <button type="button" className="icon-button" aria-label="Menü schließen" onClick={onClose}>
            ✕
          </button>
        </div>

        <section className="drawer-group" aria-label="Daten">
          <h3>Daten</h3>
          <label className="drawer-field">
            Datensatz
            <select
              value={selectedDatasetId}
              aria-label="Datensatz auswählen"
              onChange={(event) => onDatasetChange(event.target.value)}
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.label}
                </option>
              ))}
            </select>
          </label>

          {selectedControlCount > 0 ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onExportCsv();
                onClose();
              }}
              disabled={exportingCsv}
            >
              {exportingCsv ? "CSV wird erstellt" : `CSV exportieren (${selectedControlCount})`}
            </button>
          ) : null}

          <button
            type="button"
            className="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={importBusy}
            title="JSON-Datei laden"
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
        </section>

      </aside>
    </div>
  );
}
