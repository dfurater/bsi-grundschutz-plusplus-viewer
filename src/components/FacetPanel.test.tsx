import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FacetPanel } from "./FacetPanel";

describe("FacetPanel", () => {
  it("rendert Sort-Dropdown und oeffnet nur die vorgesehenen Gruppen initial", () => {
    const html = renderToStaticMarkup(
      <FacetPanel
        facets={{
          topGroupId: [{ value: "APP", count: 3 }],
          groupId: [],
          secLevel: [{ value: "hoch", count: 2 }],
          effortLevel: [{ value: "2", count: 2 }],
          class: [{ value: "vertraulich", count: 1 }],
          modalverbs: [],
          targetObjects: [],
          tags: [],
          relationTypes: []
        }}
        filters={{
          topGroupId: [],
          groupId: [],
          secLevel: [],
          effortLevel: [],
          class: [],
          modalverbs: [],
          targetObjects: [],
          tags: [],
          relationTypes: []
        }}
        sortBase="relevance"
        sortDirection="asc"
        effortSortEnabled
        onToggle={vi.fn()}
        onSortBaseChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(html).toContain("facet-sort-select");
    expect(html).toContain("Relevanz");
    expect(html).toContain("Filter");
    expect(html).toContain("Top-Gruppen ein- oder ausklappen");
    expect(html).toContain(">APP<");
    expect(html).toContain(">hoch<");
    expect(html).toContain(">2<");
    expect(html).not.toContain(">vertraulich<");
    expect(html).toContain("Zurücksetzen");
  });

  it("haelt Gruppen mit aktiven Filtern sichtbar", () => {
    const html = renderToStaticMarkup(
      <FacetPanel
        facets={{
          topGroupId: [],
          groupId: [],
          secLevel: [],
          effortLevel: [],
          class: [],
          modalverbs: [],
          targetObjects: [],
          tags: [{ value: "netzwerk", count: 2 }],
          relationTypes: []
        }}
        filters={{
          topGroupId: [],
          groupId: [],
          secLevel: [],
          effortLevel: [],
          class: [],
          modalverbs: [],
          targetObjects: [],
          tags: ["netzwerk"],
          relationTypes: []
        }}
        sortBase="relevance"
        sortDirection="asc"
        effortSortEnabled
        onToggle={vi.fn()}
        onSortBaseChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(html).toContain(">netzwerk<");
    expect(html).toContain("c-filter-group-count has-active");
  });
});
