import { useEffect, useRef } from "react";

interface OverflowMenuProps {
  open: boolean;
  selectedControlCount: number;
  exportingCsv: boolean;
  onClose: () => void;
  onExportCsv: () => void;
}

/**
 * Grouped secondary-actions overflow menu for desktop/tablet.
 * REQ: PD-08, US-09, US-10, RESP-01
 */
export function OverflowMenu({
  open,
  selectedControlCount,
  exportingCsv,
  onClose,
  onExportCsv
}: OverflowMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

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

        </div>

      </section>
    </div>
  );
}
