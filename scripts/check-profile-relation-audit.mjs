import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function resolveMode(rawMode) {
  const mode = String(rawMode ?? "warn").trim().toLowerCase();
  if (mode === "off" || mode === "warn" || mode === "error") {
    return mode;
  }
  return "warn";
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
  const mode = resolveMode(process.env.RELATION_AUDIT_MODE);
  const profilePath = path.join(rootDir, "public", "data", "profile-links.json");
  const raw = await readFile(profilePath, "utf8");
  const parsed = JSON.parse(raw);
  const audit = parsed?.relationAudit;

  if (!audit || typeof audit !== "object") {
    throw new Error("profile-links.json has no relationAudit block.");
  }

  const exactUnionMatch = Boolean(audit.exactUnionMatch);
  const unionCount = Number(audit.sourceUnionControlCount ?? 0);
  const anwenderCount = Number(audit.anwenderControlCount ?? 0);
  const missingInAnwender = Number(audit.unionMissingInAnwender ?? 0);
  const missingInUnion = Number(audit.anwenderMissingInUnion ?? 0);

  const summaryLines = [
    "### Profile relation audit",
    "",
    `- Mode: \`${mode}\``,
    `- exactUnionMatch: **${exactUnionMatch}**`,
    `- sourceUnionControlCount: ${unionCount}`,
    `- anwenderControlCount: ${anwenderCount}`,
    `- unionMissingInAnwender: ${missingInAnwender}`,
    `- anwenderMissingInUnion: ${missingInUnion}`
  ];
  const summaryMarkdown = summaryLines.join("\n");

  await appendGithubOutput("exact_union_match", exactUnionMatch ? "true" : "false");
  await appendGithubOutput("source_union_control_count", String(unionCount));
  await appendGithubOutput("anwender_control_count", String(anwenderCount));
  await appendGithubOutput("union_missing_in_anwender", String(missingInAnwender));
  await appendGithubOutput("anwender_missing_in_union", String(missingInUnion));
  await appendGithubOutput("mode", mode);
  await appendGithubMultilineOutput("summary_markdown", summaryMarkdown);
  await appendStepSummary(summaryMarkdown);

  if (!exactUnionMatch && mode === "error") {
    throw new Error("relationAudit.exactUnionMatch is false and RELATION_AUDIT_MODE=error.");
  }

  if (!exactUnionMatch && mode === "warn") {
    process.stdout.write("Relation audit mismatch detected (warn mode).\n");
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));

  try {
    await appendGithubMultilineOutput(
      "summary_markdown",
      `### Profile relation audit\n\n- Status: **failed**\n- Message: ${error instanceof Error ? error.message : String(error)}`
    );
    await appendStepSummary(
      `### Profile relation audit\n\n- Status: **failed**\n- Message: ${error instanceof Error ? error.message : String(error)}`
    );
  } catch {
    // ignore
  }

  process.exit(1);
});
