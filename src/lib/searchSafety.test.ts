import { describe, expect, it } from "vitest";
import { limitQueryTokens, sanitizeFilterValues, sanitizeSearchText } from "./searchSafety";
import { SECURITY_BUDGETS } from "./securityBudgets";

describe("sanitizeSearchText", () => {
  it("returns empty string for non-string inputs", () => {
    expect(sanitizeSearchText(null)).toBe("");
    expect(sanitizeSearchText(undefined)).toBe("");
    expect(sanitizeSearchText(42 as unknown as string)).toBe("");
  });

  it("removes control chars, trims and enforces max length", () => {
    const overlong = `\u0000  abc\u001F${"x".repeat(SECURITY_BUDGETS.maxQueryChars + 25)}  `;
    const sanitized = sanitizeSearchText(overlong);

    expect(sanitized.startsWith("abc")).toBe(true);
    expect(sanitized.length).toBe(SECURITY_BUDGETS.maxQueryChars);
    expect(/[\u0000-\u001F\u007F]/.test(sanitized)).toBe(false);
  });

  it("returns empty string when only whitespace/control chars remain", () => {
    expect(sanitizeSearchText(" \u0000 \u001F ")).toBe("");
  });
});

describe("sanitizeFilterValues", () => {
  it("returns empty array for invalid or empty input", () => {
    expect(sanitizeFilterValues("not-an-array" as unknown as string[])).toEqual([]);
    expect(sanitizeFilterValues([])).toEqual([]);
  });

  it("sanitizes values, drops empty entries and clips each value", () => {
    const clipped = "x".repeat(SECURITY_BUDGETS.maxShortTextChars + 10);
    const values = ["  alpha  ", "\u0000beta\u001F", "   ", null as unknown as string, clipped];
    const sanitized = sanitizeFilterValues(values);

    expect(sanitized).toEqual([
      "alpha",
      "beta",
      "x".repeat(SECURITY_BUDGETS.maxShortTextChars)
    ]);
  });

  it("enforces max item count", () => {
    const values = Array.from({ length: SECURITY_BUDGETS.maxArrayItems + 7 }, (_, index) => `value-${index}`);
    const sanitized = sanitizeFilterValues(values);

    expect(sanitized).toHaveLength(SECURITY_BUDGETS.maxArrayItems);
    expect(sanitized[sanitized.length - 1]).toBe(`value-${SECURITY_BUDGETS.maxArrayItems - 1}`);
  });
});

describe("limitQueryTokens", () => {
  it("clips tokens to the configured max token budget", () => {
    const tokens = Array.from({ length: SECURITY_BUDGETS.maxQueryTokens + 3 }, (_, index) => `t${index}`);
    expect(limitQueryTokens(tokens)).toEqual(tokens.slice(0, SECURITY_BUDGETS.maxQueryTokens));
  });
});
