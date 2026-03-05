import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("rendert einzeilige Primary-Actions ohne Theme-Button", () => {
    const html = renderToStaticMarkup(
      <AppHeader
        isTabletUp
        isShrunk={false}
        searchOverlayOpen={false}
        datasets={[{ id: "anwender", label: "Anwender" }]}
        selectedDatasetId="anwender"
        overflowOpen={false}
        onDatasetChange={vi.fn()}
        onOpenSearchOverlay={vi.fn()}
        onToggleOverflow={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
        showBack
      />
    );

    expect(html).toContain("Suche öffnen");
    expect(html).toContain("Datensatz auswählen");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("Grundschutz++");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("Dunkelmodus");
    expect(html).not.toContain("Hellmodus");
  });

  it("blendet Datensatz-Auswahl unter 768px im Header aus", () => {
    const html = renderToStaticMarkup(
      <AppHeader
        isTabletUp={false}
        isShrunk={false}
        searchOverlayOpen={false}
        datasets={[{ id: "anwender", label: "Anwender" }]}
        selectedDatasetId="anwender"
        overflowOpen
        onDatasetChange={vi.fn()}
        onOpenSearchOverlay={vi.fn()}
        onToggleOverflow={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
        showBack={false}
      />
    );

    expect(html).toContain("Suche öffnen");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("Datensatz auswählen");
    expect(html).not.toContain("Nachtmodus");
  });
});
