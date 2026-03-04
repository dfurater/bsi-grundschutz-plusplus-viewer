import { SECURITY_BUDGETS } from "./securityBudgets";

export function sanitizeSearchText(input: string | null | undefined): string {
  if (typeof input !== "string") {
    return "";
  }

  const normalized = input.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!normalized) {
    return "";
  }

  return normalized.slice(0, SECURITY_BUDGETS.maxQueryChars);
}

export function sanitizeFilterValues(values: string[]): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const out: string[] = [];
  for (const rawValue of values) {
    if (out.length >= SECURITY_BUDGETS.maxArrayItems) {
      break;
    }

    const value = String(rawValue ?? "")
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .slice(0, SECURITY_BUDGETS.maxShortTextChars);

    if (!value) {
      continue;
    }
    out.push(value);
  }
  return out;
}

export function limitQueryTokens(tokens: string[]): string[] {
  return tokens.slice(0, SECURITY_BUDGETS.maxQueryTokens);
}
