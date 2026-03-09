// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GroupPage } from "./GroupPage";
import type { GroupNode, SearchResultItem } from "../types";

function createGroup(overrides?: Partial<GroupNode>): GroupNode {
  return {
    id: "APP.1",
    title: "Applikationssicherheit",
    altIdentifier: null,
    label: null,
    parentGroupId: "APP",
    topGroupId: "APP",
    pathIds: ["APP", "APP.1"],
    pathTitles: ["Root", "Applikationssicherheit"],
    depth: 2,
    ...overrides
  };
}

function createControl(id: string): SearchResultItem {
  return {
    id,
    title: `Control ${id}`,
    score: 1,
    topGroupId: "APP",
    groupId: "APP.1",
    class: null,
    secLevel: "normal",
    effortLevel: "1",
    modalverbs: ["MUSS"],
    targetObjects: [],
    tags: ["basis"],
    snippet: "Control Beschreibung",
    breadcrumbs: ["APP", "APP.1"]
  };
}

function createControls(count: number): SearchResultItem[] {
  return Array.from({ length: count }, (_, index) => createControl(`APP.${index + 1}`));
}

function buildProps(overrides: Partial<ComponentProps<typeof GroupPage>> = {}): ComponentProps<typeof GroupPage> {
  return {
    group: createGroup(),
    subgroups: [],
    controls: [],
    selectedControlIds: new Set<string>(),
    loading: false,
    selectingAllControls: false,
    allControlsSelected: false,
    onOpenSubgroup: vi.fn(),
    onOpenControl: vi.fn(),
    onToggleControlSelection: vi.fn(),
    onSelectAllControls: vi.fn(),
    ...overrides
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderGroupPage(props: ComponentProps<typeof GroupPage>) {
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }

  await act(async () => {
    root?.render(<GroupPage {...props} />);
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

describe("GroupPage interactions", () => {
  it("zeigt Fehlerzustand wenn Gruppe fehlt", async () => {
    await renderGroupPage(buildProps({ group: null }));

    expect(document.body.textContent).toContain("Gruppe nicht gefunden.");
  });

  it("zeigt Ladehinweis während Gruppen-Controls nachgeladen werden", async () => {
    await renderGroupPage(buildProps({ loading: true }));
    expect(document.body.textContent).toContain("Controls werden geladen…");
  });

  it("löst Callback-Flows für Breadcrumbs, Untergruppen, Controls und Checkboxen aus", async () => {
    const onOpenSubgroup = vi.fn();
    const onOpenControl = vi.fn();
    const onToggleControlSelection = vi.fn();
    const controls = [createControl("APP.1")];

    await renderGroupPage(
      buildProps({
        subgroups: [createGroup({ id: "APP.1.1", title: "Untergruppe A", depth: 3 })],
        controls,
        onOpenSubgroup,
        onOpenControl,
        onToggleControlSelection
      })
    );

    const breadcrumbButton = document.querySelector<HTMLButtonElement>(".breadcrumb-link");
    if (!breadcrumbButton) {
      throw new Error("Breadcrumb-Button fehlt");
    }
    await clickElement(breadcrumbButton);

    const subgroupTile = document.querySelector<HTMLButtonElement>("button.group-tile");
    if (!subgroupTile) {
      throw new Error("Untergruppen-Button fehlt");
    }
    await clickElement(subgroupTile);

    const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!checkbox) {
      throw new Error("Checkbox fehlt");
    }
    await clickElement(checkbox);

    const controlButton = document.querySelector<HTMLButtonElement>(".group-control-row button");
    if (!controlButton) {
      throw new Error("Control-Button fehlt");
    }
    await clickElement(controlButton);

    expect(onOpenSubgroup).toHaveBeenCalledWith("APP");
    expect(onOpenSubgroup).toHaveBeenCalledWith("APP.1.1");
    expect(onToggleControlSelection).toHaveBeenCalledWith(controls[0], true);
    expect(onOpenControl).toHaveBeenCalledWith(controls[0]);
  });

  it("paginiert Controls und setzt Pagination beim Gruppenwechsel zurück", async () => {
    const controls = createControls(30);

    await renderGroupPage(buildProps({ controls }));

    expect(document.body.textContent).toContain("APP.25");
    expect(document.body.textContent).not.toContain("APP.26");

    const loadMore = findButtonByExactText("Mehr laden");
    await clickElement(loadMore);

    expect(document.body.textContent).toContain("APP.26");

    await renderGroupPage(
      buildProps({
        group: createGroup({ id: "APP.2", title: "Neue Gruppe", pathIds: ["APP", "APP.2"], pathTitles: ["Root", "Neue Gruppe"] }),
        controls
      })
    );

    expect(document.body.textContent).not.toContain("APP.26");
  });

  it("steuert Select-all-Transitions und ruft den Callback aus", async () => {
    const onSelectAllControls = vi.fn();

    await renderGroupPage(
      buildProps({
        controls: [createControl("APP.1")],
        onSelectAllControls,
        selectingAllControls: false,
        allControlsSelected: false
      })
    );

    const selectAll = findButtonByExactText("Alles auswählen");
    await clickElement(selectAll);
    expect(onSelectAllControls).toHaveBeenCalledTimes(1);

    await renderGroupPage(
      buildProps({
        controls: [createControl("APP.1")],
        onSelectAllControls,
        selectingAllControls: false,
        allControlsSelected: true
      })
    );
    expect(document.body.textContent).toContain("Alles abwählen");

    await renderGroupPage(
      buildProps({
        controls: [createControl("APP.1")],
        onSelectAllControls,
        selectingAllControls: true,
        allControlsSelected: false
      })
    );

    const busy = findButtonByExactText("Alles auswählen...");
    expect(busy.disabled).toBe(true);
  });
});
