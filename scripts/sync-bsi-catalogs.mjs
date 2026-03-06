import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_UPSTREAM_REPO = "BSI-Bund/Stand-der-Technik-Bibliothek";
const DEFAULT_UPSTREAM_REF = "main";

const catalogFileMappings = [
  {
    upstreamPath: "Anwenderkataloge/Grundschutz++/Grundschutz++-catalog.json",
    localPath: "Kataloge/Grundschutz++-catalog.json"
  },
  {
    upstreamPath: "Quellkataloge/Kernel/BSI-Stand-der-Technik-Kernel-catalog.json",
    localPath: "Kataloge/BSI-Stand-der-Technik-Kernel-catalog.json"
  },
  {
    upstreamPath: "Quellkataloge/Methodik-Grundschutz++/BSI-Methodik-Grundschutz++-catalog.json",
    localPath: "Kataloge/BSI-Methodik-Grundschutz++-catalog.json"
  },
  {
    upstreamPath: "Quellkataloge/Methodik-Grundschutz++/Grundschutz++-profile.json",
    localPath: "Kataloge/Grundschutz++-profile.json"
  }
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

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

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${url}\n${body.slice(0, 400)}`);
  }
  return response.json();
}

async function fetchText(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Raw file download failed (${response.status}): ${url}\n${body.slice(0, 400)}`);
  }
  return response.text();
}

async function readLocalFileIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function appendGithubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  await appendFile(outputPath, `${name}=${value}\n`);
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
  const apiHeaders = createApiHeaders(token);
  const rawHeaders = createRawHeaders(token);

  const commitUrl = `https://api.github.com/repos/${upstreamRepo}/commits/${encodeURIComponent(upstreamRef)}`;
  const commit = await fetchJson(commitUrl, apiHeaders);
  const upstreamCommitSha = String(commit.sha ?? "");

  if (!upstreamCommitSha) {
    throw new Error(`Failed to resolve upstream commit for ${upstreamRepo}@${upstreamRef}`);
  }

  process.stdout.write(`Sync source: ${upstreamRepo}@${upstreamRef} (${upstreamCommitSha.slice(0, 12)})\n`);

  const changedFiles = [];
  const unchangedFiles = [];

  for (const mapping of catalogFileMappings) {
    const apiPath = encodePathSegments(mapping.upstreamPath);
    const metadataUrl = `https://api.github.com/repos/${upstreamRepo}/contents/${apiPath}?ref=${encodeURIComponent(upstreamRef)}`;
    const metadata = await fetchJson(metadataUrl, apiHeaders);

    if (metadata.type !== "file" || typeof metadata.download_url !== "string") {
      throw new Error(`Unexpected metadata for ${mapping.upstreamPath}`);
    }

    const upstreamContent = await fetchText(metadata.download_url, rawHeaders);
    const localAbsolutePath = path.join(rootDir, mapping.localPath);
    const localContent = await readLocalFileIfExists(localAbsolutePath);

    if (localContent === upstreamContent) {
      unchangedFiles.push({
        localPath: mapping.localPath,
        upstreamPath: mapping.upstreamPath,
        sha256: sha256(upstreamContent)
      });
      process.stdout.write(`= unchanged ${mapping.localPath}\n`);
      continue;
    }

    await mkdir(path.dirname(localAbsolutePath), { recursive: true });
    await writeFile(localAbsolutePath, upstreamContent, "utf8");

    const fileHash = sha256(upstreamContent);
    changedFiles.push({
      localPath: mapping.localPath,
      upstreamPath: mapping.upstreamPath,
      sha256: fileHash
    });
    process.stdout.write(`+ updated ${mapping.localPath} (${fileHash.slice(0, 12)})\n`);
  }

  process.stdout.write(
    `Sync summary: changed=${changedFiles.length}, unchanged=${unchangedFiles.length}, tracked=${catalogFileMappings.length}\n`
  );

  await appendGithubOutput("changed", changedFiles.length > 0 ? "true" : "false");
  await appendGithubOutput("changed_count", String(changedFiles.length));
  await appendGithubOutput(
    "changed_files",
    changedFiles.map((entry) => entry.localPath).join(",")
  );
  await appendGithubOutput("upstream_repo", upstreamRepo);
  await appendGithubOutput("upstream_ref", upstreamRef);
  await appendGithubOutput("upstream_commit", upstreamCommitSha);

  const changedList = changedFiles.length
    ? changedFiles.map((entry) => `- \`${entry.localPath}\` (\`${entry.sha256.slice(0, 12)}\`)`).join("\n")
    : "- none";
  await appendStepSummary(
    [
      "### BSI catalog sync",
      "",
      `- Source: \`${upstreamRepo}@${upstreamRef}\``,
      `- Upstream commit: \`${upstreamCommitSha}\``,
      `- Changed files: **${changedFiles.length}**`,
      "",
      changedList
    ].join("\n")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
