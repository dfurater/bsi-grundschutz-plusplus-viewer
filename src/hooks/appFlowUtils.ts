import type { ActiveFilters } from "../lib/routing";
import type { SearchQuery } from "../types";

export type SortBase = "relevance" | "id" | "title" | "effort";

export function getSortBase(sort: SearchQuery["sort"]): SortBase {
  if (sort.startsWith("id-")) {
    return "id";
  }
  if (sort.startsWith("title-")) {
    return "title";
  }
  if (sort.startsWith("effort-")) {
    return "effort";
  }
  return "relevance";
}

export function getSortDirection(sort: SearchQuery["sort"]): "asc" | "desc" {
  return sort.endsWith("-desc") ? "desc" : "asc";
}

export function toSortValue(base: SortBase, direction: "asc" | "desc"): SearchQuery["sort"] {
  if (base === "id") {
    return direction === "asc" ? "id-asc" : "id-desc";
  }
  if (base === "title") {
    return direction === "asc" ? "title-asc" : "title-desc";
  }
  if (base === "effort") {
    return direction === "asc" ? "effort-asc" : "effort-desc";
  }
  return "relevance";
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}

export function mapRouteFilters(filters: ActiveFilters): SearchQuery["filters"] {
  return {
    topGroupId: [...filters.topGroupId],
    groupId: [...filters.groupId],
    secLevel: [...filters.secLevel],
    effortLevel: [...filters.effortLevel],
    class: [...filters.class],
    modalverbs: [...filters.modalverbs],
    targetObjects: [...filters.targetObjects],
    tags: [...filters.tags],
    relationTypes: [...filters.relationTypes]
  };
}

export function navigate(hash: string) {
  if (window.location.hash === hash.replace(/^#/, "#")) {
    return;
  }
  window.location.hash = hash;
}
