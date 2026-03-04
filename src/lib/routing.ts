import type { SearchQuery } from "../types";

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
  | { view: "source" };

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
      filters[facetKey] = params.getAll(key).filter(Boolean);
    }

    const sort = (params.get("sort") as SearchQuery["sort"]) || "relevance";
    return {
      view: "search",
      query: params.get("q") ?? "",
      sort: ["relevance", "id-asc", "title-asc"].includes(sort) ? sort : "relevance",
      filters,
      controlId: params.get("control"),
      controlTopGroupId: params.get("top")
    };
  }

  if (path.startsWith("/group/")) {
    const groupId = decodeURIComponent(path.replace("/group/", ""));
    return { view: "group", groupId };
  }

  if (path.startsWith("/control/")) {
    const controlId = decodeURIComponent(path.replace("/control/", ""));
    return {
      view: "control",
      controlId,
      topGroupId: params.get("top")
    };
  }

  if (path === "/about/source") {
    return { view: "source" };
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
  if (query.trim()) {
    params.set("q", query.trim());
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
