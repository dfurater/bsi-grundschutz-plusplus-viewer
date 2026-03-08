import { describe, expect, it } from "vitest";
import { parseHash } from "./routing";
import { safeDecodeURIComponent } from "./safeDecode";
import { SECURITY_BUDGETS } from "./securityBudgets";

describe("safeDecodeURIComponent", () => {
  it("liefert fallback bei ungueltiger Prozentkodierung", () => {
    expect(safeDecodeURIComponent("%E0%A4%A", "fallback")).toBe("fallback");
  });
});

describe("parseHash hardening", () => {
  it("crasht nicht bei ungueltigem deep link", () => {
    expect(() => parseHash("#/control/%E0%A4%A?top=GC")).not.toThrow();
    const route = parseHash("#/control/%E0%A4%A?top=GC");
    expect(route.view).toBe("home");
  });

  it("begrenzt q-Parameter", () => {
    const longQuery = "a".repeat(SECURITY_BUDGETS.maxQueryChars + 50);
    const route = parseHash(`#/search?q=${longQuery}`);
    expect(route.view).toBe("search");
    if (route.view === "search") {
      expect(route.query.length).toBe(SECURITY_BUDGETS.maxQueryChars);
    }
  });

  it("parst Impressum- und Datenschutz-Routen", () => {
    expect(parseHash("#/impressum")).toEqual({ view: "impressum" });
    expect(parseHash("#/datenschutz")).toEqual({ view: "datenschutz" });
  });

  it("parst About-Routen", () => {
    expect(parseHash("#/about")).toEqual({ view: "about" });
    expect(parseHash("#/about/license")).toEqual({ view: "source" });
    expect(parseHash("#/about/source")).toEqual({ view: "source" });
  });

  it("parst alle Sortierungsvarianten aus der URL", () => {
    const cases = [
      ["#/search?sort=id-desc", "id-desc"],
      ["#/search?sort=title-desc", "title-desc"],
      ["#/search?sort=effort-asc", "effort-asc"],
      ["#/search?sort=effort-desc", "effort-desc"]
    ] as const;

    for (const [hash, expectedSort] of cases) {
      const route = parseHash(hash);
      expect(route.view).toBe("search");
      if (route.view === "search") {
        expect(route.sort).toBe(expectedSort);
      }
    }
  });
});
