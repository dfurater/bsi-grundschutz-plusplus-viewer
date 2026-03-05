import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppDrawer } from "./AppDrawer";

describe("AppDrawer", () => {
  it("rendert mobile Overflow-Aktionen inkl. Datensatz-Select", () => {
    const html = renderToStaticMarkup(
      <AppDrawer
        open
        datasets={[{ id: "anwender", label: "Anwender" }]}
        selectedDatasetId="anwender"
        selectedControlCount={0}
        exportingCsv={false}
        onClose={vi.fn()}
        onDatasetChange={vi.fn()}
        onExportCsv={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Datensatz auswählen");
    expect(html).not.toContain("Info");
    expect(html).not.toContain("Quellen &amp; Version");
    expect(html).not.toContain("About");
    expect(html).not.toContain("Dunkelmodus");
    expect(html).not.toContain("Impressum");
    expect(html).not.toContain("Datenschutz");
    expect(html).not.toContain("CSV exportieren");
    expect(html).not.toContain("JSON laden");
  });
});
