import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
  });
}

/**
 * Keeps keyboard focus inside modal-like containers and restores it on close.
 * REQ: A11y-03, US-04, US-11
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement>, active: boolean, onEscape: () => void) {
  const onEscapeRef = useRef(onEscape);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const trapInitializedRef = useRef(false);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) {
      return;
    }

    if (!trapInitializedRef.current) {
      trapInitializedRef.current = true;
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      /* REQ: A11y-03, US-11 */
      const focusable = getFocusable(container);
      const first = focusable[0];
      if (first) {
        first.focus();
      } else {
        container.focus();
      }
    }

    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const currentFocusable = getFocusable(container);
      if (currentFocusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstItem = currentFocusable[0];
      const lastItem = currentFocusable[currentFocusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstItem || activeElement === container) {
          event.preventDefault();
          lastItem.focus();
        }
        return;
      }

      if (activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("keydown", onKeydown);
    };
  }, [active, containerRef]);

  useEffect(() => {
    if (active || !trapInitializedRef.current) {
      return;
    }

    trapInitializedRef.current = false;
    const previous = restoreFocusRef.current;
    restoreFocusRef.current = null;
    if (previous) {
      previous.focus();
    }
  }, [active]);

  useEffect(() => {
    return () => {
      if (!trapInitializedRef.current) {
        return;
      }
      trapInitializedRef.current = false;
      const previous = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (previous) {
        previous.focus();
      }
    };
  }, []);
}
