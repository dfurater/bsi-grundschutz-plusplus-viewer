import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OverflowMenu } from "./OverflowMenu";

describe("OverflowMenu", () => {
  it("zeigt gruppierte Aktionen und versteckt CSV bei leerer Auswahl", () => {
    const html = renderToStaticMarkup(
      <OverflowMenu
        open
        selectedControlCount={0}
        exportingCsv={false}
        onClose={vi.fn()}
        onExportCsv={vi.fn()}
      />
    );

    expect(html).toContain("Daten");
    expect(html).not.toContain("Info");
    expect(html).not.toContain("CSV exportieren");
    expect(html).not.toContain("JSON laden");
    expect(html).not.toContain("Quellen &amp; Version");
    expect(html).not.toContain("About");
    expect(html).not.toContain("Dunkelmodus");
    expect(html).not.toContain("Impressum");
    expect(html).not.toContain("Datenschutz");
    expect(html).not.toContain("Nachtmodus");
  });
});
