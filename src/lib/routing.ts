import type { SearchQuery } from "../types";
import { safeDecodeURIComponent } from "./safeDecode";
import { sanitizeFilterValues, sanitizeSearchText } from "./searchSafety";
import { SECURITY_BUDGETS } from "./securityBudgets";

export type ActiveFilters = SearchQuery["filters"];

export const defaultFilters = (): ActiveFilters => ({
  topGroupId: [],
  groupId: [],
  secLevel: [],
  effortLevel: [],
  class: [],
  modalverbs: [],
  targetObjects: [],
  tags: [],
  relationTypes: []
});

export interface SearchRouteState {
  view: "search";
  query: string;
  sort: SearchQuery["sort"];
  filters: ActiveFilters;
  controlId: string | null;
  controlTopGroupId: string | null;
}

export type AppRoute =
  | { view: "home" }
  | SearchRouteState
  | { view: "group"; groupId: string }
  | { view: "control"; controlId: string; topGroupId: string | null }
  | { view: "about" }
  | { view: "source" }
  | { view: "impressum" }
  | { view: "datenschutz" };

const filterKeyMap: Array<[keyof ActiveFilters, string]> = [
  ["topGroupId", "tg"],
  ["groupId", "gid"],
  ["secLevel", "sec"],
  ["effortLevel", "eff"],
  ["class", "cls"],
  ["modalverbs", "mod"],
  ["targetObjects", "tgt"],
  ["tags", "tag"],
  ["relationTypes", "rel"]
];

export function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const params = new URLSearchParams(queryPart);

  if (path === "/" || path === "") {
    return { view: "home" };
  }

  if (path.startsWith("/search")) {
    const filters = defaultFilters();
    for (const [facetKey, key] of filterKeyMap) {
      filters[facetKey] = sanitizeFilterValues(params.getAll(key));
    }

    const sort = (params.get("sort") as SearchQuery["sort"]) || "relevance";
    return {
      view: "search",
      query: sanitizeSearchText(params.get("q")),
      sort: ["relevance", "id-asc", "title-asc"].includes(sort) ? sort : "relevance",
      filters,
      controlId: sanitizeRouteToken(params.get("control")),
      controlTopGroupId: sanitizeRouteToken(params.get("top"))
    };
  }

  if (path.startsWith("/group/")) {
    const groupId = safeDecodeURIComponent(path.replace("/group/", ""), "").trim();
    if (!groupId) {
      return { view: "home" };
    }
    return { view: "group", groupId };
  }

  if (path.startsWith("/control/")) {
    const controlId = safeDecodeURIComponent(path.replace("/control/", ""), "").trim();
    if (!controlId) {
      return { view: "home" };
    }
    return {
      view: "control",
      controlId,
      topGroupId: sanitizeRouteToken(params.get("top"))
    };
  }

  if (path === "/about/source") {
    return { view: "source" };
  }

  if (path === "/about") {
    return { view: "about" };
  }

  if (path === "/impressum") {
    return { view: "impressum" };
  }

  if (path === "/datenschutz") {
    return { view: "datenschutz" };
  }

  return { view: "home" };
}

export function buildSearchHash(
  query: string,
  sort: SearchQuery["sort"],
  filters: ActiveFilters,
  controlId?: string | null,
  controlTopGroupId?: string | null
) {
  const params = new URLSearchParams();
  const safeQuery = sanitizeSearchText(query);
  if (safeQuery) {
    params.set("q", safeQuery);
  }
  if (sort !== "relevance") {
    params.set("sort", sort);
  }

  for (const [facetKey, key] of filterKeyMap) {
    for (const value of filters[facetKey]) {
      if (value) {
        params.append(key, value);
      }
    }
  }

  if (controlId) {
    params.set("control", controlId);
  }
  if (controlTopGroupId) {
    params.set("top", controlTopGroupId);
  }

  return `#/search${params.toString() ? `?${params.toString()}` : ""}`;
}

function sanitizeRouteToken(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const safe = value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, SECURITY_BUDGETS.maxShortTextChars);
  return safe || null;
}

export function buildGroupHash(groupId: string) {
  return `#/group/${encodeURIComponent(groupId)}`;
}

export function buildControlHash(controlId: string, topGroupId?: string | null) {
  const params = new URLSearchParams();
  if (topGroupId) {
    params.set("top", topGroupId);
  }
  return `#/control/${encodeURIComponent(controlId)}${params.toString() ? `?${params.toString()}` : ""}`;
}
