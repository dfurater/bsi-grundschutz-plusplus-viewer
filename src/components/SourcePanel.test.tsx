import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SourcePanel } from "./SourcePanel";

describe("SourcePanel", () => {
  it("zeigt die Quellen- und Lizenzpflichtinhalte", () => {
    const html = renderToStaticMarkup(<SourcePanel meta={null} />);

    expect(html).toContain("Quellen &amp; Lizenz");
    expect(html).toContain("Herkunft der Inhalte");
    expect(html).toContain("Quelle");
    expect(html).toContain("Creative Commons Attribution-ShareAlike 4.0 International Lizenz");
    expect(html).toContain("Änderungen / technische Aufbereitung");
    expect(html).toContain("Trennung zwischen Code und Inhalt");
    expect(html).toContain("ShareAlike-Hinweis");
  });
});
