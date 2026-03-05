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
        importBusy={false}
        theme="light"
        onClose={vi.fn()}
        onGoSource={vi.fn()}
        onGoAbout={vi.fn()}
        onToggleTheme={vi.fn()}
        onExportCsv={vi.fn()}
        onUpload={vi.fn()}
      />
    );

    expect(html).toContain("Info");
    expect(html).toContain("Daten");
    expect(html).toContain("Einstellungen");
    expect(html).not.toContain("CSV exportieren");
    expect(html).toContain("JSON laden");
    expect(html).toContain("Dunkelmodus");
    expect(html).not.toContain("Impressum");
    expect(html).not.toContain("Datenschutz");
    expect(html).not.toContain("Nachtmodus");
  });
});
