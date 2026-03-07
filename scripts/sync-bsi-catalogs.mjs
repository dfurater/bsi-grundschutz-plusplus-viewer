import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_UPSTREAM_REPO = "BSI-Bund/Stand-der-Technik-Bibliothek";
const DEFAULT_UPSTREAM_REF = "main";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_MS = 500;
const DEFAULT_MIN_CONTROL_RATIO = 0.8;

const catalogFileMapping = {
  fileId: "anwender-catalog",
  fileKind: "catalog",
  upstreamPath: "Anwenderkataloge/Grundschutz++/Grundschutz++-catalog.json",
  localPath: "Kataloge/Grundschutz++-catalog.json"
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

  const apiPath = encodePathSegments(catalogFileMapping.upstreamPath);
  const metadataUrl = `https://api.github.com/repos/${upstreamRepo}/contents/${apiPath}?ref=${encodeURIComponent(upstreamCommitSha)}`;
  const metadata = await fetchJson(metadataUrl, apiHeaders, `Load metadata for ${catalogFileMapping.upstreamPath}`, fetchOptions);

  if (metadata.type !== "file" || typeof metadata.download_url !== "string") {
    throw new SyncError(`Unexpected metadata for ${catalogFileMapping.upstreamPath}.`, {
      kind: "api"
    });
  }

  const upstreamContent = await fetchText(
    metadata.download_url,
    rawHeaders,
    `Download ${catalogFileMapping.upstreamPath}`,
    fetchOptions
  );

  const localAbsolutePath = path.join(rootDir, catalogFileMapping.localPath);
  const localContent = await readLocalFileIfExists(localAbsolutePath);

  const parsed = parseJsonOrThrow(upstreamContent, catalogFileMapping.localPath);
  const localParsed = localContent ? parseJsonOrThrow(localContent, `${catalogFileMapping.localPath} (local)`) : null;
  const validation = validateCatalog(parsed, catalogFileMapping, localParsed, { minControlRatio });
  const warnings = [...validation.warnings];

  const fileReport = {
    localPath: catalogFileMapping.localPath,
    upstreamPath: catalogFileMapping.upstreamPath,
    status: localContent === upstreamContent ? "unchanged" : "changed",
    sha256: sha256(upstreamContent),
    sizeBytes: Buffer.byteLength(upstreamContent, "utf8"),
    validation
  };

  if (fileReport.status === "changed") {
    await mkdir(path.dirname(localAbsolutePath), { recursive: true });
    await writeFile(localAbsolutePath, upstreamContent, "utf8");
    process.stdout.write(`+ updated ${catalogFileMapping.localPath} (${fileReport.sha256.slice(0, 12)})\n`);
  } else {
    process.stdout.write(`= unchanged ${catalogFileMapping.localPath}\n`);
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
    files: [fileReport],
    warnings,
    summary: {
      trackedCount: 1,
      changedCount: fileReport.status === "changed" ? 1 : 0,
      unchangedCount: fileReport.status === "changed" ? 0 : 1,
      warningCount: warnings.length,
      hardGatePassed: true
    }
  };

  const markdown = renderSyncReportMarkdown(report);

  process.stdout.write(
    `Sync summary: changed=${report.summary.changedCount}, unchanged=${report.summary.unchangedCount}, tracked=${report.summary.trackedCount}, warnings=${report.summary.warningCount}\n`
  );

  await appendGithubOutput("changed", fileReport.status === "changed" ? "true" : "false");
  await appendGithubOutput("changed_count", String(report.summary.changedCount));
  await appendGithubOutput("changed_files", fileReport.status === "changed" ? catalogFileMapping.localPath : "");
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
    await appendGithubMultilineOutput(
      "sync_report_markdown",
      `### BSI catalog sync report\n\n- Hard gate: **failed**\n- Error kind: \`${classified.kind}\`\n- Message: ${classified.message}`
    );
    await appendStepSummary(
      `### BSI catalog sync report\n\n- Hard gate: **failed**\n- Error kind: \`${classified.kind}\`\n- Message: ${classified.message}`
    );
  } catch {
    // Ignore output/summary write errors when already failing.
  }

  process.exit(1);
});
