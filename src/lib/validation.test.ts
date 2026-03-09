import { describe, expect, it } from "vitest";
import { z } from "zod";
import { assertByteBudget, parseJsonOrThrow, validateOrThrow } from "./validation";

describe("validateOrThrow", () => {
  it("returns parsed data on successful validation", () => {
    const schema = z.object({ id: z.string(), enabled: z.boolean() });
    expect(validateOrThrow({ id: "A.1", enabled: true }, schema, "payload")).toEqual({
      id: "A.1",
      enabled: true
    });
  });

  it("includes context and nested path information for invalid payloads", () => {
    const schema = z.object({
      items: z.array(
        z.object({
          id: z.string().min(2),
          count: z.number().int().positive()
        })
      )
    });

    expect(() =>
      validateOrThrow(
        {
          items: [{ id: "", count: 0 }]
        },
        schema,
        "search-index"
      )
    ).toThrowError(/search-index ist ungueltig: items\[0\]\.id:/);
  });

  it("summarizes long error lists with issue count suffix", () => {
    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
      d: z.string(),
      e: z.string(),
      f: z.string()
    });

    expect(() => validateOrThrow({}, schema, "bulk")).toThrowError(/\(\+1 weitere\)/);
  });
});

describe("parseJsonOrThrow", () => {
  it("parses valid json", () => {
    expect(parseJsonOrThrow('{"ok":true}', "meta")).toEqual({ ok: true });
  });

  it("throws with compact snippet for invalid json", () => {
    expect(() => parseJsonOrThrow("{\n invalid json", "meta")).toThrowError(
      /meta ist kein gueltiges JSON\. Antwortbeginn: \{ invalid json/
    );
  });
});

describe("assertByteBudget", () => {
  it("does not throw when byte budget is within limit", () => {
    expect(() => assertByteBudget("abc", 3, "text")).not.toThrow();
  });

  it("throws when utf-8 byte budget is exceeded", () => {
    expect(() => assertByteBudget("€", 2, "utf8-check")).toThrowError(
      /utf8-check ueberschreitet Groessenbudget \(3 > 2 Bytes\)\./
    );
  });
});
