import { type ReactNode, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface FilterSheetProps {
  open: boolean;
  title: string;
  variant: "filter" | "detail";
  onClose: () => void;
  children: ReactNode;
}

/**
 * Mobile and tablet overlay container for filters and detail panels.
 */
export function FilterSheet({ open, title, variant, onClose, children }: FilterSheetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useFocusTrap(containerRef, open, onClose);

  if (!open) {
    return null;
  }

  let modeClass = "mode-drawer";
  if (variant === "filter") {
    modeClass = isMobile ? "mode-bottom" : "mode-drawer";
  } else {
    modeClass = isDesktop ? "mode-drawer" : isMobile ? "mode-full" : "mode-overlay";
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`filter-sheet ${modeClass}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div>
            <div className="ds-section-tag">{variant === "filter" ? "Filter" : "Detail"}</div>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label={`${title} schließen`} onClick={onClose}>
            <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="sheet-content">{children}</div>
      </section>
    </div>
  );
}
