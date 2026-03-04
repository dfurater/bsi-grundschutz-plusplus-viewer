import { useState } from "react";
import type { SearchResponse } from "../types";

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
  onToggle: (facet: keyof ActiveFilters, value: string) => void;
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

export function FacetPanel({ facets, filters, onToggle, onReset }: FacetPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside className="facet-panel" aria-label="Filter">
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
              onClick={() => setCollapsed((prev) => ({ ...prev, [facetKey]: !isCollapsed }))}
            >
              <span>{FACET_LABELS[facetKey]}</span>
              <strong>{isCollapsed ? "+" : "−"}</strong>
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
