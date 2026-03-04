import { describe, expect, it } from "vitest";
import { extractControlExportRow } from "./controlExport";
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
  it("filtert unsichere Link-Schemes aus dem Export", () => {
    const detail = makeControlDetail({
      links: [
        { rel: "source", href: "https://example.org/a" },
        { rel: "source", href: "javascript:alert(1)" },
        { rel: "source", href: "data:text/plain,abc" }
      ]
    });

    const row = extractControlExportRow(detail, {
      sourceVersion: "1.0.0",
      sourceLastModified: "2026-03-04"
    });

    expect(row.links).toBe("https://example.org/a");
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
});
