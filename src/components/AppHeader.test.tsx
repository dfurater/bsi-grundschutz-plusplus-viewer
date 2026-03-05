import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("rendert einzeilige Primary-Actions mit Suche links und Theme-Button rechts", () => {
    const html = renderToStaticMarkup(
      <AppHeader
        isTabletUp
        isShrunk={false}
        searchOverlayOpen={false}
        theme="light"
        onOpenSearchOverlay={vi.fn()}
        onToggleTheme={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
        showBack
      />
    );

    expect(html).toContain("Suche öffnen");
    expect(html).toContain("Katalog durchsuchen");
    expect(html).not.toContain("Datensatz auswählen");
    expect(html).not.toContain("Weitere Aktionen");
    expect(html).toContain("Zur Startseite");
    expect(html).not.toContain("Grundschutz++");
    expect(html).not.toContain("<h1");
    expect(html).toContain("Dunkelmodus");
    expect(html).toContain("theme-toggle-button");
    expect(html).toContain("app-bar-end");
  });

  it("rendert unter 768px Suche als Icon und Theme weiterhin im Header", () => {
    const html = renderToStaticMarkup(
      <AppHeader
        isTabletUp={false}
        isShrunk={false}
        searchOverlayOpen={false}
        theme="dark"
        onOpenSearchOverlay={vi.fn()}
        onToggleTheme={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
        showBack={false}
      />
    );

    expect(html).toContain("Suche öffnen");
    expect(html).not.toContain("Katalog durchsuchen");
    expect(html).not.toContain("Weitere Aktionen");
    expect(html).not.toContain("Datensatz auswählen");
    expect(html).toContain("Hellmodus");
  });
});
