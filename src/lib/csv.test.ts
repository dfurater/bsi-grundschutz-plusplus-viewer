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

  it("neutralisiert gefaehrliche Praefixe auch nach Whitespace und Unicode-Normalisierung", () => {
    const csv = toCsv(
      [{ value: "   =1+1" }, { value: "|cmd" }, { value: "＝1+1" }, { value: "'=SAFE" }],
      [{ key: "value", header: "value" }],
      { withBom: false }
    );

    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("'   =1+1");
    expect(lines[2]).toBe("'|cmd");
    expect(lines[3]).toBe("'＝1+1");
    expect(lines[4]).toBe("'=SAFE");
  });

  it("neutralisiert Tab- und Carriage-Return-Praefixe", () => {
    const csv = toCsv(
      [{ value: "\t=1+1" }, { value: "\r=1+1" }],
      [{ key: "value", header: "value" }],
      { withBom: false }
    );

    expect(csv).toContain("value\r\n'\t=1+1\r\n");
    expect(csv).toContain(`\r\n"'\r=1+1"`);
  });

  it("unterstuetzt Semikolon als Delimiter fuer Excel-DE-Import", () => {
    const csv = toCsv(
      [
        {
          id: "BER.5.3",
          statement: "Berechtigung SOLLTE regelmäßig prüfen, dokumentieren"
        }
      ],
      [
        { key: "id", header: "id" },
        { key: "statement", header: "statement" }
      ],
      { withBom: false, delimiter: ";" }
    );

    expect(csv).toBe("id;statement\r\nBER.5.3;Berechtigung SOLLTE regelmäßig prüfen, dokumentieren");
  });
});
