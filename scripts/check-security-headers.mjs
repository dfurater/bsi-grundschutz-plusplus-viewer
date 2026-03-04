const target = process.env.SECURITY_HEADERS_URL || process.argv[2] || "";

if (!target) {
  console.log("[check:headers] SECURITY_HEADERS_URL nicht gesetzt - Check wird uebersprungen.");
  process.exit(0);
}

const response = await fetch(target, { redirect: "follow" });
const headers = response.headers;

function requireHeader(name) {
  const value = headers.get(name);
  if (!value) {
    throw new Error(`Header fehlt: ${name}`);
  }
  return value;
}

const csp = requireHeader("content-security-policy");
const requiredDirectives = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'"
];

for (const directive of requiredDirectives) {
  if (!csp.includes(directive)) {
    throw new Error(`CSP-Direktive fehlt: ${directive}`);
  }
}
if (csp.includes("'unsafe-inline'")) {
  throw new Error("CSP enthaelt unerwuenscht: 'unsafe-inline'");
}
if (csp.includes("'unsafe-eval'")) {
  throw new Error("CSP enthaelt unerwuenscht: 'unsafe-eval'");
}

const xcto = requireHeader("x-content-type-options");
if (xcto.toLowerCase() !== "nosniff") {
  throw new Error(`Ungueltiger X-Content-Type-Options Wert: ${xcto}`);
}

requireHeader("referrer-policy");
requireHeader("permissions-policy");
requireHeader("cross-origin-opener-policy");
requireHeader("cross-origin-resource-policy");

console.log(`[check:headers] OK fuer ${target}`);
