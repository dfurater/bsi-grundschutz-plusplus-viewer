import { useEffect, useRef } from "react";

interface OverflowMenuProps {
  open: boolean;
  selectedControlCount: number;
  exportingCsv: boolean;
  importBusy: boolean;
  onClose: () => void;
  onGoSource: () => void;
  onGoAbout: () => void;
  onExportCsv: () => void;
  onUpload: (file: File) => void;
}

/**
 * Secondary-actions overflow menu for desktop/tablet/mobile.
 * REQ: PD-08, US-09, US-10, RESP-01
 */
export function OverflowMenu({
  open,
  selectedControlCount,
  exportingCsv,
  importBusy,
  onClose,
  onGoSource,
  onGoAbout,
  onExportCsv,
  onUpload
}: OverflowMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  if (!open) {
    return null;
  }

  return (
    <div className="overflow-menu-wrap" ref={rootRef}>
      {/* REQ: PD-08, A11y-02 */}
      <section role="menu" aria-label="Sekundäre Aktionen" className="overflow-menu">
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

        <button
          type="button"
          role="menuitem"
          className="secondary"
          onClick={onExportCsv}
          disabled={selectedControlCount === 0 || exportingCsv}
          title={selectedControlCount === 0 ? "Mindestens ein Control auswählen" : "Ausgewählte Controls exportieren"}
        >
          {exportingCsv
            ? "CSV wird erstellt"
            : selectedControlCount > 0
              ? `CSV exportieren (${selectedControlCount})`
              : "CSV exportieren"}
        </button>

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
      </section>
    </div>
  );
}
