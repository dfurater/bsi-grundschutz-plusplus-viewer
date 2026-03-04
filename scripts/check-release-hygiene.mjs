import { readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const forbiddenNames = new Set([".DS_Store"]);
const forbiddenSuffixes = [".map"];

const findings = [];

async function walk(currentDir) {
  let entries = [];
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    findings.push(`Verzeichnis nicht lesbar oder fehlt: ${currentDir}`);
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (forbiddenNames.has(entry.name)) {
      findings.push(`Verbotene Datei gefunden: ${entryPath}`);
    }
    for (const suffix of forbiddenSuffixes) {
      if (entry.name.endsWith(suffix)) {
        findings.push(`Verbotene Datei-Endung gefunden: ${entryPath}`);
      }
    }
    if (entry.isDirectory()) {
      await walk(entryPath);
    }
  }
}

await walk(distDir);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`[check:release-hygiene] ${finding}`);
  }
  process.exit(1);
}

console.log("[check:release-hygiene] OK");
