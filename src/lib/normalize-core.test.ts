import { describe, expect, it } from "vitest";
import { normalizeCatalog } from "./normalize-core.js";

const CATALOG_FIXTURE = {
  catalog: {
    uuid: "catalog-1",
    metadata: {
      title: "Fixture Catalog",
      version: "2026.03",
      "last-modified": "2026-03-09",
      "oscal-version": "1.1.2",
      remarks: "fixture metadata",
      props: [{ name: "classification", value: "internal" }],
      parties: [
        {
          uuid: "party-creator",
          name: "Creator Org",
          type: "organization",
          "email-addresses": ["creator@example.org"]
        },
        {
          uuid: "party-fallback",
          name: "Fallback Org",
          type: "organization",
          "email-addresses": ["fallback@example.org"]
        }
      ],
      "responsible-parties": [{ "role-id": "creator", "party-uuids": ["party-creator"] }],
      links: [{ rel: "source", href: "#resource-1" }]
    },
    "back-matter": {
      resources: [
        {
          uuid: "resource-1",
          title: "Source PDF",
          description: "primary source",
          rlinks: [
            {
              href: "https://example.org/source.pdf",
              hashes: [{ algorithm: "sha-256", value: "abc123" }]
            }
          ]
        }
      ]
    },
    groups: [
      {
        id: "OPS",
        title: "Operations",
        props: [
          { name: "alt-identifier", value: "OPS-A" },
          { name: "label", value: "Operations Label" }
        ],
        controls: [
          {
            id: "OPS.1",
            title: "Control One",
            class: "technical",
            props: [
              { name: "tags", value: "alpha, beta" },
              { name: "sec_level", value: "high" },
              { name: "effort_level", value: "medium" }
            ],
            params: [
              {
                id: "param-1",
                label: "Interval",
                values: ["monthly"],
                props: [{ name: "source", value: "fixture" }]
              }
            ],
            parts: [
              {
                id: "part-1",
                name: "statement",
                prose: "Statement text",
                props: [
                  { name: "modalverb", value: "MUST" },
                  { name: "target_objects", value: "Server, Client" }
                ]
              },
              {
                id: "part-2",
                name: "guidance",
                prose: "Guidance text",
                props: [{ name: "modalverb", value: "MUST" }]
              }
            ],
            links: [{ rel: "required", href: "#OPS.2" }],
            controls: [
              {
                id: "OPS.1.1",
                title: "Control Child",
                props: [{ name: "tags", value: "child" }],
                parts: [{ name: "statement", prose: "Child statement text" }]
              }
            ]
          }
        ],
        groups: [
          {
            id: "OPS-SUB",
            title: "Subgroup",
            controls: [
              {
                id: "OPS.2",
                title: "Control Two",
                parts: [{ name: "statement", prose: "Second statement text" }],
                links: [{ rel: "related", href: "https://example.org/external" }]
              }
            ]
          }
        ]
      }
    ]
  }
};

describe("normalizeCatalog", () => {
  it("throws for invalid catalog structure", () => {
    expect(() => normalizeCatalog({ catalog: {} })).toThrowError(
      /Ungueltiges OSCAL-Katalogformat: catalog\.groups fehlt\./
    );
  });

  it("normalizes metadata, groups, controls and relations", () => {
    const normalized = normalizeCatalog(CATALOG_FIXTURE);

    expect(normalized.meta).toMatchObject({
      catalogId: "catalog-1",
      title: "Fixture Catalog",
      version: "2026.03",
      publisher: {
        name: "Creator Org",
        type: "organization",
        email: "creator@example.org",
        uuid: "party-creator"
      }
    });
    expect(normalized.meta.sourceReferences).toEqual([
      {
        rel: "source",
        href: "#resource-1",
        targetUuid: "resource-1",
        title: "Source PDF",
        description: "primary source",
        resolvedHref: "https://example.org/source.pdf",
        hashAlgorithm: "sha-256",
        hashValue: "abc123"
      }
    ]);

    expect(normalized.groups).toHaveLength(2);
    expect(normalized.groupTree).toEqual([
      {
        id: "OPS",
        title: "Operations",
        topGroupId: "OPS",
        children: [{ id: "OPS-SUB", title: "Subgroup", topGroupId: "OPS", children: [] }]
      }
    ]);

    expect(normalized.docs).toHaveLength(3);
    expect(normalized.stats).toEqual({
      topGroupCount: 1,
      groupCount: 2,
      controlCount: 3,
      relationCount: 1,
      controlsWithRelations: 2
    });

    const opsTopGroup = normalized.detailsByTopGroup.OPS;
    expect(opsTopGroup).toBeDefined();
    expect(Object.keys(opsTopGroup.controls)).toEqual(["OPS.1", "OPS.1.1", "OPS.2"]);

    const controlOne = opsTopGroup.controls["OPS.1"];
    expect(controlOne.tags).toEqual(["alpha", "beta"]);
    expect(controlOne.modalverbs).toEqual(["MUST"]);
    expect(controlOne.targetObjects).toEqual(["Server", "Client"]);
    expect(controlOne.relationsOutgoing).toEqual([
      { sourceControlId: "OPS.1", targetControlId: "OPS.2", relType: "required" }
    ]);

    const controlTwo = opsTopGroup.controls["OPS.2"];
    expect(controlTwo.relationsIncoming).toEqual([
      { sourceControlId: "OPS.1", targetControlId: "OPS.2", relType: "required" }
    ]);
  });
});
