import { createHash, getHashes } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_UPSTREAM_REPO = "BSI-Bund/Stand-der-Technik-Bibliothek";
const DEFAULT_UPSTREAM_REF = "main";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_MS = 500;
const DEFAULT_MIN_CONTROL_RATIO = 0.8;

const catalogFileMappings = [
  {
    fileId: "anwender-catalog",
    fileKind: "catalog",
    upstreamPath: "Anwenderkataloge/Grundschutz++/Grundschutz++-catalog.json",
    localPath: "Kataloge/Grundschutz++-catalog.json"
  },
  {
    fileId: "kernel-catalog",
    fileKind: "catalog",
    upstreamPath: "Quellkataloge/Kernel/BSI-Stand-der-Technik-Kernel-catalog.json",
    localPath: "Kataloge/BSI-Stand-der-Technik-Kernel-catalog.json"
  },
  {
    fileId: "methodik-catalog",
    fileKind: "catalog",
    upstreamPath: "Quellkataloge/Methodik-Grundschutz++/BSI-Methodik-Grundschutz++-catalog.json",
    localPath: "Kataloge/BSI-Methodik-Grundschutz++-catalog.json"
  },
  {
    fileId: "grundschutz-profile",
    fileKind: "profile",
    upstreamPath: "Quellkataloge/Methodik-Grundschutz++/Grundschutz++-profile.json",
    localPath: "Kataloge/Grundschutz++-profile.json"
  }
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const supportedHashAlgorithms = new Set(getHashes().map((value) => value.toLowerCase()));
const strongIntegrityAlgorithms = new Set(["sha256", "sha384", "sha512"]);

class SyncError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "SyncError";
    this.kind = options.kind ?? "unknown";
    this.retryable = Boolean(options.retryable);
    this.statusCode = options.statusCode ?? null;
  }
}

function toIntOrDefault(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toFloatOrDefault(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function hashWithAlgorithm(algorithm, text) {
  return createHash(algorithm).update(text).digest("hex");
}

function createApiHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "grundschutz-plusplus-bsi-sync",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function createRawHeaders(token) {
  return {
    "User-Agent": "grundschutz-plusplus-bsi-sync",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function encodePathSegments(filePath) {
  return filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function looksLikeTransientStatus(status) {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function normalizeHashAlgorithm(rawAlgorithm) {
  const normalized = String(rawAlgorithm ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!normalized) {
    return null;
  }

  if (normalized === "sha256") {
    return "sha256";
  }
  if (normalized === "sha384") {
    return "sha384";
  }
  if (normalized === "sha512") {
    return "sha512";
  }

  return supportedHashAlgorithms.has(normalized) ? normalized : null;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(url, headers, parser, description, options) {
  const maxRetries = options.maxRetries;
  const retryBaseMs = options.retryBaseMs;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const body = (await response.text()).slice(0, 400);
        const retryable = looksLikeTransientStatus(response.status);
        throw new SyncError(`${description} failed (${response.status}): ${url}\n${body}`, {
          kind: "api",
          retryable,
          statusCode: response.status
        });
      }

      return await parser(response);
    } catch (error) {
      const classified = classifyFetchError(error, description);
      const hasRetryLeft = attempt < maxRetries;
      if (!classified.retryable || !hasRetryLeft) {
        throw classified;
      }

      const delayMs = retryBaseMs * 2 ** attempt;
      process.stdout.write(
        `Retrying ${description} after ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1}, kind=${classified.kind})\n`
      );
      await sleep(delayMs);
    }
  }

  throw new SyncError(`${description} failed after retries.`, { kind: "network", retryable: false });
}

function classifyFetchError(error, description) {
  if (error instanceof SyncError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new SyncError(`${description} network error: ${error.message}`, {
      kind: "network",
      retryable: true,
      cause: error
    });
  }

  return new SyncError(`${description} unknown error: ${String(error)}`, {
    kind: "network",
    retryable: false,
    cause: error
  });
}

async function fetchJson(url, headers, description, options) {
  return fetchWithRetry(url, headers, (response) => response.json(), description, options);
}

async function fetchText(url, headers, description, options) {
  return fetchWithRetry(url, headers, (response) => response.text(), description, options);
}

function parseJsonOrThrow(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new SyncError(`${label} is not valid JSON.`, {
      kind: "schema",
      retryable: false,
      cause: error
    });
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function countGroups(groups) {
  let count = 0;
  const stack = [...asArray(groups)];
  while (stack.length > 0) {
    const group = stack.pop();
    if (!group || typeof group !== "object") {
      continue;
    }
    count += 1;
    for (const child of asArray(group.groups)) {
      stack.push(child);
    }
  }
  return count;
}

function countControlsFromGroups(groups) {
  let count = 0;
  const stack = [...asArray(groups)];
  while (stack.length > 0) {
    const group = stack.pop();
    if (!group || typeof group !== "object") {
      continue;
    }

    const controls = asArray(group.controls);
    for (const control of controls) {
      if (control && typeof control === "object") {
        count += 1;
        for (const nested of asArray(control.controls)) {
          stack.push({ controls: [nested], groups: [] });
        }
      }
    }

    for (const childGroup of asArray(group.groups)) {
      stack.push(childGroup);
    }
  }
  return count;
}

function extractCatalogRoot(parsed) {
  if (asObject(parsed?.catalog)) {
    return parsed.catalog;
  }
  return asObject(parsed);
}

function extractProfileRoot(parsed) {
  if (asObject(parsed?.profile)) {
    return parsed.profile;
  }
  return asObject(parsed);
}

function compareVersions(a, b) {
  if (!a || !b || a === b) {
    return 0;
  }

  const split = (value) =>
    String(value)
      .split(/[^0-9A-Za-z]+/)
      .filter(Boolean);

  const aParts = split(a);
  const bParts = split(b);
  if (aParts.length > 0 && bParts.length > 0) {
    const length = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < length; i += 1) {
      const left = aParts[i] ?? "";
      const right = bParts[i] ?? "";
      const leftNum = Number(left);
      const rightNum = Number(right);
      const bothNumeric = Number.isFinite(leftNum) && Number.isFinite(rightNum);
      if (bothNumeric) {
        if (leftNum < rightNum) {
          return -1;
        }
        if (leftNum > rightNum) {
          return 1;
        }
        continue;
      }
      const cmp = left.localeCompare(right, "en");
      if (cmp !== 0) {
        return cmp;
      }
    }
  }

  return String(a).localeCompare(String(b), "en");
}

function compareTimestamps(a, b) {
  if (!a || !b || a === b) {
    return 0;
  }
  const left = Date.parse(String(a));
  const right = Date.parse(String(b));
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return 0;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function collectWarnings(target, values) {
  for (const value of values) {
    if (value) {
      target.push(value);
    }
  }
}

function validateCatalog(parsed, mapping, localParsed, options) {
  const warnings = [];
  const root = extractCatalogRoot(parsed);
  if (!root) {
    throw new SyncError(`${mapping.localPath} has no catalog object.`, { kind: "schema" });
  }

  if (!Array.isArray(root.groups)) {
    throw new SyncError(`${mapping.localPath} schema invalid: catalog.groups must be an array.`, {
      kind: "schema"
    });
  }

  const metadata = asObject(root.metadata);
  if (!metadata) {
    throw new SyncError(`${mapping.localPath} schema invalid: catalog.metadata missing.`, { kind: "schema" });
  }

  const catalogAllowedKeys = new Set(["uuid", "metadata", "params", "controls", "groups", "back-matter"]);
  const unknownCatalogKeys = Object.keys(root).filter((key) => !catalogAllowedKeys.has(key));
  if (unknownCatalogKeys.length > 0) {
    warnings.push(`Catalog drift detected in ${mapping.localPath}: unexpected catalog keys [${unknownCatalogKeys.join(", ")}].`);
  }

  const controlCount = countControlsFromGroups(root.groups);
  const groupCount = countGroups(root.groups);
  if (controlCount <= 0) {
    throw new SyncError(`${mapping.localPath} semantic check failed: control count is 0.`, {
      kind: "semantic"
    });
  }

  const version = metadata.version == null ? null : String(metadata.version);
  const lastModified = metadata["last-modified"] == null ? null : String(metadata["last-modified"]);

  if (!version) {
    warnings.push(`${mapping.localPath}: metadata.version missing.`);
  }
  if (!lastModified) {
    warnings.push(`${mapping.localPath}: metadata.last-modified missing.`);
  }

  const localRoot = localParsed ? extractCatalogRoot(localParsed) : null;
  const localMetadata = localRoot ? asObject(localRoot.metadata) : null;
  const localControlCount = localRoot && Array.isArray(localRoot.groups) ? countControlsFromGroups(localRoot.groups) : null;
  const localVersion = localMetadata?.version == null ? null : String(localMetadata.version);
  const localLastModified = localMetadata?.["last-modified"] == null ? null : String(localMetadata["last-modified"]);

  if (version && localVersion && compareVersions(version, localVersion) < 0) {
    warnings.push(`${mapping.localPath}: metadata.version regressed (${version} < ${localVersion}).`);
  }

  if (lastModified && localLastModified && compareTimestamps(lastModified, localLastModified) < 0) {
    warnings.push(`${mapping.localPath}: metadata.last-modified regressed (${lastModified} < ${localLastModified}).`);
  }

  if (localControlCount && localControlCount > 0) {
    const ratio = controlCount / localControlCount;
    if (ratio < options.minControlRatio) {
      warnings.push(
        `${mapping.localPath}: control count dropped from ${localControlCount} to ${controlCount} (ratio=${ratio.toFixed(3)} < ${options.minControlRatio}).`
      );
    }
  }

  return {
    kind: "catalog",
    controlCount,
    groupCount,
    metadataVersion: version,
    metadataLastModified: lastModified,
    warnings
  };
}

function buildResourceByUuid(profileRoot) {
  const resources = asArray(profileRoot?.["back-matter"]?.resources);
  const map = new Map();
  for (const resource of resources) {
    const uuid = resource?.uuid;
    if (uuid) {
      map.set(String(uuid), resource);
    }
  }
  return map;
}

function getImportResolvedHref(entry, resourceByUuid) {
  const href = String(entry?.href ?? "");
  if (!href.startsWith("#")) {
    return href;
  }

  const resource = resourceByUuid.get(href.slice(1));
  const rlink = asArray(resource?.rlinks)[0];
  return rlink?.href ? String(rlink.href) : "";
}

function getImportHashInfo(entry, resourceByUuid) {
  const href = String(entry?.href ?? "");
  const resource = href.startsWith("#") ? resourceByUuid.get(href.slice(1)) : null;
  const rlink = asArray(resource?.rlinks)[0];
  const hash = asArray(rlink?.hashes)[0];
  if (!hash) {
    return null;
  }
  return {
    algorithm: hash.algorithm == null ? null : String(hash.algorithm),
    value: hash.value == null ? null : String(hash.value)
  };
}

function validateProfile(parsed, mapping, stagedByFileName, localParsed) {
  const warnings = [];
  const root = extractProfileRoot(parsed);
  if (!root) {
    throw new SyncError(`${mapping.localPath} has no profile object.`, { kind: "schema" });
  }

  if (!Array.isArray(root.imports)) {
    throw new SyncError(`${mapping.localPath} schema invalid: profile.imports must be an array.`, {
      kind: "schema"
    });
  }

  const metadata = asObject(root.metadata);
  if (!metadata) {
    throw new SyncError(`${mapping.localPath} schema invalid: profile.metadata missing.`, { kind: "schema" });
  }

  const profileAllowedKeys = new Set(["uuid", "metadata", "imports", "merge", "modify", "back-matter"]);
  const unknownProfileKeys = Object.keys(root).filter((key) => !profileAllowedKeys.has(key));
  if (unknownProfileKeys.length > 0) {
    warnings.push(`Profile drift detected in ${mapping.localPath}: unexpected profile keys [${unknownProfileKeys.join(", ")}].`);
  }

  const localRoot = localParsed ? extractProfileRoot(localParsed) : null;
  const localMetadata = localRoot ? asObject(localRoot.metadata) : null;

  const version = metadata.version == null ? null : String(metadata.version);
  const lastModified = metadata["last-modified"] == null ? null : String(metadata["last-modified"]);
  const localVersion = localMetadata?.version == null ? null : String(localMetadata.version);
  const localLastModified = localMetadata?.["last-modified"] == null ? null : String(localMetadata["last-modified"]);

  if (version && localVersion && compareVersions(version, localVersion) < 0) {
    warnings.push(`${mapping.localPath}: profile metadata.version regressed (${version} < ${localVersion}).`);
  }
  if (lastModified && localLastModified && compareTimestamps(lastModified, localLastModified) < 0) {
    warnings.push(`${mapping.localPath}: profile metadata.last-modified regressed (${lastModified} < ${localLastModified}).`);
  }

  const resourceByUuid = buildResourceByUuid(root);
  const integrityChecks = [];

  for (const entry of root.imports) {
    const rawHref = String(entry?.href ?? "");
    const resolvedHref = getImportResolvedHref(entry, resourceByUuid);

    if (!resolvedHref) {
      throw new SyncError(`${mapping.localPath}: unresolved profile import '${rawHref}'.`, {
        kind: "semantic"
      });
    }

    const targetFileName = path.basename(resolvedHref);
    const stagedTarget = stagedByFileName.get(targetFileName) ?? null;
    if (!stagedTarget) {
      throw new SyncError(
        `${mapping.localPath}: profile import '${rawHref}' resolves to '${resolvedHref}', which is not part of tracked catalog files.`,
        { kind: "semantic" }
      );
    }

    const hashInfo = getImportHashInfo(entry, resourceByUuid);
    if (!hashInfo || !hashInfo.value) {
      integrityChecks.push({
        href: rawHref,
        resolvedHref,
        status: "no-hash"
      });
      continue;
    }

    const algorithm = normalizeHashAlgorithm(hashInfo.algorithm);
    if (!algorithm) {
      warnings.push(`${mapping.localPath}: unsupported hash algorithm '${hashInfo.algorithm}' for import '${rawHref}'.`);
      integrityChecks.push({
        href: rawHref,
        resolvedHref,
        status: "unsupported-algorithm",
        algorithm: hashInfo.algorithm
      });
      continue;
    }

    const expected = String(hashInfo.value).trim().toLowerCase();
    const actual = hashWithAlgorithm(algorithm, stagedTarget.content).toLowerCase();
    const matched = expected === actual;
    const isStrongAlgorithm = strongIntegrityAlgorithms.has(algorithm);

    integrityChecks.push({
      href: rawHref,
      resolvedHref,
      status: matched ? "match" : isStrongAlgorithm ? "mismatch" : "mismatch-weak",
      algorithm
    });

    if (!matched) {
      if (!isStrongAlgorithm) {
        warnings.push(
          `${mapping.localPath}: hash mismatch for import '${rawHref}' uses weak algorithm '${algorithm}' and is treated as warning.`
        );
        continue;
      }
      throw new SyncError(
        `${mapping.localPath}: hash mismatch for import '${rawHref}' (${algorithm}). expected=${expected.slice(0, 16)}..., actual=${actual.slice(0, 16)}...`,
        { kind: "semantic" }
      );
    }
  }

  return {
    kind: "profile",
    importCount: root.imports.length,
    metadataVersion: version,
    metadataLastModified: lastModified,
    warnings,
    integrityChecks
  };
}

function renderSyncReportMarkdown(report) {
  const lines = [];
  lines.push("### BSI catalog sync report");
  lines.push("");
  lines.push(`- Source: \`${report.source.repo}@${report.source.ref}\``);
  lines.push(`- Upstream commit: \`${report.source.commit}\``);
  lines.push(`- Changed files: **${report.summary.changedCount}**`);
  lines.push(`- Unchanged files: **${report.summary.unchangedCount}**`);
  lines.push(`- Hard gate: **${report.summary.hardGatePassed ? "passed" : "failed"}**`);

  if (report.summary.warningCount > 0) {
    lines.push(`- Warnings: **${report.summary.warningCount}**`);
  }

  lines.push("");
  lines.push("#### Files");
  for (const file of report.files) {
    lines.push(
      `- \`${file.localPath}\`: ${file.status}, sha256=\`${file.sha256.slice(0, 12)}\`, size=${file.sizeBytes}B, kind=${file.validation.kind}`
    );
  }

  if (report.profileIntegrityChecks.length > 0) {
    lines.push("");
    lines.push("#### Profile import integrity");
    for (const item of report.profileIntegrityChecks) {
      lines.push(`- ${item.href} -> ${item.resolvedHref}: ${item.status}${item.algorithm ? ` (${item.algorithm})` : ""}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("#### Warnings");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join("\n");
}

async function readLocalFileIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw new SyncError(`Failed to read local file: ${filePath}`, {
      kind: "filesystem",
      cause: error
    });
  }
}

async function appendGithubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  await appendFile(outputPath, `${name}=${value}\n`);
}

async function appendGithubMultilineOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  const delimiter = `EOF_${name}_${Math.random().toString(16).slice(2)}`;
  await appendFile(outputPath, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

async function appendStepSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }
  await appendFile(summaryPath, `${markdown}\n`);
}

async function main() {
  const upstreamRepo = process.env.BSI_REPO ?? DEFAULT_UPSTREAM_REPO;
  const upstreamRef = process.env.BSI_REF ?? DEFAULT_UPSTREAM_REF;
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
  const maxRetries = toIntOrDefault(process.env.BSI_SYNC_MAX_RETRIES, DEFAULT_MAX_RETRIES);
  const retryBaseMs = toIntOrDefault(process.env.BSI_SYNC_RETRY_BASE_MS, DEFAULT_RETRY_BASE_MS);
  const minControlRatio = toFloatOrDefault(process.env.BSI_MIN_CONTROL_RATIO, DEFAULT_MIN_CONTROL_RATIO);

  const fetchOptions = {
    maxRetries,
    retryBaseMs
  };

  const apiHeaders = createApiHeaders(token);
  const rawHeaders = createRawHeaders(token);

  const commitUrl = `https://api.github.com/repos/${upstreamRepo}/commits/${encodeURIComponent(upstreamRef)}`;
  const commit = await fetchJson(commitUrl, apiHeaders, "Resolve upstream commit", fetchOptions);
  const upstreamCommitSha = String(commit.sha ?? "");

  if (!upstreamCommitSha) {
    throw new SyncError(`Failed to resolve upstream commit for ${upstreamRepo}@${upstreamRef}`, {
      kind: "api"
    });
  }

  process.stdout.write(`Sync source: ${upstreamRepo}@${upstreamRef} (resolved ${upstreamCommitSha})\n`);

  const stagedFiles = [];

  for (const mapping of catalogFileMappings) {
    const apiPath = encodePathSegments(mapping.upstreamPath);
    const metadataUrl = `https://api.github.com/repos/${upstreamRepo}/contents/${apiPath}?ref=${encodeURIComponent(upstreamCommitSha)}`;
    const metadata = await fetchJson(metadataUrl, apiHeaders, `Load metadata for ${mapping.upstreamPath}`, fetchOptions);

    if (metadata.type !== "file" || typeof metadata.download_url !== "string") {
      throw new SyncError(`Unexpected metadata for ${mapping.upstreamPath}.`, {
        kind: "api"
      });
    }

    const upstreamContent = await fetchText(
      metadata.download_url,
      rawHeaders,
      `Download ${mapping.upstreamPath}`,
      fetchOptions
    );

    const localAbsolutePath = path.join(rootDir, mapping.localPath);
    const localContent = await readLocalFileIfExists(localAbsolutePath);

    stagedFiles.push({
      ...mapping,
      localAbsolutePath,
      upstreamContent,
      localContent,
      sizeBytes: Buffer.byteLength(upstreamContent, "utf8"),
      sha256: sha256(upstreamContent)
    });
  }

  const stagedByFileName = new Map(stagedFiles.map((entry) => [path.basename(entry.localPath), { content: entry.upstreamContent, mapping: entry }]));

  const warnings = [];
  const filesReport = [];
  const profileIntegrityChecks = [];

  for (const staged of stagedFiles) {
    const parsed = parseJsonOrThrow(staged.upstreamContent, staged.localPath);
    const localParsed = staged.localContent ? parseJsonOrThrow(staged.localContent, `${staged.localPath} (local)`) : null;

    let validation;
    if (staged.fileKind === "catalog") {
      validation = validateCatalog(parsed, staged, localParsed, { minControlRatio });
    } else {
      validation = validateProfile(parsed, staged, stagedByFileName, localParsed);
      for (const check of validation.integrityChecks) {
        profileIntegrityChecks.push(check);
      }
    }

    collectWarnings(warnings, validation.warnings);

    const status = staged.localContent === staged.upstreamContent ? "unchanged" : "changed";
    filesReport.push({
      localPath: staged.localPath,
      upstreamPath: staged.upstreamPath,
      status,
      sha256: staged.sha256,
      sizeBytes: staged.sizeBytes,
      validation
    });
  }

  const changedFiles = stagedFiles.filter((entry) => entry.localContent !== entry.upstreamContent);
  for (const changed of changedFiles) {
    await mkdir(path.dirname(changed.localAbsolutePath), { recursive: true });
    await writeFile(changed.localAbsolutePath, changed.upstreamContent, "utf8");
    process.stdout.write(`+ updated ${changed.localPath} (${changed.sha256.slice(0, 12)})\n`);
  }

  for (const unchanged of stagedFiles.filter((entry) => entry.localContent === entry.upstreamContent)) {
    process.stdout.write(`= unchanged ${unchanged.localPath}\n`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: {
      repo: upstreamRepo,
      ref: upstreamRef,
      commit: upstreamCommitSha
    },
    policy: {
      maxRetries,
      retryBaseMs,
      minControlRatio
    },
    files: filesReport,
    warnings,
    profileIntegrityChecks,
    summary: {
      trackedCount: stagedFiles.length,
      changedCount: changedFiles.length,
      unchangedCount: stagedFiles.length - changedFiles.length,
      warningCount: warnings.length,
      hardGatePassed: true
    }
  };

  const markdown = renderSyncReportMarkdown(report);

  process.stdout.write(
    `Sync summary: changed=${report.summary.changedCount}, unchanged=${report.summary.unchangedCount}, tracked=${report.summary.trackedCount}, warnings=${report.summary.warningCount}\n`
  );

  await appendGithubOutput("changed", changedFiles.length > 0 ? "true" : "false");
  await appendGithubOutput("changed_count", String(changedFiles.length));
  await appendGithubOutput("changed_files", changedFiles.map((entry) => entry.localPath).join(","));
  await appendGithubOutput("upstream_repo", upstreamRepo);
  await appendGithubOutput("upstream_ref", upstreamRef);
  await appendGithubOutput("upstream_commit", upstreamCommitSha);
  await appendGithubOutput("warning_count", String(report.summary.warningCount));
  await appendGithubMultilineOutput("sync_report_json", JSON.stringify(report, null, 2));
  await appendGithubMultilineOutput("sync_report_markdown", markdown);
  await appendStepSummary(markdown);
}

main().catch(async (error) => {
  const classified = error instanceof SyncError ? error : new SyncError(String(error), { kind: "unknown", cause: error });
  const message = `[${classified.kind}] ${classified.message}`;
  console.error(message);
  if (classified.cause) {
    console.error(classified.cause);
  }

  try {
    await appendGithubOutput("changed", "false");
    await appendGithubOutput("changed_count", "0");
    await appendGithubOutput("changed_files", "");
    await appendGithubOutput("warning_count", "0");
    await appendGithubOutput("error_kind", classified.kind);
    await appendGithubMultilineOutput("sync_report_markdown", `### BSI catalog sync report\n\n- Hard gate: **failed**\n- Error kind: \`${classified.kind}\`\n- Message: ${classified.message}`);
    await appendStepSummary(`### BSI catalog sync report\n\n- Hard gate: **failed**\n- Error kind: \`${classified.kind}\`\n- Message: ${classified.message}`);
  } catch {
    // Ignore output/summary write errors when already failing.
  }

  process.exit(1);
});
