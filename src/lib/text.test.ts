import { describe, expect, it } from "vitest";
import { makeSnippet, normalizeGerman, stripMustacheInserts, tokenize } from "./text";

describe("normalizeGerman", () => {
  it("normalizes umlauts, sharp-s and accents", () => {
    expect(normalizeGerman("Aerger ueber Oel, Fußwege und Cafe")).toBe(
      "aerger ueber oel fusswege und cafe"
    );
  });

  it("removes unsupported punctuation and normalizes whitespace", () => {
    expect(normalizeGerman("  RISK#1 !!!   alpha---beta  ")).toBe("risk#1 alpha---beta");
  });
});

describe("tokenize", () => {
  it("returns normalized tokens and drops one-character tokens", () => {
    expect(tokenize("A b C1 C #ID foo-bar")).toEqual(["c1", "#id", "foo-bar"]);
  });
});

describe("stripMustacheInserts", () => {
  it("removes insert placeholders from text", () => {
    expect(stripMustacheInserts("Text {{ insert: param, P1 }} Ende")).toBe("Text  Ende");
  });
});

describe("makeSnippet", () => {
  it("returns empty string when source is empty after cleanup", () => {
    expect(makeSnippet(" {{ insert: param, P1 }} ", ["test"])).toBe("");
  });

  it("returns leading snippet when query has no tokens", () => {
    expect(makeSnippet("abcdefghijklmnop", [], 8)).toBe("abcdefgh");
  });

  it("centers around first matching query token where possible", () => {
    const source = "eins zwei drei vier fuenf sechs sieben acht neun";
    const snippet = makeSnippet(source, ["fuenf"], 16);

    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet).toContain("fuenf");
  });

  it("falls back to start of text when no token is found", () => {
    expect(makeSnippet("eins zwei drei vier", ["nichtvorhanden"], 8)).toBe("eins zwe…");
  });
});
