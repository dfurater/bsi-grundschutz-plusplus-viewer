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
 * Search dialog adapted from the design-system search head for mobile and quick access.
 */
export function SearchOverlay({ open, value, onChange, onClear, onSubmit, onClose }: SearchOverlayProps) {
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
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <div className="overlay-backdrop" onClick={onBackdropClick}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`search-overlay ${isMobile ? "is-mobile" : "is-desktop"}`}
        tabIndex={-1}
      >
        <div className="overlay-header">
          <div>
            <div className="ds-section-tag">Suche</div>
            <h2 id={titleId}>Katalog durchsuchen</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Suche schließen" onClick={onClose}>
            <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="overlay-content" role="search" aria-label="Katalog durchsuchen" onSubmit={handleSubmit}>
          <div className="c-search-wrapper search-overlay-panel">
            <div className="c-search-head">
              <svg className={`c-search-icon ${value.trim() ? "active" : ""}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 12l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <label className="sr-only" htmlFor={inputId}>
                Suche
              </label>
              <input
                id={inputId}
                ref={inputRef}
                className="c-search-input"
                type="search"
                value={value}
                placeholder="ID oder Begriff suchen"
                onChange={(event) => onChange(event.target.value)}
              />
              {value ? (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Suchtext leeren"
                  title="Suchtext leeren"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleClear}
                >
                  <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}
              <button type="submit" className="btn btn-primary btn-sm">
                Suche
              </button>
            </div>
          </div>
          <p className="overlay-helper">IDs, Titel und Schlagwörter werden lokal im Viewer durchsucht.</p>
        </form>
      </section>
    </div>
  );
}
