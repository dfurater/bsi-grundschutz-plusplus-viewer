import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchOverlay } from "./SearchOverlay";

describe("SearchOverlay", () => {
  it("rendert Dialog mit Suchfeld", () => {
    const html = renderToStaticMarkup(
      <SearchOverlay
        open
        value="abc"
        onChange={vi.fn()}
        onClear={vi.fn()}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("aria-modal=\"true\"");
    expect(html).toContain("ID oder Begriff suchen");
    expect(html).toContain("Suche leeren");
  });
});
