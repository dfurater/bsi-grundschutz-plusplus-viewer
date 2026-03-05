import { loadEnv } from "vite";

const root = process.cwd();
const loadedEnv = loadEnv("production", root, "");
const requiredKeys = [
  "VITE_OPERATOR_NAME",
  "VITE_OPERATOR_ADDRESS_LINE1",
  "VITE_OPERATOR_ADDRESS_LINE2",
  "VITE_OPERATOR_EMAIL"
];
const findings = [];

function readValue(key) {
  const processValue = process.env[key];
  if (typeof processValue === "string" && processValue.trim()) {
    return processValue.trim();
  }

  const loadedValue = loadedEnv[key];
  if (typeof loadedValue === "string") {
    return loadedValue.trim();
  }

  return "";
}

function looksLikePlaceholder(value) {
  return value.includes("{{") && value.includes("}}");
}

for (const key of requiredKeys) {
  const value = readValue(key);
  if (!value) {
    findings.push(`${key} fehlt oder ist leer.`);
    continue;
  }

  if (looksLikePlaceholder(value)) {
    findings.push(`${key} enthaelt noch einen Platzhalterwert (${value}).`);
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`[check:legal-placeholders] ${finding}`);
  }
  process.exit(1);
}

console.log("[check:legal-placeholders] OK");
