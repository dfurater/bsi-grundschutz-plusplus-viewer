import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("rendert Routen-Kontext, Home-Branding und Suchaktion", () => {
    const html = renderToStaticMarkup(
      <AppHeader
        currentLabel="Suche"
        canOpenSearch
        selectedControlCount={0}
        exportingCsv={false}
        onOpenSearchOverlay={vi.fn()}
        onExportCsv={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
        showBack
      />
    );

    expect(html).toContain("Zurück");
    expect(html).toContain("Zur Startseite");
    expect(html).toContain("Regulatory Intelligence Console");
    expect(html).toContain("Suche öffnen");
    expect(html).toContain("Static Viewer - BSI Grundschutz++");
    expect(html).not.toContain("theme-toggle-button");
    expect(html).not.toContain("CSV Export");
  });

  it("blendet die Suchaktion aus, wenn kein Overlay geöffnet werden kann", () => {
    const html = renderToStaticMarkup(
      <AppHeader
        currentLabel="Control"
        canOpenSearch={false}
        selectedControlCount={0}
        exportingCsv={false}
        onOpenSearchOverlay={vi.fn()}
        onExportCsv={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
        showBack={false}
      />
    );

    expect(html).toContain("Control");
    expect(html).not.toContain("Suche öffnen");
  });

  it("zeigt Exportaktion und Zähler bei ausgewählten Controls", () => {
    const html = renderToStaticMarkup(
      <AppHeader
        currentLabel="Suche"
        canOpenSearch
        selectedControlCount={3}
        exportingCsv={false}
        onOpenSearchOverlay={vi.fn()}
        onExportCsv={vi.fn()}
        onGoHome={vi.fn()}
        onGoBack={vi.fn()}
        showBack={false}
      />
    );

    expect(html).toContain("3 im Export");
    expect(html).toContain("CSV Export (3)");
    expect(html).toContain("Ausgewählte Controls als CSV herunterladen");
  });
});
