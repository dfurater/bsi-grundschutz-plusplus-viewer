import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FacetPanel } from "./FacetPanel";

describe("FacetPanel", () => {
  it("rendert Sort-Dropdown im Filterbereich", () => {
    const html = renderToStaticMarkup(
      <FacetPanel
        facets={{
          topGroupId: [{ value: "APP", count: 3 }],
          groupId: [],
          secLevel: [],
          effortLevel: [],
          class: [],
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
  });
});
