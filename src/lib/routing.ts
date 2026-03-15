import type { SearchQuery } from "../types";
import { safeDecodeURIComponent } from "./safeDecode";
import { sanitizeFilterValues, sanitizeSearchText } from "./searchSafety";
import { SECURITY_BUDGETS } from "./securityBudgets";

export type ActiveFilters = SearchQuery["filters"];

export const DEFAULT_ROUTE_PAGE = 1;
export const DEFAULT_ROUTE_PAGE_SIZE = 50;
const MAX_ROUTE_PAGE = 10000;
const MAX_ROUTE_PAGE_SIZE = 200;

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

interface RoutePaginationState {
  page: number;
  pageSize: number;
}

export interface SearchRouteState {
  view: "search";
  query: string;
  sort: SearchQuery["sort"];
  filters: ActiveFilters;
  controlId: string | null;
  controlTopGroupId: string | null;
  page: number;
  pageSize: number;
}

export interface RoutePaginationOptions {
  page?: number | null;
  pageSize?: number | null;
}

export type AppRoute =
  | { view: "home" }
  | SearchRouteState
  | ({ view: "group"; groupId: string } & RoutePaginationState)
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
  const page = parseRoutePage(params.get("page"));
  const pageSize = parseRoutePageSize(params.get("pageSize"));

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
      sort: ["relevance", "id-asc", "id-desc", "title-asc", "title-desc", "effort-asc", "effort-desc"].includes(sort)
        ? sort
        : "relevance",
      filters,
      controlId: sanitizeRouteToken(params.get("control")),
      controlTopGroupId: sanitizeRouteToken(params.get("top")),
      page,
      pageSize
    };
  }

  if (path.startsWith("/group/")) {
    const groupId = safeDecodeURIComponent(path.replace("/group/", ""), "").trim();
    if (!groupId) {
      return { view: "home" };
    }
    return { view: "group", groupId, page, pageSize };
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

  if (path === "/about/license" || path === "/about/source") {
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
  controlTopGroupId?: string | null,
  pagination: RoutePaginationOptions = {}
) {
  const params = new URLSearchParams();
  const safeQuery = sanitizeSearchText(query);
  const page = sanitizeRoutePageNumber(pagination.page);
  const pageSize = sanitizeRoutePageSizeNumber(pagination.pageSize);
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
  if (page > DEFAULT_ROUTE_PAGE) {
    params.set("page", String(page));
  }
  if (pageSize !== DEFAULT_ROUTE_PAGE_SIZE) {
    params.set("pageSize", String(pageSize));
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

export function buildGroupHash(groupId: string, pagination: RoutePaginationOptions = {}) {
  const params = new URLSearchParams();
  const page = sanitizeRoutePageNumber(pagination.page);
  const pageSize = sanitizeRoutePageSizeNumber(pagination.pageSize);
  if (page > DEFAULT_ROUTE_PAGE) {
    params.set("page", String(page));
  }
  if (pageSize !== DEFAULT_ROUTE_PAGE_SIZE) {
    params.set("pageSize", String(pageSize));
  }
  return `#/group/${encodeURIComponent(groupId)}${params.toString() ? `?${params.toString()}` : ""}`;
}

export function buildControlHash(controlId: string, topGroupId?: string | null) {
  const params = new URLSearchParams();
  if (topGroupId) {
    params.set("top", topGroupId);
  }
  return `#/control/${encodeURIComponent(controlId)}${params.toString() ? `?${params.toString()}` : ""}`;
}

function parseRoutePage(value: string | null): number {
  return parseRouteNumber(value, DEFAULT_ROUTE_PAGE, MAX_ROUTE_PAGE);
}

function parseRoutePageSize(value: string | null): number {
  return parseRouteNumber(value, DEFAULT_ROUTE_PAGE_SIZE, MAX_ROUTE_PAGE_SIZE);
}

function parseRouteNumber(value: string | null, fallback: number, max: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 1) {
    return fallback;
  }
  return Math.min(max, parsed);
}

function sanitizeRoutePageNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_ROUTE_PAGE;
  }
  return Math.max(DEFAULT_ROUTE_PAGE, Math.min(MAX_ROUTE_PAGE, Math.floor(value)));
}

function sanitizeRoutePageSizeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_ROUTE_PAGE_SIZE;
  }
  return Math.max(DEFAULT_ROUTE_PAGE, Math.min(MAX_ROUTE_PAGE_SIZE, Math.floor(value)));
}
