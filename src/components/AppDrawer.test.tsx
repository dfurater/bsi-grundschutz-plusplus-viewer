import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppDrawer } from "./AppDrawer";

describe("AppDrawer", () => {
  it("rendert mobile Overflow-Aktionen ohne Datensatz-Select", () => {
    const html = renderToStaticMarkup(
      <AppDrawer
        open
        selectedControlCount={0}
        exportingCsv={false}
        onClose={vi.fn()}
        onExportCsv={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Keine weiteren Aktionen verfügbar.");
    expect(html).not.toContain("Info");
    expect(html).not.toContain("Quellen &amp; Version");
    expect(html).not.toContain("About");
    expect(html).not.toContain("Dunkelmodus");
    expect(html).not.toContain("Impressum");
    expect(html).not.toContain("Datenschutz");
    expect(html).not.toContain("CSV exportieren");
  });
});
