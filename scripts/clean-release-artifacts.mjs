import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scanRoots = [path.join(root, "public"), path.join(root, "dist")];
const forbiddenNames = new Set([".DS_Store"]);

let removed = 0;

async function cleanDir(currentDir) {
  let entries = [];
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await cleanDir(entryPath);
      continue;
    }
    if (forbiddenNames.has(entry.name)) {
      await rm(entryPath, { force: true });
      removed += 1;
    }
  }
}

for (const scanRoot of scanRoots) {
  await cleanDir(scanRoot);
}

console.log(`[clean:release-artifacts] Entfernt: ${removed}`);
