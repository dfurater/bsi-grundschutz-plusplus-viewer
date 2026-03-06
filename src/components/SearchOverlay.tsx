import { type FormEvent, type MouseEvent, useEffect, useRef } from "react";
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
 * Responsive search overlay (centered dialog on tablet/desktop, compact top-sheet on mobile).
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
  const titleId = "search-overlay-title";
  const inputId = "search-overlay-input";
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

  function onBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleClear() {
    onClear();
    inputRef.current?.focus();
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <div className="overlay-backdrop" onClick={onBackdropClick}>
      {/* REQ: US-04, RESP-03 */}
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`search-overlay ${isMobile ? "is-mobile" : "is-desktop"}`}
        tabIndex={-1}
      >
        <div className="overlay-header">
          <h2 id={titleId}>Suche</h2>
          <button type="button" className="icon-button" aria-label="Suche schließen" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="overlay-content" role="search" aria-label="Katalog durchsuchen" onSubmit={handleSubmit}>
          <label className="search-field-label" htmlFor={inputId}>
            Suche
          </label>
          <div className="search-input-wrap">
            <input
              id={inputId}
              ref={inputRef}
              type="search"
              value={value}
              placeholder="ID oder Begriff suchen"
              onChange={(event) => onChange(event.target.value)}
            />
            {value ? (
              <button
                type="button"
                className="search-clear-button"
                aria-label="Suchtext leeren"
                title="Suchtext leeren"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleClear}
              >
                ⌫
              </button>
            ) : null}
          </div>

          <button type="submit" className="primary">
            Suche
          </button>
        </form>
      </section>
    </div>
  );
}
