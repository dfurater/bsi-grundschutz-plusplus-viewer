import type { SearchResultItem } from "../types";

interface ResultListProps {
  items: SearchResultItem[];
  total: number;
  query: string;
  page: number;
  pageSize: number;
  selectedId: string | null;
  selectedControlIds: Set<string>;
  loading: boolean;
  error: string | null;
  onSelect: (item: SearchResultItem) => void;
  onPageChange: (page: number) => void;
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
  page,
  pageSize,
  selectedId,
  selectedControlIds,
  loading,
  error,
  onSelect,
  onPageChange,
  onToggleSelection,
  onSelectAllControls,
  selectingAllControls,
  allControlsSelected,
  hasActiveFilters,
  onResetFilters
}: ResultListProps) {
  const normalizedQuery = query.trim();
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 50;
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page)));
  const sliceStart = (currentPage - 1) * safePageSize;
  const visibleItems = items.slice(sliceStart, sliceStart + safePageSize);
  const visibleStart = sliceStart + 1;
  const visibleEnd = sliceStart + visibleItems.length;

  if (loading) {
    return (
      <div className="status-box" role="status" aria-live="polite" tabIndex={-1} data-search-results-focus="loading">
        Index wird abgefragt…
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-box error" role="alert" tabIndex={-1} data-search-results-focus="status">
        {error}
      </div>
    );
  }

  if (!items.length) {
    const emptyMessage = normalizedQuery
      ? `Keine Ergebnisse für „${normalizedQuery}“. Passe Suche oder Filter an.`
      : "Keine Ergebnisse. Passe Suche oder Filter an.";
    return (
      <div className="status-box" role="status" aria-live="polite" tabIndex={-1} data-search-results-focus="status">
        {/* REQ: A-02, Clarification Pack §9 */}
        <h2>Keine Treffer</h2>
        <p>{emptyMessage}</p>
        {hasActiveFilters && onResetFilters ? (
          <button type="button" className="secondary" onClick={onResetFilters}>
            Filter zurücksetzen
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className="result-list"
      aria-label="Suchergebnisse"
      aria-labelledby="search-results-heading"
      tabIndex={-1}
      data-search-results-focus="results"
    >
      <header>
        <h2 id="search-results-heading">Ergebnisse</h2>
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

      {totalPages > 1 ? (
        <nav className="list-pagination" aria-label="Seitennavigation Suchergebnisse">
          <button type="button" className="secondary" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
            Vorherige Seite
          </button>
          <p className="list-pagination-status" aria-live="polite">
            Seite {currentPage} von {totalPages} ({visibleStart}-{visibleEnd})
          </p>
          <button
            type="button"
            className="secondary"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Nächste Seite
          </button>
        </nav>
      ) : null}
    </section>
  );
}
