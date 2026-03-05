import { useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface SearchOverlayProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: (valueOverride?: string) => void;
  onClose: () => void;
}

/**
 * Responsive search overlay (centered dialog on tablet/desktop, fullscreen on mobile).
 * REQ: PD-05, US-04, A11y-03, RESP-03
 */
export function SearchOverlay({
  open,
  value,
  onChange,
  onClear,
  onSubmit,
  onClose
}: SearchOverlayProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay-backdrop" onMouseDown={onClose}>
      {/* REQ: US-04, RESP-03 */}
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Suche"
        className={`search-overlay ${isMobile ? "is-mobile" : "is-desktop"}`}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="overlay-header">
          <h2>Suche</h2>
          <button type="button" className="icon-button" aria-label="Suche schließen" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="overlay-content">
          <div className="search-input-wrap">
            <input
              ref={inputRef}
              type="search"
              value={value}
              placeholder="ID oder Begriff suchen"
              aria-label="Suche"
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSubmit(event.currentTarget.value);
                  inputRef.current?.blur();
                }
              }}
            />
            <button
              type="button"
              className="icon-button clear-button"
              aria-label="Suche leeren"
              onClick={onClear}
              disabled={!value}
            >
              ✕
            </button>
          </div>

          <button type="button" className="primary" onClick={() => onSubmit(value)}>
            Suche
          </button>
        </div>
      </section>
    </div>
  );
}
