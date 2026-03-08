import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppFooter } from "./AppFooter";

describe("AppFooter", () => {
  it("zeigt Links und JSON-Upload-Aktion im Footer", () => {
    const html = renderToStaticMarkup(<AppFooter importBusy={false} onUpload={vi.fn()} />);

    expect(html).toContain("Stand-der-Technik-Bibliothek des BSI");
    expect(html).toContain("BSI-Quelle");
    expect(html).toContain("CC BY-SA 4.0");
    expect(html).toContain("Quellen &amp; Lizenz");
    expect(html).toContain('href="#/about/license"');
    expect(html).toContain("About");
    expect(html).toContain("Impressum");
    expect(html).toContain("Datenschutz");
    expect(html).toContain("JSON laden");
  });

  it("zeigt Busy-Label waehrend Import", () => {
    const html = renderToStaticMarkup(<AppFooter importBusy onUpload={vi.fn()} />);
    expect(html).toContain("JSON wird geladen");
  });
});
