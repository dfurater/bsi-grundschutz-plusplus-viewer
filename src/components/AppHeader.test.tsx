import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("rendert Datensatz-Select und Overflow-Trigger", () => {
    const html = renderToStaticMarkup(
      <AppHeader
        isDesktop
        isShrunk={false}
        searchValue=""
        theme="light"
        datasets={[{ id: "anwender", label: "Anwender" }]}
        selectedDatasetId="anwender"
        overflowOpen={false}
        drawerOpen={false}
        onSearchChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        onSearchClear={vi.fn()}
        onDatasetChange={vi.fn()}
        onToggleTheme={vi.fn()}
        onOpenSearchOverlay={vi.fn()}
        onToggleOverflow={vi.fn()}
        onToggleDrawer={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
        showBack
      />
    );

    expect(html).toContain("Datensatz auswählen");
    expect(html).toContain("aria-label=\"Dunkelmodus\"");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("Grundschutz++");
    expect(html).not.toContain("Nachtmodus");
  });
});
