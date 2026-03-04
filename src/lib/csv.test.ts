import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("escaped Kommas, Quotes und Newlines korrekt und nutzt CRLF", () => {
    const csv = toCsv(
      [
        {
          id: "KONF.1",
          text: 'Eintrag mit "Quote", Komma, Semikolon; und\nZeilenumbruch'
        }
      ],
      [
        { key: "id", header: "id" },
        { key: "text", header: "text" }
      ]
    );

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(`id,text\r\nKONF.1,"Eintrag mit ""Quote"", Komma, Semikolon; und\nZeilenumbruch"`);
    expect(csv.includes("\r\n")).toBe(true);
  });

  it("kann ohne BOM erzeugt werden", () => {
    const csv = toCsv(
      [{ value: "abc" }],
      [{ key: "value", header: "value" }],
      { withBom: false }
    );
    expect(csv.startsWith("\uFEFF")).toBe(false);
    expect(csv).toBe("value\r\nabc");
  });

  it("neutralisiert Spreadsheet-Formeln am Zellenanfang", () => {
    const csv = toCsv(
      [{ value: "=HYPERLINK(\"https://evil\")" }],
      [{ key: "value", header: "value" }],
      { withBom: false }
    );
    expect(csv).toBe(`value\r\n"'=HYPERLINK(""https://evil"")"`);
  });
});
