import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./urlSafety";

describe("safeExternalUrl", () => {
  it("laesst https/http zu", () => {
    expect(safeExternalUrl("https://example.com/path?a=1")).toBe("https://example.com/path?a=1");
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com/");
  });

  it("blockt gefaehrliche Schemes", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("javascr\u0131pt:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html;base64,abcd")).toBeNull();
    expect(safeExternalUrl("file:///etc/passwd")).toBeNull();
    expect(safeExternalUrl("blob:https://example.com/123")).toBeNull();
  });

  it("blockt relative URLs und Control-Zeichen", () => {
    expect(safeExternalUrl("/relative/path")).toBeNull();
    expect(safeExternalUrl("\u0000https://example.com")).toBeNull();
    expect(safeExternalUrl("java\u0000script:alert(1)")).toBeNull();
  });

  it("blockt userinfo und akzeptiert getrimmte Werte", () => {
    expect(safeExternalUrl(" https://example.com ")).toBe("https://example.com/");
    expect(safeExternalUrl("https://user:pass@example.com")).toBeNull();
  });
});
