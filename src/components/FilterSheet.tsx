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
 * Responsive filter container: off-canvas drawer on tablet, bottom sheet on mobile.
 * REQ: PD-06, US-08, RESP-01
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
      {/* REQ: US-08, A11y-03 */}
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
          <h2>{title}</h2>
          <button type="button" className="icon-button" aria-label={`${title} schließen`} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sheet-content">{children}</div>
      </section>
    </div>
  );
}
