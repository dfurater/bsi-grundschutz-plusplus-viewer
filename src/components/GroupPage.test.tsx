import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
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
    pathTitles: ["Applikation", "Applikationssicherheit"],
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

describe("GroupPage", () => {
  it("zeigt Fehlerzustand wenn die Gruppe nicht aufgeloest werden kann", () => {
    const html = renderToStaticMarkup(
      <GroupPage
        group={null}
        subgroups={[]}
        controls={[]}
        selectedControlIds={new Set<string>()}
        loading={false}
        selectingAllControls={false}
        allControlsSelected={false}
        onOpenSubgroup={vi.fn()}
        onOpenControl={vi.fn()}
        onToggleControlSelection={vi.fn()}
        onSelectAllControls={vi.fn()}
      />
    );

    expect(html).toContain("Gruppe nicht gefunden.");
    expect(html).toContain("status-box error");
  });

  it("rendert Untergruppen, Controls und initiales Paging", () => {
    const html = renderToStaticMarkup(
      <GroupPage
        group={createGroup()}
        subgroups={[createGroup({ id: "APP.1.1", title: "Sichere Konfiguration", depth: 3 })]}
        controls={createControls(30)}
        selectedControlIds={new Set<string>(["APP.1"])}
        loading={false}
        selectingAllControls={false}
        allControlsSelected={false}
        onOpenSubgroup={vi.fn()}
        onOpenControl={vi.fn()}
        onToggleControlSelection={vi.fn()}
        onSelectAllControls={vi.fn()}
      />
    );

    expect(html).toContain("APP.1 - Applikationssicherheit");
    expect(html).toContain("Untergruppen");
    expect(html).toContain("Sichere Konfiguration");
    expect(html).toContain("APP.25");
    expect(html).not.toContain("APP.26");
    expect(html).toContain("Mehr laden");
    expect(html).toContain("export-selected");
  });

  it("zeigt den Ladehinweis fuer Controls waehrend Gruppenabfrage", () => {
    const html = renderToStaticMarkup(
      <GroupPage
        group={createGroup()}
        subgroups={[]}
        controls={[]}
        selectedControlIds={new Set<string>()}
        loading
        selectingAllControls={false}
        allControlsSelected={false}
        onOpenSubgroup={vi.fn()}
        onOpenControl={vi.fn()}
        onToggleControlSelection={vi.fn()}
        onSelectAllControls={vi.fn()}
      />
    );

    expect(html).toContain("Controls werden geladen…");
  });

  it("zeigt korrekte Label fuer Select-All in Gruppen", () => {
    const baseProps = {
      group: createGroup(),
      subgroups: [],
      controls: [createControl("APP.1")],
      selectedControlIds: new Set<string>(),
      loading: false,
      onOpenSubgroup: vi.fn(),
      onOpenControl: vi.fn(),
      onToggleControlSelection: vi.fn(),
      onSelectAllControls: vi.fn()
    };

    const selectingHtml = renderToStaticMarkup(
      <GroupPage {...baseProps} selectingAllControls allControlsSelected={false} />
    );
    const selectedHtml = renderToStaticMarkup(
      <GroupPage {...baseProps} selectingAllControls={false} allControlsSelected />
    );

    expect(selectingHtml).toContain("Alles auswählen...");
    expect(selectedHtml).toContain("Alles abwählen");
  });
});
