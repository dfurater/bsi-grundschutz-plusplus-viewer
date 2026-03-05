import { useEffect, useRef } from "react";

interface OverflowMenuProps {
  open: boolean;
  selectedControlCount: number;
  exportingCsv: boolean;
  importBusy: boolean;
  theme: "light" | "dark";
  onClose: () => void;
  onGoSource: () => void;
  onGoAbout: () => void;
  onGoImpressum: () => void;
  onGoDatenschutz: () => void;
  onToggleTheme: () => void;
  onExportCsv: () => void;
  onUpload: (file: File) => void;
}

/**
 * Grouped secondary-actions overflow menu for desktop/tablet.
 * REQ: PD-08, US-09, US-10, RESP-01
 */
export function OverflowMenu({
  open,
  selectedControlCount,
  exportingCsv,
  importBusy,
  theme,
  onClose,
  onGoSource,
  onGoAbout,
  onGoImpressum,
  onGoDatenschutz,
  onToggleTheme,
  onExportCsv,
  onUpload
}: OverflowMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nextThemeLabel = theme === "dark" ? "Hellmodus" : "Dunkelmodus";

  useEffect(() => {
    if (!open) {
      return;
    }

    function onDocumentMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const firstItem = rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overflow-menu-wrap" ref={rootRef}>
      {/* REQ: PD-08, A11y-02 */}
      <section role="menu" aria-label="Sekundäre Aktionen" className="overflow-menu">
        <div className="overflow-menu-group" role="presentation">
          <p className="overflow-group-title">Info</p>
          <button
            type="button"
            role="menuitem"
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
            role="menuitem"
            className="secondary"
            onClick={() => {
              onGoAbout();
              onClose();
            }}
          >
            About
          </button>
        </div>

        <div className="overflow-menu-group" role="presentation">
          <p className="overflow-group-title">Daten</p>
          {selectedControlCount > 0 ? (
            <button
              type="button"
              role="menuitem"
              className="secondary"
              onClick={() => {
                onExportCsv();
                onClose();
              }}
              disabled={exportingCsv}
              title="Ausgewählte Controls exportieren"
            >
              {exportingCsv ? "CSV wird erstellt" : `CSV exportieren (${selectedControlCount})`}
            </button>
          ) : null}

          <button
            type="button"
            role="menuitem"
            className="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importBusy}
            title="JSON-Datei laden"
          >
            {importBusy ? "JSON wird geladen" : "JSON laden"}
          </button>

          <input
            ref={fileInputRef}
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
        </div>

        <div className="overflow-menu-group" role="presentation">
          <p className="overflow-group-title">Einstellungen</p>
          <button
            type="button"
            role="menuitem"
            className="secondary"
            onClick={() => {
              onToggleTheme();
              onClose();
            }}
          >
            {nextThemeLabel}
          </button>
          <button
            type="button"
            role="menuitem"
            className="secondary"
            onClick={() => {
              onGoImpressum();
              onClose();
            }}
          >
            Impressum
          </button>
          <button
            type="button"
            role="menuitem"
            className="secondary"
            onClick={() => {
              onGoDatenschutz();
              onClose();
            }}
          >
            Datenschutz
          </button>
        </div>
      </section>
    </div>
  );
}
