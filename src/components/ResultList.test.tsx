// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultList } from "./ResultList";
import type { SearchResultItem } from "../types";
import type { ComponentProps } from "react";

function createItem(id: string, snippet = "Firewall Härtung erforderlich"): SearchResultItem {
  return {
    id,
    title: `Titel ${id}`,
    score: 1,
    topGroupId: "APP",
    groupId: "APP.1",
    class: null,
    secLevel: "hoch",
    effortLevel: "2",
    modalverbs: ["SOLL"],
    targetObjects: [],
    tags: ["netzwerk"],
    snippet,
    breadcrumbs: ["APP", "APP.1"]
  };
}

function createItems(count: number): SearchResultItem[] {
  return Array.from({ length: count }, (_, index) => createItem(`APP.${index + 1}`));
}

function buildProps(overrides: Partial<ComponentProps<typeof ResultList>> = {}): ComponentProps<typeof ResultList> {
  return {
    items: [],
    total: 0,
    query: "",
    page: 1,
    pageSize: 50,
    selectedId: null,
    selectedControlIds: new Set<string>(),
    loading: false,
    error: null,
    onSelect: vi.fn(),
    onPageChange: vi.fn(),
    onToggleSelection: vi.fn(),
    onSelectAllControls: vi.fn(),
    selectingAllControls: false,
    allControlsSelected: false,
    hasActiveFilters: false,
    ...overrides
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderResultList(props: ComponentProps<typeof ResultList>) {
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }

  await act(async () => {
    root?.render(<ResultList {...props} />);
  });
}

async function cleanupRender() {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  if (container?.isConnected) {
    container.remove();
  }
  container = null;
}

function findButtonByExactText(text: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (entry) => entry.textContent?.trim() === text
  );
  if (!button) {
    throw new Error(`Button nicht gefunden: ${text}`);
  }
  return button;
}

async function clickElement(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
}

beforeEach(() => {
  Reflect.set(globalThis as Record<string, unknown>, "IS_REACT_ACT_ENVIRONMENT", true);
  document.body.innerHTML = "";
});

afterEach(async () => {
  await cleanupRender();
  vi.restoreAllMocks();
});

describe("ResultList interactions", () => {
  it("zeigt Lade- und Fehlerzustand mit Fokusankern", async () => {
    await renderResultList(buildProps({ loading: true }));
    expect(document.body.textContent).toContain("Index wird abgefragt…");
    expect(document.querySelector('[data-search-results-focus="loading"]')).not.toBeNull();

    await renderResultList(buildProps({ loading: false, error: "Worker ist nicht erreichbar." }));
    expect(document.body.textContent).toContain("Worker ist nicht erreichbar.");
    expect(document.querySelector('[data-search-results-focus="status"]')).not.toBeNull();
  });

  it("löst Auswahl-Callbacks für Card-Klick und Checkbox aus", async () => {
    const onSelect = vi.fn();
    const onToggleSelection = vi.fn();
    const item = createItem("APP.1");

    await renderResultList(
      buildProps({
        items: [item],
        total: 1,
        onSelect,
        onToggleSelection
      })
    );

    const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!checkbox) {
      throw new Error("Checkbox fehlt");
    }

    await clickElement(checkbox);

    const cardButton = document.querySelector<HTMLButtonElement>("button.result-card");
    if (!cardButton) {
      throw new Error("Result-Card fehlt");
    }

    await clickElement(cardButton);

    expect(onToggleSelection).toHaveBeenCalledWith(item, true);
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  it("navigiert über Seitenwechsel und rendert den jeweils aktiven Ausschnitt", async () => {
    const items = createItems(30);
    const onPageChange = vi.fn();

    await renderResultList(
      buildProps({
        items,
        total: 30,
        query: "firewall",
        page: 1,
        pageSize: 25,
        onPageChange
      })
    );

    expect(document.body.textContent).toContain("APP.25");
    expect(document.body.textContent).not.toContain("APP.26");

    const nextPageButton = findButtonByExactText("Nächste Seite");
    await clickElement(nextPageButton);
    expect(onPageChange).toHaveBeenCalledWith(2);

    await renderResultList(
      buildProps({
        items,
        total: 30,
        query: "firewall",
        page: 2,
        pageSize: 25
      })
    );

    expect(document.body.textContent).toContain("APP.26");
    expect(document.body.textContent).not.toContain("APP.25");

    await renderResultList(
      buildProps({
        items,
        total: 30,
        query: "netz",
        page: 1,
        pageSize: 25
      })
    );

    expect(document.body.textContent).not.toContain("APP.26");
  });

  it("zeigt Empty-State mit Filter-Reset und ruft Reset-Callback auf", async () => {
    const onResetFilters = vi.fn();

    await renderResultList(
      buildProps({
        items: [],
        total: 0,
        query: "  Firewall  ",
        hasActiveFilters: true,
        onResetFilters
      })
    );

    expect(document.body.textContent).toContain("Keine Treffer");
    expect(document.body.textContent).toContain("Keine Ergebnisse für „Firewall“.");

    const resetButton = findButtonByExactText("Filter zurücksetzen");
    await clickElement(resetButton);

    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it("zeigt generischen Empty-State ohne Reset-Aktion bei inaktiven Filtern", async () => {
    await renderResultList(
      buildProps({
        items: [],
        total: 0,
        query: "   ",
        hasActiveFilters: false
      })
    );

    expect(document.body.textContent).toContain("Keine Ergebnisse. Passe Suche oder Filter an.");
    const resetButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((entry) =>
      entry.textContent?.includes("Filter zurücksetzen")
    );
    expect(resetButton).toBeUndefined();
  });

  it("rendert Selektionszustände und optionale Chip-Branches in Ergebnis-Karten", async () => {
    const item: SearchResultItem = {
      ...createItem("APP.1", ""),
      secLevel: null,
      effortLevel: null,
      modalverbs: []
    };

    await renderResultList(
      buildProps({
        items: [item],
        total: 1,
        selectedId: "APP.1",
        selectedControlIds: new Set<string>(["APP.1"])
      })
    );

    const selectedCard = document.querySelector<HTMLButtonElement>("button.result-card.selected");
    expect(selectedCard).not.toBeNull();
    expect(document.querySelector(".result-card-shell.export-selected")).not.toBeNull();
    expect(document.querySelectorAll(".chip").length).toBe(0);
  });

  it("steuert Select-all-Zustände und ruft den Callback aus", async () => {
    const onSelectAllControls = vi.fn();
    const item = createItem("APP.1");

    await renderResultList(
      buildProps({
        items: [item],
        total: 1,
        onSelectAllControls,
        selectingAllControls: false,
        allControlsSelected: false
      })
    );

    const selectAllButton = findButtonByExactText("Alles auswählen");
    await clickElement(selectAllButton);
    expect(onSelectAllControls).toHaveBeenCalledTimes(1);

    await renderResultList(
      buildProps({
        items: [item],
        total: 1,
        onSelectAllControls,
        selectingAllControls: false,
        allControlsSelected: true
      })
    );
    expect(document.body.textContent).toContain("Alles abwählen");

    await renderResultList(
      buildProps({
        items: [item],
        total: 1,
        onSelectAllControls,
        selectingAllControls: true,
        allControlsSelected: false
      })
    );

    const busyButton = findButtonByExactText("Alles auswählen...");
    expect(busyButton.disabled).toBe(true);
  });
});
