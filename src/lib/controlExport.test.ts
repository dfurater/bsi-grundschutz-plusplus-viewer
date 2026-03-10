import { describe, expect, it } from "vitest";
import { CONTROL_EXPORT_COLUMNS, extractControlExportRow } from "./controlExport";
import { toCsv } from "./csv";
import type { ControlDetail } from "../types";

function makeControlDetail(overrides: Partial<ControlDetail> = {}): ControlDetail {
  return {
    id: "KONF.1",
    title: "Titel",
    class: null,
    topGroupId: "KONF",
    parentGroupId: "KONF",
    parentControlId: null,
    controlDepth: 1,
    groupPathIds: ["KONF"],
    groupPathTitles: ["Konfiguration"],
    controlPathIds: ["KONF.1"],
    controlPathTitles: ["Titel"],
    pathIds: ["KONF", "KONF.1"],
    breadcrumbs: ["Konfiguration", "Titel"],
    statementText: "Statement",
    guidanceText: "Guidance",
    props: [],
    propsMap: {},
    params: [],
    parts: [],
    tags: [],
    modalverbs: [],
    targetObjects: [],
    secLevel: null,
    effortLevel: null,
    links: [],
    relationsOutgoing: [],
    relationsIncoming: [],
    ...overrides
  };
}

describe("extractControlExportRow", () => {
  it("filtert unsichere und obfuskierte Link-Schemes aus dem Export", () => {
    const detail = makeControlDetail({
      links: [
        { rel: "source", href: "https://example.org/a" },
        { rel: "source", href: "http://example.org/plain" },
        { rel: "source", href: "https://example.org/a" },
        { rel: "source", href: " javascript:alert(1)" },
        { rel: "source", href: "javascrıpt:alert(1)" },
        { rel: "source", href: "data:text/plain,abc" },
        { rel: "source", href: "blob:https://example.org/123" },
        { rel: "source", href: "file:///etc/passwd" },
        { rel: "source", href: "https://user:pass@example.org/secret" },
        { rel: "source", href: "\u0000https://example.org/rejected" }
      ]
    });

    const row = extractControlExportRow(detail, {
      sourceVersion: "1.0.0",
      sourceLastModified: "2026-03-04"
    });

    expect(row.links).toBe("https://example.org/a; http://example.org/plain");
  });

  it("haertet den Exportpfad Detail -> Row -> CSV gegen Formula-Injection", () => {
    const detail = makeControlDetail({
      id: "=APP.1",
      title: "\u0000+Titel",
      groupPathTitles: ["\u2007@Gruppe"],
      class: "-klasse",
      secLevel: "＝hoch",
      effortLevel: "|niedrig",
      statementText: "\u0001=SUM(A1:A2)",
      guidanceText: "＝leitlinie",
      propsMap: {
        handlungsworte: ["\t+handeln"]
      },
      params: [
        {
          id: "=p1",
          label: "Intervall",
          values: ["30d"],
          props: []
        }
      ],
      tags: ["\u001B@tag"],
      modalverbs: ["=MUSS"],
      links: [
        { rel: "source", href: "https://example.org/security" },
        { rel: "source", href: "javascript:alert(1)" },
        { rel: "source", href: "data:text/plain,abc" }
      ]
    });

    const row = extractControlExportRow(detail, {
      sourceVersion: "-1.0.0",
      sourceLastModified: "@2026-03-10"
    });

    const formulaSensitiveColumns = CONTROL_EXPORT_COLUMNS.filter((column) => column.key !== "links");
    for (const column of formulaSensitiveColumns) {
      const csv = toCsv([{ value: row[column.key] }], [{ key: "value", header: column.header }], { withBom: false });
      const dataLine = csv.split("\r\n")[1];
      expect(dataLine).toBe(`'${row[column.key]}`);
    }

    const linksCsv = toCsv([{ value: row.links }], [{ key: "value", header: "links" }], { withBom: false });
    expect(linksCsv).toBe("links\r\nhttps://example.org/security");
  });

  it("liefert leere Felder bei fehlenden Daten", () => {
    const detail = makeControlDetail({
      class: null,
      secLevel: null,
      effortLevel: null,
      tags: [],
      params: [],
      links: []
    });

    const row = extractControlExportRow(detail, {
      sourceVersion: null,
      sourceLastModified: null
    });

    expect(row.class).toBe("");
    expect(row.sec_level).toBe("");
    expect(row.effort_level).toBe("");
    expect(row.params).toBe("");
    expect(row.links).toBe("");
    expect(row.source_version).toBe("");
    expect(row.source_last_modified).toBe("");
  });

  it("joint Listenfelder korrekt", () => {
    const detail = makeControlDetail({
      tags: ["tag-a", "tag-b"],
      modalverbs: ["MUSS", "SOLL"],
      propsMap: {
        handlungsworte: ["pruefen", "dokumentieren"]
      },
      params: [
        {
          id: "p1",
          label: "Intervall",
          values: ["30 Tage"],
          props: []
        },
        {
          id: "p2",
          label: "Verantwortlich",
          values: ["Team A"],
          props: []
        }
      ]
    });

    const row = extractControlExportRow(detail, {
      sourceVersion: "2.0",
      sourceLastModified: "2026-03-04"
    });

    expect(row.tags).toBe("tag-a; tag-b");
    expect(row.modalverb).toBe("MUSS; SOLL");
    expect(row.handlungsworte).toBe("pruefen; dokumentieren");
    expect(row.params).toBe("p1:Intervall=30 Tage; p2:Verantwortlich=Team A");
  });

  it("setzt OSCAL-Param-Templates in Statement und Guidance auf", () => {
    const detail = makeControlDetail({
      statementText:
        "Berechtigung SOLLTE vergebene Berechtigungen {{ insert: param, ber.5.3-prm1 }} auf Erforderlichkeit überprüfen.",
      guidanceText: "Intervall: {{ insert: param, BER.5.3-PRM1 }}.",
      params: [
        {
          id: "ber.5.3-prm1",
          label: "Intervall",
          values: ["regelmäßig"],
          props: []
        }
      ]
    });

    const row = extractControlExportRow(detail, {
      sourceVersion: "2.0",
      sourceLastModified: "2026-03-04"
    });

    expect(row.statement).toBe("Berechtigung SOLLTE vergebene Berechtigungen regelmäßig auf Erforderlichkeit überprüfen.");
    expect(row.guidance).toBe("Intervall: regelmäßig.");
  });
});
