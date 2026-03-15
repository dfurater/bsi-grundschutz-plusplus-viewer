import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ControlDetailPanel } from "./ControlDetailPanel";
import type { ControlDetail } from "../types";

function createDetail(): ControlDetail {
  return {
    id: "KONF.1",
    title: "Titel",
    class: null,
    topGroupId: "KONF",
    parentGroupId: "KONF",
    parentControlId: null,
    controlDepth: 1,
    groupPathIds: ["KONF"],
    groupPathTitles: ["Konfiguration"],
    controlPathIds: ["KONF.1"],
    controlPathTitles: ["KONF.1"],
    pathIds: ["KONF", "KONF.1"],
    breadcrumbs: ["Konfiguration", "KONF.1"],
    statementText: "Statement",
    guidanceText: "Guidance",
    props: [],
    propsMap: {},
    params: [],
    parts: [],
    tags: [],
    modalverbs: [],
    targetObjects: [],
    secLevel: null,
    effortLevel: null,
    links: [],
    relationsOutgoing: [],
    relationsIncoming: []
  };
}

describe("ControlDetailPanel", () => {
  it("rendert Back-to-results und expanded Accordions", () => {
    const html = renderToStaticMarkup(
      <ControlDetailPanel
        detail={createDetail()}
        loading={false}
        error={null}
        graphData={null}
        graphLoading={false}
        graphError={null}
        graphHops={1}
        graphFilter="all"
        onGraphHopsChange={vi.fn()}
        onGraphFilterChange={vi.fn()}
        onRelationClick={vi.fn()}
        onPropertyFilterClick={vi.fn()}
        onBreadcrumbGroupClick={vi.fn()}
        onBreadcrumbControlClick={vi.fn()}
        onBackToResults={vi.fn()}
      />
    );

    expect(html).toContain("Zur Ergebnisliste");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("c-accordion-toggle");
    expect(html).toContain("Guidance");
    expect(html).toContain("Relationen");
  });

  it("öffnet alle Accordions initial wenn expandAllByDefault aktiv ist", () => {
    const html = renderToStaticMarkup(
      <ControlDetailPanel
        detail={createDetail()}
        loading={false}
        error={null}
        graphData={null}
        graphLoading={false}
        graphError={null}
        graphHops={1}
        graphFilter="all"
        onGraphHopsChange={vi.fn()}
        onGraphFilterChange={vi.fn()}
        onRelationClick={vi.fn()}
        onPropertyFilterClick={vi.fn()}
        onBreadcrumbGroupClick={vi.fn()}
        onBreadcrumbControlClick={vi.fn()}
        onBackToResults={vi.fn()}
        expandAllByDefault
      />
    );

    expect(html.match(/aria-expanded="true"/g)?.length ?? 0).toBe(4);
    expect(html).toContain("c-accordion-toggle");
  });
});
