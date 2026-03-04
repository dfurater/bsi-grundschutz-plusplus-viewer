const UMLAUT_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss"
};

export function normalizeGerman(input: string): string {
  const lowered = input.toLowerCase();
  const replaced = lowered.replace(/[äöüß]/g, (char) => UMLAUT_MAP[char] ?? char);
  return replaced
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.#\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  return normalizeGerman(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

export function stripMustacheInserts(input: string): string {
  return input.replace(/\{\{\s*insert:\s*param,\s*[^}]+\s*\}\}/gi, "").trim();
}

export function makeSnippet(text: string, queryTokens: string[], maxLength = 220): string {
  const source = stripMustacheInserts(text || "").replace(/\s+/g, " ").trim();
  if (!source) {
    return "";
  }

  if (queryTokens.length === 0) {
    return source.slice(0, maxLength);
  }

  const sourceNorm = normalizeGerman(source);
  let bestIndex = 0;
  for (const token of queryTokens) {
    const index = sourceNorm.indexOf(token);
    if (index >= 0) {
      bestIndex = index;
      break;
    }
  }

  const start = Math.max(0, bestIndex - Math.floor(maxLength / 4));
  const end = Math.min(source.length, start + maxLength);
  const snippet = source.slice(start, end).trim();
  const prefix = start > 0 ? "…" : "";
  const suffix = end < source.length ? "…" : "";
  return `${prefix}${snippet}${suffix}`;
}
