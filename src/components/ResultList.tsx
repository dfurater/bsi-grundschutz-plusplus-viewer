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
  onToggleSelectPage: (items: SearchResultItem[], selected: boolean) => void;
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
  onToggleSelectPage
}: ResultListProps) {
  if (loading) {
    return <div className="status-box">Index wird abgefragt…</div>;
  }

  if (error) {
    return <div className="status-box error">{error}</div>;
  }

  if (!items.length) {
    return <div className="status-box">Keine Treffer. Filter lockern oder Suchbegriff anpassen.</div>;
  }

  const selectedOnPageCount = items.filter((item) => selectedControlIds.has(item.id)).length;
  const allOnPageSelected = selectedOnPageCount > 0 && selectedOnPageCount === items.length;

  return (
    <section className="result-list" aria-label="Suchergebnisse">
      <header>
        <h2>Ergebnisse</h2>
        <div className="result-list-header-meta">
          <span>{total} Treffer</span>
          <button type="button" className="secondary compact" onClick={() => onToggleSelectPage(items, !allOnPageSelected)}>
            {allOnPageSelected ? "Auswahl auf Seite aufheben" : "Alle auf Seite auswählen"}
          </button>
        </div>
      </header>

      <ul>
        {items.map((item) => {
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
    </section>
  );
}
