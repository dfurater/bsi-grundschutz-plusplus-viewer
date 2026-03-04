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
const datasetsDir = path.join(outDir, "datasets");
const legacyDetailsDir = path.join(outDir, "details");
const packageJsonPath = path.join(rootDir, "package.json");
const swTemplatePath = path.join(rootDir, "scripts", "sw.template.js");
const swOutputPath = path.join(rootDir, "public", "sw.js");

const catalogSources = [
  {
    id: "anwender",
    label: "Anwenderkatalog",
    sourcePath: path.join(rootDir, "Kataloge", "Grundschutz++-catalog.json")
  },
  {
    id: "kernel",
    label: "BSI Kernel",
    sourcePath: path.join(rootDir, "Kataloge", "BSI-Stand-der-Technik-Kernel-catalog.json")
  },
  {
    id: "methodik",
    label: "BSI Methodik",
    sourcePath: path.join(rootDir, "Kataloge", "BSI-Methodik-Grundschutz++-catalog.json")
  }
];

const profilePath = path.join(rootDir, "Kataloge", "Grundschutz++-profile.json");

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

function toIdSet(docs) {
  return new Set(docs.map((doc) => doc.id));
}

async function writeDataset({ source, normalized, rawCatalog, appVersion, indexVersion }) {
  const docs = normalized.docs;
  const sourceHash = createHash("sha256").update(rawCatalog).digest("hex");
  const sourceSizeBytes = Buffer.byteLength(rawCatalog, "utf8");

  const buildInfo = {
    buildTimestamp: new Date().toISOString(),
    appVersion,
    indexVersion,
    datasetId: source.id,
    datasetLabel: source.label,
    catalogFileName: basename(source.sourcePath),
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

  const datasetOutDir = path.join(datasetsDir, source.id);
  const datasetDetailsDir = path.join(datasetOutDir, "details");
  await mkdir(datasetDetailsDir, { recursive: true });

  const writeTasks = [];
  writeTasks.push(writeFile(path.join(datasetOutDir, "catalog-meta.json"), JSON.stringify(metaPayload)));
  writeTasks.push(writeFile(path.join(datasetOutDir, "catalog-index.json"), JSON.stringify(indexPayload)));
  writeTasks.push(writeFile(path.join(datasetOutDir, "build-info.json"), JSON.stringify(buildInfo)));

  for (const [topGroupId, data] of Object.entries(normalized.detailsByTopGroup)) {
    writeTasks.push(writeFile(path.join(datasetDetailsDir, `${topGroupId}.json`), JSON.stringify(data)));
  }

  await Promise.all(writeTasks);

  return {
    descriptor: {
      id: source.id,
      label: source.label,
      title: normalized.meta.title,
      version: normalized.meta.version,
      lastModified: normalized.meta.lastModified,
      oscalVersion: normalized.meta.oscalVersion,
      sourceFileName: basename(source.sourcePath),
      catalogFileSha256: sourceHash,
      stats: normalized.stats,
      classValues: uniqSorted(docs.map((doc) => doc.class))
    },
    metaPayload,
    indexPayload,
    detailsByTopGroup: normalized.detailsByTopGroup,
    docs
  };
}

function parseProfileAnalysis(profile, datasetDescriptors, datasetDocsById) {
  const profileRoot = profile?.profile ?? {};
  const metadata = profileRoot.metadata ?? {};
  const resources = Array.isArray(profileRoot["back-matter"]?.resources) ? profileRoot["back-matter"].resources : [];
  const resourceByUuid = new Map(resources.map((resource) => [resource.uuid, resource]));

  function resolveDatasetByHref(href) {
    const fileName = basename(String(href || ""));
    return datasetDescriptors.find((dataset) => dataset.sourceFileName === fileName) ?? null;
  }

  const imports = (Array.isArray(profileRoot.imports) ? profileRoot.imports : []).map((entry) => {
    const href = String(entry?.href ?? "");
    const targetUuid = href.startsWith("#") ? href.slice(1) : null;
    const resource = targetUuid ? resourceByUuid.get(targetUuid) : null;
    const rlink = Array.isArray(resource?.rlinks) ? resource.rlinks[0] : null;
    const resolvedDataset = resolveDatasetByHref(rlink?.href ?? href);

    return {
      href,
      targetUuid,
      resourceHref: rlink?.href ?? null,
      hashAlgorithm: Array.isArray(rlink?.hashes) ? rlink.hashes[0]?.algorithm ?? null : null,
      hashValue: Array.isArray(rlink?.hashes) ? rlink.hashes[0]?.value ?? null : null,
      resolvedDatasetId: resolvedDataset?.id ?? null,
      resolvedDatasetLabel: resolvedDataset?.label ?? null,
      resolvedDatasetTitle: resolvedDataset?.title ?? null
    };
  });

  const setParameters = Array.isArray(profileRoot.modify?.["set-parameters"])
    ? profileRoot.modify["set-parameters"].map((param) => ({
        paramId: param?.["param-id"] ?? null,
        label: param?.label ?? null,
        values: Array.isArray(param?.values) ? param.values : []
      }))
    : [];

  const kernelIds = datasetDocsById.kernel ?? new Set();
  const methodikIds = datasetDocsById.methodik ?? new Set();
  const anwenderIds = datasetDocsById.anwender ?? new Set();
  const sourceUnionIds = new Set([...kernelIds, ...methodikIds]);

  let unionMissingInAnwender = 0;
  for (const id of sourceUnionIds) {
    if (!anwenderIds.has(id)) {
      unionMissingInAnwender += 1;
    }
  }

  let anwenderMissingInUnion = 0;
  for (const id of anwenderIds) {
    if (!sourceUnionIds.has(id)) {
      anwenderMissingInUnion += 1;
    }
  }

  return {
    profile: {
      title: metadata.title ?? null,
      version: metadata.version ?? null,
      lastModified: metadata["last-modified"] ?? null,
      oscalVersion: metadata["oscal-version"] ?? null,
      uuid: profileRoot.uuid ?? null
    },
    imports,
    setParameters,
    relationAudit: {
      kernelControlCount: kernelIds.size,
      methodikControlCount: methodikIds.size,
      sourceUnionControlCount: sourceUnionIds.size,
      anwenderControlCount: anwenderIds.size,
      unionMissingInAnwender,
      anwenderMissingInUnion,
      exactUnionMatch: unionMissingInAnwender === 0 && anwenderMissingInUnion === 0
    }
  };
}

async function main() {
  const [rawPackageJson, rawProfile, rawSwTemplate] = await Promise.all([
    readFile(packageJsonPath, "utf8"),
    readFile(profilePath, "utf8"),
    readFile(swTemplatePath, "utf8")
  ]);
  const pkg = JSON.parse(rawPackageJson);

  await rm(datasetsDir, { recursive: true, force: true });
  await rm(legacyDetailsDir, { recursive: true, force: true });
  await mkdir(datasetsDir, { recursive: true });
  await mkdir(legacyDetailsDir, { recursive: true });

  const datasetResults = [];
  for (const source of catalogSources) {
    const rawCatalog = await readFile(source.sourcePath, "utf8");
    const normalized = normalizeCatalog(JSON.parse(rawCatalog));
    const result = await writeDataset({
      source,
      normalized,
      rawCatalog,
      appVersion: pkg.version,
      indexVersion: "2"
    });
    datasetResults.push(result);
  }

  const registry = {
    generatedAt: new Date().toISOString(),
    defaultDatasetId: "anwender",
    datasets: datasetResults.map((result) => result.descriptor)
  };

  const datasetDocsById = Object.fromEntries(datasetResults.map((result) => [result.descriptor.id, toIdSet(result.indexPayload.docs)]));
  const profileAnalysis = parseProfileAnalysis(JSON.parse(rawProfile), registry.datasets, datasetDocsById);

  const defaultDataset = datasetResults.find((result) => result.descriptor.id === registry.defaultDatasetId) ?? datasetResults[0];
  const swVersion = defaultDataset
    ? `${pkg.version}-${defaultDataset.descriptor.catalogFileSha256.slice(0, 12)}`
    : `${pkg.version}-no-data`;
  const renderedSw = rawSwTemplate.replace(/__CACHE_VERSION__/g, swVersion);

  const writeTasks = [];
  writeTasks.push(writeFile(path.join(outDir, "catalog-registry.json"), JSON.stringify(registry)));
  writeTasks.push(writeFile(path.join(outDir, "profile-links.json"), JSON.stringify(profileAnalysis)));
  writeTasks.push(writeFile(swOutputPath, renderedSw));

  if (defaultDataset) {
    writeTasks.push(writeFile(path.join(outDir, "catalog-meta.json"), JSON.stringify(defaultDataset.metaPayload)));
    writeTasks.push(writeFile(path.join(outDir, "catalog-index.json"), JSON.stringify(defaultDataset.indexPayload)));
    writeTasks.push(writeFile(path.join(outDir, "build-info.json"), JSON.stringify(defaultDataset.metaPayload.buildInfo)));
    for (const [topGroupId, data] of Object.entries(defaultDataset.detailsByTopGroup)) {
      writeTasks.push(writeFile(path.join(legacyDetailsDir, `${topGroupId}.json`), JSON.stringify(data)));
    }
  }

  await Promise.all(writeTasks);

  process.stdout.write("Catalog assets generated:\n");
  for (const result of datasetResults) {
    process.stdout.write(
      `- ${result.descriptor.id}: ${result.descriptor.stats.controlCount} controls, ${result.descriptor.stats.groupCount} groups, hash ${result.descriptor.catalogFileSha256.slice(0, 12)}\n`
    );
  }
  process.stdout.write(
    `- profile relation audit: unionMatch=${profileAnalysis.relationAudit.exactUnionMatch}, setParameters=${profileAnalysis.setParameters.length}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
