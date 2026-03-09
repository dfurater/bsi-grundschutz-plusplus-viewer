import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultList } from "./ResultList";
import type { SearchResultItem } from "../types";

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

describe("ResultList", () => {
  it("zeigt einen Ladezustand waehrend laufender Suche", () => {
    const html = renderToStaticMarkup(
      <ResultList
        items={[]}
        total={0}
        query=""
        selectedId={null}
        selectedControlIds={new Set<string>()}
        loading
        error={null}
        onSelect={vi.fn()}
        onToggleSelection={vi.fn()}
        onSelectAllControls={vi.fn()}
        selectingAllControls={false}
        allControlsSelected={false}
        hasActiveFilters={false}
      />
    );

    expect(html).toContain("Index wird abgefragt…");
    expect(html).toContain('data-search-results-focus="loading"');
  });

  it("zeigt Fehlerzustand fuer fehlgeschlagene Suche", () => {
    const html = renderToStaticMarkup(
      <ResultList
        items={[]}
        total={0}
        query=""
        selectedId={null}
        selectedControlIds={new Set<string>()}
        loading={false}
        error="Worker ist nicht erreichbar."
        onSelect={vi.fn()}
        onToggleSelection={vi.fn()}
        onSelectAllControls={vi.fn()}
        selectingAllControls={false}
        allControlsSelected={false}
        hasActiveFilters={false}
      />
    );

    expect(html).toContain("Worker ist nicht erreichbar.");
    expect(html).toContain('role="alert"');
  });

  it("zeigt Empty-State inkl. Filter-Reset nur bei aktiven Filtern", () => {
    const html = renderToStaticMarkup(
      <ResultList
        items={[]}
        total={0}
        query="  Firewall  "
        selectedId={null}
        selectedControlIds={new Set<string>()}
        loading={false}
        error={null}
        onSelect={vi.fn()}
        onToggleSelection={vi.fn()}
        onSelectAllControls={vi.fn()}
        selectingAllControls={false}
        allControlsSelected={false}
        hasActiveFilters
        onResetFilters={vi.fn()}
      />
    );

    expect(html).toContain("Keine Treffer");
    expect(html).toContain("Keine Ergebnisse für „Firewall“.");
    expect(html).toContain("Filter zurücksetzen");
  });

  it("rendert Ergebnisliste mit initialem Paging und Treffer-Markierung", () => {
    const items = createItems(30);
    const html = renderToStaticMarkup(
      <ResultList
        items={items}
        total={30}
        query="firewall"
        selectedId="APP.2"
        selectedControlIds={new Set<string>(["APP.1"])}
        loading={false}
        error={null}
        onSelect={vi.fn()}
        onToggleSelection={vi.fn()}
        onSelectAllControls={vi.fn()}
        selectingAllControls={false}
        allControlsSelected={false}
        hasActiveFilters={false}
      />
    );

    expect(html).toContain("30 Treffer");
    expect(html).toContain("APP.1");
    expect(html).toContain("APP.25");
    expect(html).not.toContain("APP.26");
    expect(html).toContain("Mehr laden");
    expect(html).toContain("<mark>Firewall</mark>");
    expect(html).toContain("export-selected");
  });

  it("zeigt korrekte Label fuer Select-All-Aktionen", () => {
    const baseProps = {
      items: [createItem("APP.1")],
      total: 1,
      query: "",
      selectedId: null,
      selectedControlIds: new Set<string>(),
      loading: false,
      error: null,
      onSelect: vi.fn(),
      onToggleSelection: vi.fn(),
      onSelectAllControls: vi.fn(),
      hasActiveFilters: false
    };

    const selectingHtml = renderToStaticMarkup(
      <ResultList {...baseProps} selectingAllControls allControlsSelected={false} />
    );
    const selectedHtml = renderToStaticMarkup(
      <ResultList {...baseProps} selectingAllControls={false} allControlsSelected />
    );

    expect(selectingHtml).toContain("Alles auswählen...");
    expect(selectedHtml).toContain("Alles abwählen");
  });
});
