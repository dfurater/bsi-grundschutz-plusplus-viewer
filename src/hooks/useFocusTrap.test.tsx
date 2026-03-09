// @vitest-environment jsdom

import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "./useFocusTrap";

interface HarnessProps {
  active: boolean;
  onEscape: () => void;
  includeFocusable?: boolean;
}

function FocusTrapHarness({ active, onEscape, includeFocusable = true }: HarnessProps) {
  const trapRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(trapRef, active, onEscape);

  return (
    <div>
      <section data-testid="trap" ref={trapRef} tabIndex={-1}>
        {includeFocusable ? (
          <>
            <button type="button" data-testid="first">
              first
            </button>
            <button type="button" data-testid="last">
              last
            </button>
          </>
        ) : null}
      </section>
    </div>
  );
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function mountHarness(props: HarnessProps) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<FocusTrapHarness {...props} />);
  });
}

async function rerenderHarness(props: HarnessProps) {
  await act(async () => {
    root?.render(<FocusTrapHarness {...props} />);
  });
}

async function unmountHarness() {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
    root = null;
  }
  if (container?.isConnected) {
    container.remove();
  }
  container = null;
}

function queryByTestId(testId: string) {
  return document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
}

function dispatchKey(key: string, shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(event);
  return event.defaultPrevented;
}

async function waitForFocus(target: HTMLElement, timeoutMs = 600) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (document.activeElement === target) {
      return;
    }
    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  }
  throw new Error("focus timeout");
}

beforeEach(() => {
  Reflect.set(globalThis as Record<string, unknown>, "IS_REACT_ACT_ENVIRONMENT", true);
  document.body.innerHTML = "";
});

afterEach(async () => {
  await unmountHarness();
  vi.restoreAllMocks();
});

describe("useFocusTrap", () => {
  it("setzt initial den Fokus und zyklisiert Tab vom letzten auf das erste Element", async () => {
    const onEscape = vi.fn();
    await mountHarness({ active: true, onEscape });

    const first = queryByTestId("first") as HTMLButtonElement;
    const last = queryByTestId("last") as HTMLButtonElement;
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();

    await waitForFocus(first);

    last.focus();
    expect(document.activeElement).toBe(last);

    const prevented = dispatchKey("Tab");
    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(first);
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("unterstuetzt Shift+Tab vom ersten Element oder Container zurück auf das letzte", async () => {
    const onEscape = vi.fn();
    await mountHarness({ active: true, onEscape });

    const trap = queryByTestId("trap") as HTMLElement;
    const first = queryByTestId("first") as HTMLButtonElement;
    const last = queryByTestId("last") as HTMLButtonElement;

    await waitForFocus(first);

    first.focus();
    const fromFirstPrevented = dispatchKey("Tab", true);
    expect(fromFirstPrevented).toBe(true);
    expect(document.activeElement).toBe(last);

    trap.focus();
    const fromContainerPrevented = dispatchKey("Tab", true);
    expect(fromContainerPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it("ruft bei Escape immer den aktuellsten Callback auf", async () => {
    const firstEscape = vi.fn();
    const secondEscape = vi.fn();

    await mountHarness({ active: true, onEscape: firstEscape });

    const firstPrevented = dispatchKey("Escape");
    expect(firstPrevented).toBe(true);
    expect(firstEscape).toHaveBeenCalledTimes(1);

    await rerenderHarness({ active: true, onEscape: secondEscape });

    const secondPrevented = dispatchKey("Escape");
    expect(secondPrevented).toBe(true);
    expect(firstEscape).toHaveBeenCalledTimes(1);
    expect(secondEscape).toHaveBeenCalledTimes(1);
  });

  it("fokussiert den Container bei fehlenden Fokuszielen und blockiert Tab", async () => {
    const onEscape = vi.fn();
    await mountHarness({ active: true, onEscape, includeFocusable: false });

    const trap = queryByTestId("trap") as HTMLElement;
    await waitForFocus(trap);

    const prevented = dispatchKey("Tab");
    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(trap);
  });

  it("stellt Fokus bei Deaktivierung und Unmount wieder her und räumt Listener auf", async () => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "trigger";
    document.body.appendChild(trigger);
    trigger.focus();

    const onEscape = vi.fn();
    await mountHarness({ active: true, onEscape });

    const first = queryByTestId("first") as HTMLButtonElement;
    await waitForFocus(first);

    await rerenderHarness({ active: false, onEscape });
    expect(document.activeElement).toBe(trigger);

    await rerenderHarness({ active: true, onEscape });
    await waitForFocus(first);

    await unmountHarness();
    expect(document.activeElement).toBe(trigger);

    const prevented = dispatchKey("Escape");
    expect(prevented).toBe(false);
    expect(onEscape).not.toHaveBeenCalled();
  });
});
