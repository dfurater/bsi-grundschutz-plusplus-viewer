import { useEffect, useMemo, useState } from "react";
import type { SearchResultItem } from "../types";

interface ResultListProps {
  items: SearchResultItem[];
  total: number;
  query: string;
  selectedId: string | null;
  selectedControlIds: Set<string>;
  loading: boolean;
  error: string | null;
  onSelect: (item: SearchResultItem) => void;
  onToggleSelection: (item: SearchResultItem, selected: boolean) => void;
  onSelectAllControls: () => void;
  selectingAllControls: boolean;
  allControlsSelected: boolean;
  hasActiveFilters: boolean;
  onResetFilters?: () => void;
}

function markMatches(text: string, query: string) {
  if (!query.trim()) {
    return text;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "i");
  const segments = text.split(regex);
  return segments.map((segment, index) =>
    segment.toLowerCase() === query.toLowerCase() ? <mark key={`${segment}-${index}`}>{segment}</mark> : segment
  );
}

export function ResultList({
  items,
  total,
  query,
  selectedId,
  selectedControlIds,
  loading,
  error,
  onSelect,
  onToggleSelection,
  onSelectAllControls,
  selectingAllControls,
  allControlsSelected,
  hasActiveFilters,
  onResetFilters
}: ResultListProps) {
  /* REQ: EC-03, UI 5.2 Group/Search Pagination */
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    setVisibleCount(25);
  }, [items, query]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  if (loading) {
    return <div className="status-box">Index wird abgefragt…</div>;
  }

  if (error) {
    return <div className="status-box error">{error}</div>;
  }

  if (!items.length) {
    return (
      <div className="status-box">
        {/* REQ: A-02, Clarification Pack §9 */}
        <h2>Keine Treffer</h2>
        <p>Passe Suche oder Filter an.</p>
        {hasActiveFilters && onResetFilters ? (
          <button type="button" className="secondary" onClick={onResetFilters}>
            Filter zurücksetzen
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section className="result-list" aria-label="Suchergebnisse">
      <header>
        <h2>Ergebnisse</h2>
        <div className="result-list-header-meta">
          <span>{total} Treffer</span>
          <button type="button" className="secondary compact" onClick={onSelectAllControls} disabled={selectingAllControls}>
            {selectingAllControls ? "Alles auswählen..." : allControlsSelected ? "Alles abwählen" : "Alles auswählen"}
          </button>
        </div>
      </header>

      <ul>
        {visibleItems.map((item) => {
          const selected = item.id === selectedId;
          const exportSelected = selectedControlIds.has(item.id);
          return (
            <li key={item.id}>
              <article className={`result-card-shell ${exportSelected ? "export-selected" : ""}`}>
                <label className="control-selection">
                  <input
                    type="checkbox"
                    checked={exportSelected}
                    onChange={(event) => onToggleSelection(item, event.currentTarget.checked)}
                  />
                  <span>Für CSV auswählen</span>
                </label>
                <button
                  type="button"
                  className={`result-card ${selected ? "selected" : ""}`}
                  onClick={() => onSelect(item)}
                >
                  <div className="result-topline">
                    <strong>{item.id}</strong>
                    <span>{item.topGroupId}</span>
                  </div>
                  <h3>{item.title}</h3>
                  {item.snippet ? <p>{markMatches(item.snippet, query)}</p> : null}
                  <div className="chip-row">
                    {item.secLevel ? <span className="chip">{item.secLevel}</span> : null}
                    {item.effortLevel ? <span className="chip">Aufwand {item.effortLevel}</span> : null}
                    {item.modalverbs.slice(0, 1).map((modal) => (
                      <span className="chip" key={`${item.id}-${modal}`}>
                        {modal}
                      </span>
                    ))}
                  </div>
                </button>
              </article>
            </li>
          );
        })}
      </ul>

      {visibleCount < items.length ? (
        <div className="list-pagination">
          <button type="button" className="secondary" onClick={() => setVisibleCount((prev) => prev + 25)}>
            Mehr laden
          </button>
        </div>
      ) : null}
    </section>
  );
}
