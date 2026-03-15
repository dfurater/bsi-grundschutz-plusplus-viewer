import { describe, expect, it } from "vitest";
import { buildControlHash, buildGroupHash, buildSearchHash, defaultFilters, parseHash } from "./routing";
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

  it("faellt bei ungueltiger Sortierung auf relevance zurueck", () => {
    const route = parseHash("#/search?sort=totally-invalid");
    expect(route.view).toBe("search");
    if (route.view === "search") {
      expect(route.sort).toBe("relevance");
    }
  });

  it("faengt ungueltige oder leere Parameter bei Group/Control-Routen ab", () => {
    expect(parseHash("#/group/")).toEqual({ view: "home" });
    expect(parseHash("#/control/")).toEqual({ view: "home" });
  });

  it("sanitiziert optionale control/top Route-Parameter fail-closed", () => {
    const route = parseHash("#/search?control=%00%09CTRL-1&top=%20%20");
    expect(route.view).toBe("search");
    if (route.view === "search") {
      expect(route.controlId).toBe("CTRL-1");
      expect(route.controlTopGroupId).toBeNull();
      expect(route.page).toBe(1);
      expect(route.pageSize).toBe(50);
    }
  });

  it("parst und begrenzt page/pageSize in Search- und Group-Routen", () => {
    const searchRoute = parseHash("#/search?q=test&page=3&pageSize=75");
    expect(searchRoute.view).toBe("search");
    if (searchRoute.view === "search") {
      expect(searchRoute.page).toBe(3);
      expect(searchRoute.pageSize).toBe(75);
    }

    const constrainedSearchRoute = parseHash("#/search?q=test&page=-2&pageSize=9999");
    expect(constrainedSearchRoute.view).toBe("search");
    if (constrainedSearchRoute.view === "search") {
      expect(constrainedSearchRoute.page).toBe(1);
      expect(constrainedSearchRoute.pageSize).toBe(200);
    }

    const groupRoute = parseHash("#/group/APP.1?page=2&pageSize=25");
    expect(groupRoute).toEqual({ view: "group", groupId: "APP.1", page: 2, pageSize: 25 });
  });
});

describe("build hash helpers", () => {
  it("kodiert Group- und Control-IDs fuer Hash-Routen", () => {
    expect(buildGroupHash("OPS 1")).toBe("#/group/OPS%201");
    expect(buildGroupHash("OPS 1", { page: 2, pageSize: 75 })).toBe("#/group/OPS%201?page=2&pageSize=75");
    expect(buildControlHash("APP-1.2", "APP ROOT")).toBe("#/control/APP-1.2?top=APP+ROOT");
  });

  it("baut Search-Hash inkl. Facetten und Detailkontext", () => {
    const filters = defaultFilters();
    filters.topGroupId = ["APP"];
    filters.tags = ["netzwerk", "haertung"];
    const hash = buildSearchHash("  Härtung  ", "title-desc", filters, "APP.1", "APP", { page: 2, pageSize: 75 });

    expect(hash).toContain("#/search?");
    expect(hash).toContain("q=H%C3%A4rtung");
    expect(hash).toContain("sort=title-desc");
    expect(hash).toContain("tg=APP");
    expect(hash).toContain("tag=netzwerk");
    expect(hash).toContain("tag=haertung");
    expect(hash).toContain("control=APP.1");
    expect(hash).toContain("top=APP");
    expect(hash).toContain("page=2");
    expect(hash).toContain("pageSize=75");
  });

  it("laesst leere Querys und Default-Sortierung weg", () => {
    const hash = buildSearchHash("   ", "relevance", defaultFilters());
    expect(hash).toBe("#/search");
  });

  it("unterstuetzt parse/build Roundtrip fuer Search-Routen", () => {
    const filters = defaultFilters();
    filters.groupId = ["OPS.1"];
    filters.secLevel = ["hoch"];
    filters.relationTypes = ["required"];
    const hash = buildSearchHash("Kontrolle", "id-asc", filters, "OPS.1.2", "OPS", { page: 4, pageSize: 25 });

    const route = parseHash(hash);
    expect(route.view).toBe("search");
    if (route.view === "search") {
      expect(route.query).toBe("Kontrolle");
      expect(route.sort).toBe("id-asc");
      expect(route.filters.groupId).toEqual(["OPS.1"]);
      expect(route.filters.secLevel).toEqual(["hoch"]);
      expect(route.filters.relationTypes).toEqual(["required"]);
      expect(route.controlId).toBe("OPS.1.2");
      expect(route.controlTopGroupId).toBe("OPS");
      expect(route.page).toBe(4);
      expect(route.pageSize).toBe(25);
    }
  });
});
