import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CatalogIndexSchema,
  CatalogMetaSchema,
  DetailChunkSchema
} from "./dataSchemas";
import { validateOrThrow } from "./validation";
import { SECURITY_BUDGETS } from "./securityBudgets";

const rootDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function readJson(relativePath: string) {
  const fullPath = path.join(rootDir, relativePath);
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function findSampleDetailChunkPath() {
  const candidates = ["public/data/details", "public/data/datasets/anwender/details"];
  for (const relativeDir of candidates) {
    const fullDir = path.join(rootDir, relativeDir);
    if (!existsSync(fullDir)) {
      continue;
    }
    const firstJson = readdirSync(fullDir).find((entry) => entry.endsWith(".json"));
    if (firstJson) {
      return path.join(relativeDir, firstJson);
    }
  }
  throw new Error("Kein Detail-Chunk fuer Schema-Test gefunden.");
}

describe("schema validation", () => {
  it("validiert reale Build-Artefakte", () => {
    const index = readJson("public/data/catalog-index.json");
    const meta = readJson("public/data/catalog-meta.json");
    const detailChunk = readJson(findSampleDetailChunkPath());

    expect(() => validateOrThrow(index, CatalogIndexSchema, "index")).not.toThrow();
    expect(() => validateOrThrow(meta, CatalogMetaSchema, "meta")).not.toThrow();
    expect(() => validateOrThrow(detailChunk, DetailChunkSchema, "detail")).not.toThrow();
  });

  it("lehnt uebergrossen Index fail-closed ab", () => {
    const index = readJson("public/data/catalog-index.json");
    const firstDoc = index.docs[0];
    index.docs = new Array(SECURITY_BUDGETS.maxControlCount + 1).fill(firstDoc);
    index.stats.controlCount = SECURITY_BUDGETS.maxControlCount + 1;

    expect(() => validateOrThrow(index, CatalogIndexSchema, "index-budget")).toThrow();
  });
});
