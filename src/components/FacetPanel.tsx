import { useEffect, useState } from "react";
import type { SearchResponse } from "../types";

type SortBase = "relevance" | "id" | "title" | "effort";

export interface ActiveFilters {
  topGroupId: string[];
  groupId: string[];
  secLevel: string[];
  effortLevel: string[];
  class: string[];
  modalverbs: string[];
  targetObjects: string[];
  tags: string[];
  relationTypes: string[];
}

interface FacetPanelProps {
  facets: SearchResponse["facets"];
  filters: ActiveFilters;
  sortBase: SortBase;
  sortDirection: "asc" | "desc";
  effortSortEnabled: boolean;
  onToggle: (facet: keyof ActiveFilters, value: string) => void;
  onSortBaseChange: (value: SortBase) => void;
  onSortDirectionToggle: () => void;
  onReset: () => void;
}

export const FACET_LABELS: Record<keyof ActiveFilters, string> = {
  topGroupId: "Top-Gruppen",
  groupId: "Gruppen",
  secLevel: "Schutzniveau",
  effortLevel: "Aufwand",
  class: "Klasse",
  modalverbs: "Modalverben",
  targetObjects: "Zielobjekte",
  tags: "Tags",
  relationTypes: "Relationen"
};

export const FACET_ORDER: Array<keyof ActiveFilters> = [
  "topGroupId",
  "groupId",
  "secLevel",
  "effortLevel",
  "class",
  "modalverbs",
  "targetObjects",
  "tags",
  "relationTypes"
];

const DEFAULT_OPEN_FACETS = new Set<keyof ActiveFilters>(["topGroupId", "secLevel", "effortLevel"]);

function buildCollapsedState(
  facets: SearchResponse["facets"],
  filters: ActiveFilters
): Record<keyof ActiveFilters, boolean> {
  return FACET_ORDER.reduce(
    (state, facetKey) => {
      const options = facets?.[facetKey] ?? [];
      if (!options.length) {
        state[facetKey] = true;
        return state;
      }

      const hasActiveFilters = filters[facetKey].length > 0;
      state[facetKey] = !(hasActiveFilters || DEFAULT_OPEN_FACETS.has(facetKey));
      return state;
    },
    {} as Record<keyof ActiveFilters, boolean>
  );
}

function sortFacetOptions(
  facetKey: keyof ActiveFilters,
  options: Array<{ value: string; count: number }>
): Array<{ value: string; count: number }> {
  if (facetKey !== "effortLevel") {
    return options;
  }

  return [...options].sort((a, b) => {
    const aNum = Number(a.value);
    const bNum = Number(b.value);
    const aValid = Number.isFinite(aNum);
    const bValid = Number.isFinite(bNum);

    if (aValid && bValid) {
      return bNum - aNum;
    }
    if (aValid) {
      return -1;
    }
    if (bValid) {
      return 1;
    }
    return b.value.localeCompare(a.value, "de");
  });
}

function sortLabel(sortBase: SortBase, sortDirection: "asc" | "desc") {
  if (sortBase === "relevance") {
    return "Relevanz";
  }

  const directionLabel = sortDirection === "asc" ? "aufsteigend" : "absteigend";
  if (sortBase === "id") {
    return `ID ${directionLabel}`;
  }
  if (sortBase === "title") {
    return `Titel ${directionLabel}`;
  }
  return `Aufwand ${directionLabel}`;
}

export function FacetPanel({
  facets,
  filters,
  sortBase,
  sortDirection,
  effortSortEnabled,
  onToggle,
  onSortBaseChange,
  onSortDirectionToggle,
  onReset
}: FacetPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<keyof ActiveFilters, boolean>>(() => buildCollapsedState(facets, filters));
  const activeFilterCount = Object.values(filters).reduce((sum, entries) => sum + entries.length, 0);

  useEffect(() => {
    setCollapsed((previous) => {
      let changed = false;
      const nextState = { ...previous };

      for (const facetKey of FACET_ORDER) {
        const options = facets?.[facetKey] ?? [];
        if (!options.length) {
          if (nextState[facetKey] !== true) {
            nextState[facetKey] = true;
            changed = true;
          }
          continue;
        }

        if (!(facetKey in nextState)) {
          nextState[facetKey] = buildCollapsedState(facets, filters)[facetKey];
          changed = true;
          continue;
        }

        if (filters[facetKey].length > 0 && nextState[facetKey]) {
          nextState[facetKey] = false;
          changed = true;
        }
      }

      return changed ? nextState : previous;
    });
  }, [facets, filters]);

  return (
    <aside className="facet-panel c-filter-panel" aria-label="Filter">
      <div className="c-filter-header">
        <div className="facet-panel-heading">
          <span className="c-filter-title">Filter</span>
          <span className="facet-sort-summary">{sortLabel(sortBase, sortDirection)}</span>
        </div>
        <button type="button" className={`c-filter-reset ${activeFilterCount > 0 ? "visible" : ""}`} onClick={onReset}>
          Zurücksetzen
        </button>
      </div>

      <div className="facet-sort-tools">
        <label htmlFor="facet-sort-select" className="facet-sort-label">
          Sortierung
        </label>
        <div className="facet-sort-controls">
          <select
            id="facet-sort-select"
            value={sortBase}
            onChange={(event) => onSortBaseChange(event.target.value as SortBase)}
            aria-label="Sortierung"
          >
            <option value="relevance">Relevanz</option>
            <option value="id">ID</option>
            <option value="title">Titel</option>
            <option value="effort" disabled={!effortSortEnabled}>
              Aufwand
            </option>
          </select>
          {sortBase !== "relevance" ? (
            <button
              type="button"
              className="icon-btn"
              aria-label={sortDirection === "asc" ? "Sortierung absteigend" : "Sortierung aufsteigend"}
              onClick={onSortDirectionToggle}
            >
              <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d={sortDirection === "asc" ? "M6 2v8M3.5 4.5L6 2l2.5 2.5" : "M6 10V2M3.5 7.5L6 10l2.5-2.5"}
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {FACET_ORDER.map((facetKey) => {
        const options = facets?.[facetKey] ?? [];
        if (!options.length) {
          return null;
        }

        const isCollapsed = collapsed[facetKey] ?? true;
        const activeCount = filters[facetKey].length;
        const sortedOptions = sortFacetOptions(facetKey, options);

        return (
          <section key={facetKey} className="c-filter-group facet-group">
            <button
              type="button"
              className="c-filter-group-head"
              aria-expanded={!isCollapsed}
              aria-label={`${FACET_LABELS[facetKey]} ein- oder ausklappen`}
              onClick={() => setCollapsed((prev) => ({ ...prev, [facetKey]: !isCollapsed }))}
            >
              <span className="c-filter-group-name">
                {FACET_LABELS[facetKey]}
                <span className={`c-filter-group-count ${activeCount > 0 ? "has-active" : ""}`}>{activeCount}</span>
              </span>
              <span className="facet-group-icon" aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d={isCollapsed ? "M3 4l2 2 2-2" : "M7 4l-2 2-2-2"}
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>

            {!isCollapsed ? (
              <div className="c-filter-items">
                {sortedOptions.slice(0, facetKey === "tags" ? 40 : 20).map((option) => {
                  const selected = filters[facetKey].includes(option.value);

                  return (
                    <label key={`${facetKey}-${option.value}`} className={`c-filter-item ${selected ? "checked" : ""}`}>
                      <span className="c-filter-item-left">
                        <input
                          className="sr-only"
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggle(facetKey, option.value)}
                          aria-label={`${FACET_LABELS[facetKey]} ${option.value}`}
                        />
                        <span className={`c-checkbox ${selected ? "checked" : ""}`} aria-hidden="true">
                          {selected ? (
                            <svg viewBox="0 0 8 8" fill="none">
                              <path
                                d="M1 4l2 2 4-4"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </span>
                        <span className="c-filter-item-label">{option.value}</span>
                      </span>
                      <span className="c-filter-item-num">{option.count}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </aside>
  );
}
