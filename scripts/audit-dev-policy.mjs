import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["audit", "--json"], { encoding: "utf8" });
const raw = `${result.stdout || ""}${result.stderr || ""}`;

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("[audit:dev] Konnte npm audit JSON nicht lesen.");
  console.error(raw);
  process.exit(1);
}

const meta = report.metadata?.vulnerabilities || {};
const critical = Number(meta.critical || 0);
const high = Number(meta.high || 0);
const moderate = Number(meta.moderate || 0);
const low = Number(meta.low || 0);

console.log(`[audit:dev] severity summary -> critical=${critical}, high=${high}, moderate=${moderate}, low=${low}`);

if (critical > 0) {
  console.error("[audit:dev] Policy-Verletzung: critical Vulnerabilities gefunden.");
  process.exit(1);
}

if (high > 0 || moderate > 0 || low > 0) {
  console.log("[audit:dev] Hinweise vorhanden. Fuer Dev-Toolchain akzeptiert, aber Update-Plan erforderlich.");
}

process.exit(0);
