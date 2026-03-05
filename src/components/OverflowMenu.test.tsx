import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OverflowMenu } from "./OverflowMenu";

describe("OverflowMenu", () => {
  it("zeigt Export ohne (0)-Botschaft bei leerer Auswahl", () => {
    const html = renderToStaticMarkup(
      <OverflowMenu
        open
        offline={false}
        theme="light"
        selectedControlCount={0}
        exportingCsv={false}
        importBusy={false}
        onClose={vi.fn()}
        onGoSource={vi.fn()}
        onGoAbout={vi.fn()}
        onToggleTheme={vi.fn()}
        onExportCsv={vi.fn()}
        onUpload={vi.fn()}
      />
    );

    expect(html).toContain("CSV exportieren");
    expect(html).not.toContain("CSV exportieren (0)");
  });
});
