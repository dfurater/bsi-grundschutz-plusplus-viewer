import { createHash } from "node:crypto";
import { basename } from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCatalog } from "../src/lib/normalize-core.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "public", "data");
const detailsDir = path.join(outDir, "details");
const legacyDatasetsDir = path.join(outDir, "datasets");
const legacyRegistryPath = path.join(outDir, "catalog-registry.json");
const legacyProfilePath = path.join(outDir, "profile-links.json");
const packageJsonPath = path.join(rootDir, "package.json");
const swTemplatePath = path.join(rootDir, "scripts", "sw.template.js");
const swOutputPath = path.join(rootDir, "public", "sw.js");

const catalogSource = {
  id: "anwender",
  label: "Anwenderkatalog",
  sourcePath: path.join(rootDir, "Kataloge", "Grundschutz++-catalog.json")
};

function uniqSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "de"));
}

function facetOptionsFromDocs(docs) {
  return {
    topGroupId: uniqSorted(docs.map((doc) => doc.facets.topGroupId)),
    secLevel: uniqSorted(docs.map((doc) => doc.facets.secLevel)),
    effortLevel: uniqSorted(docs.map((doc) => doc.facets.effortLevel)),
    class: uniqSorted(docs.map((doc) => doc.facets.class)),
    modalverbs: uniqSorted(docs.flatMap((doc) => doc.facets.modalverbs || [])),
    targetObjects: uniqSorted(docs.flatMap((doc) => doc.facets.targetObjects || [])),
    tags: uniqSorted(docs.flatMap((doc) => doc.facets.tags || [])),
    relationTypes: uniqSorted(docs.flatMap((doc) => doc.facets.relationTypes || []))
  };
}

async function main() {
  const [rawPackageJson, rawSwTemplate, rawCatalog] = await Promise.all([
    readFile(packageJsonPath, "utf8"),
    readFile(swTemplatePath, "utf8"),
    readFile(catalogSource.sourcePath, "utf8")
  ]);
  const pkg = JSON.parse(rawPackageJson);
  const normalized = normalizeCatalog(JSON.parse(rawCatalog));
  const docs = normalized.docs;
  const sourceHash = createHash("sha256").update(rawCatalog).digest("hex");
  const sourceSizeBytes = Buffer.byteLength(rawCatalog, "utf8");

  const buildInfo = {
    buildTimestamp: new Date().toISOString(),
    appVersion: pkg.version,
    indexVersion: "2",
    datasetId: catalogSource.id,
    datasetLabel: catalogSource.label,
    catalogFileName: basename(catalogSource.sourcePath),
    catalogFileSha256: sourceHash,
    catalogFileSizeBytes: sourceSizeBytes
  };

  const metaPayload = {
    ...normalized.meta,
    stats: normalized.stats,
    groups: normalized.groups,
    groupTree: normalized.groupTree,
    buildInfo
  };

  const indexPayload = {
    indexVersion: buildInfo.indexVersion,
    stats: normalized.stats,
    facetOptions: facetOptionsFromDocs(docs),
    docs
  };

  const renderedSw = rawSwTemplate.replace(/__CACHE_VERSION__/g, `${pkg.version}-${sourceHash.slice(0, 12)}`);

  await rm(legacyDatasetsDir, { recursive: true, force: true });
  await rm(legacyRegistryPath, { force: true });
  await rm(legacyProfilePath, { force: true });
  await rm(detailsDir, { recursive: true, force: true });
  await mkdir(detailsDir, { recursive: true });

  const writeTasks = [];
  writeTasks.push(writeFile(path.join(outDir, "catalog-meta.json"), JSON.stringify(metaPayload)));
  writeTasks.push(writeFile(path.join(outDir, "catalog-index.json"), JSON.stringify(indexPayload)));
  writeTasks.push(writeFile(path.join(outDir, "build-info.json"), JSON.stringify(buildInfo)));
  writeTasks.push(writeFile(swOutputPath, renderedSw));

  for (const [topGroupId, data] of Object.entries(normalized.detailsByTopGroup)) {
    writeTasks.push(writeFile(path.join(detailsDir, `${topGroupId}.json`), JSON.stringify(data)));
  }

  await Promise.all(writeTasks);

  process.stdout.write("Catalog assets generated:\n");
  process.stdout.write(
    `- source: ${basename(catalogSource.sourcePath)} (${catalogSource.label})\n`
  );
  process.stdout.write(
    `- controls: ${normalized.stats.controlCount}, groups: ${normalized.stats.groupCount}, relations: ${normalized.stats.relationCount}\n`
  );
  process.stdout.write(`- hash: ${sourceHash.slice(0, 12)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
