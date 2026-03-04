import type { SearchResultItem } from "../types";

interface ResultListProps {
  items: SearchResultItem[];
  total: number;
  query: string;
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (item: SearchResultItem) => void;
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

export function ResultList({ items, total, query, selectedId, loading, error, onSelect }: ResultListProps) {
  if (loading) {
    return <div className="status-box">Index wird abgefragt…</div>;
  }

  if (error) {
    return <div className="status-box error">{error}</div>;
  }

  if (!items.length) {
    return <div className="status-box">Keine Treffer. Filter lockern oder Suchbegriff anpassen.</div>;
  }

  return (
    <section className="result-list" aria-label="Suchergebnisse">
      <header>
        <h2>Ergebnisse</h2>
        <span>{total} Treffer</span>
      </header>

      <ul>
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <li key={item.id}>
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
