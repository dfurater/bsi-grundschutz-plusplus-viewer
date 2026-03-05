import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FilterSheet } from "./FilterSheet";

describe("FilterSheet", () => {
  it("rendert als modaler Container", () => {
    const html = renderToStaticMarkup(
      <FilterSheet open title="Filter" variant="filter" onClose={vi.fn()}>
        <div>Inhalt</div>
      </FilterSheet>
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Filter schließen");
    expect(html).toContain("Inhalt");
  });
});
