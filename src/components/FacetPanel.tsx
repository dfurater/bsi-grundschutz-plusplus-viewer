import { useState } from "react";
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

const FACET_LABELS: Record<keyof ActiveFilters, string> = {
  topGroupId: "Top-Gruppe",
  groupId: "Gruppe",
  secLevel: "Sicherheitsniveau",
  effortLevel: "Aufwand",
  class: "Klasse",
  modalverbs: "Modalverb",
  targetObjects: "Zielobjekte",
  tags: "Tags",
  relationTypes: "Relationen"
};

const FACET_ORDER: Array<keyof ActiveFilters> = [
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    /* REQ: US-08, A11y-02 */
    <aside className="facet-panel" aria-label="Filter">
      {/* REQ: User Request Sort-Umzug Sidebar */}
      <div className="facet-sort-block">
        <label htmlFor="facet-sort-select" className="facet-sort-label">
          Relevanz
        </label>
        <div className="sort-controls">
          <select
            id="facet-sort-select"
            value={sortBase}
            onChange={(event) => onSortBaseChange(event.target.value as SortBase)}
            aria-label="Relevanz"
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
              className="icon-button"
              aria-label={sortDirection === "asc" ? "Sortierung absteigend" : "Sortierung aufsteigend"}
              onClick={onSortDirectionToggle}
            >
              {sortDirection === "asc" ? "↑" : "↓"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="facet-panel-header">
        <h2>Filter</h2>
        <button type="button" className="link-button" onClick={onReset}>
          Zurücksetzen
        </button>
      </div>

      {FACET_ORDER.map((facetKey) => {
        const options = facets?.[facetKey] ?? [];
        if (!options.length) {
          return null;
        }

        const isCollapsed = collapsed[facetKey] ?? false;
        const sortedOptions = sortFacetOptions(facetKey, options);

        return (
          <section key={facetKey} className={`facet-section ${isCollapsed ? "collapsed" : ""}`}>
            <button
              type="button"
              className="facet-toggle"
              aria-expanded={!isCollapsed}
              aria-label={`${FACET_LABELS[facetKey]} ein- oder ausklappen`}
              onClick={() => setCollapsed((prev) => ({ ...prev, [facetKey]: !isCollapsed }))}
            >
              <span>{FACET_LABELS[facetKey]}</span>
              <span className="accordion-indicator" aria-hidden="true">
                ▾
              </span>
            </button>

            {!isCollapsed ? (
              <ul>
                {sortedOptions.slice(0, facetKey === "tags" ? 40 : 20).map((option) => {
                  const selected = filters[facetKey].includes(option.value);
                  return (
                    <li key={`${facetKey}-${option.value}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggle(facetKey, option.value)}
                          aria-label={`${FACET_LABELS[facetKey]} ${option.value}`}
                        />
                        <span>{option.value}</span>
                        <em>{option.count}</em>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </aside>
  );
}
