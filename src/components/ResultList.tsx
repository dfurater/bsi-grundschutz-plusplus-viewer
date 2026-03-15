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

function modalverbBadgeClass(modalverb: string) {
  const normalized = modalverb.toLowerCase();
  if (normalized.includes("muss")) {
    return "badge-success";
  }
  if (normalized.includes("sollte")) {
    return "badge-error";
  }
  if (normalized.includes("kann")) {
    return "badge-default";
  }
  return "badge-default";
}

function securityBadgeClass(value: string | null) {
  const normalized = String(value ?? "").toLowerCase();
  if (!normalized) {
    return "badge-default";
  }
  if (normalized.includes("basis")) {
    return "badge-accent";
  }
  if (normalized.includes("standard")) {
    return "badge-default";
  }
  return "badge-amber";
}

function renderSkeletonCards() {
  return Array.from({ length: 3 }, (_, index) => (
    <div key={`skeleton-card-${index}`} className="c-skeleton-card result-skeleton-card">
      <div className="flex gap-2 mb-3">
        <div className="skeleton result-skeleton-id" />
        <div className="skeleton result-skeleton-badge" />
      </div>
      <div className="skeleton result-skeleton-title" />
      <div className="skeleton result-skeleton-line" />
      <div className="skeleton result-skeleton-line short" />
      <div className="flex gap-2">
        <div className="skeleton result-skeleton-chip" />
        <div className="skeleton result-skeleton-chip wide" />
      </div>
    </div>
  ));
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
      <section
        className="result-list result-list-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
        tabIndex={-1}
        data-search-results-focus="loading"
      >
        <header className="result-list-header">
          <div>
            <div className="ds-section-tag">Suche</div>
            <h2 id="search-results-heading">Ergebnisse werden geladen</h2>
          </div>
        </header>
        <div className="result-list-loading">{renderSkeletonCards()}</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="result-list result-list-state" role="alert" tabIndex={-1} data-search-results-focus="status">
        <div className="c-empty-state empty-state-error">
          <div className="c-empty-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="11" cy="15.5" r=".9" fill="currentColor" />
            </svg>
          </div>
          <div className="c-empty-title">Suche fehlgeschlagen</div>
          <div className="c-empty-desc">{error}</div>
        </div>
      </section>
    );
  }

  if (!items.length) {
    const emptyMessage = normalizedQuery
      ? `Die Kombination aus Suchbegriff "${normalizedQuery}" und aktiven Filtern liefert keine Ergebnisse.`
      : "Der aktuelle Suchkontext liefert keine Ergebnisse.";

    return (
      <section
        className="result-list result-list-state"
        role="status"
        aria-live="polite"
        tabIndex={-1}
        data-search-results-focus="status"
      >
        <div className="c-empty-state">
          <div className="c-empty-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 10h4M10 8v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="c-empty-title">Keine Treffer</div>
          <div className="c-empty-desc">{emptyMessage}</div>
          {hasActiveFilters && onResetFilters ? (
            <button type="button" className="c-empty-action" onClick={onResetFilters}>
              Filter zurücksetzen
            </button>
          ) : null}
        </div>
      </section>
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
      <header className="result-list-header">
        <div>
          <div className="ds-section-tag">Suchmodus</div>
          <h2 id="search-results-heading">Ergebnisse</h2>
        </div>
        <div className="result-list-header-meta">
          <span className="c-search-count">{total} Treffer</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onSelectAllControls} disabled={selectingAllControls}>
            {selectingAllControls ? "Auswahl läuft..." : allControlsSelected ? "Auswahl lösen" : "Alle markieren"}
          </button>
        </div>
      </header>

      <ul className="result-list-items">
        {visibleItems.map((item) => {
          const selected = item.id === selectedId;
          const exportSelected = selectedControlIds.has(item.id);
          const cardStateClass = selected ? "state-selected" : exportSelected ? "state-export" : "";

          return (
            <li key={item.id}>
              <article className={`c-result-card result-card ${cardStateClass}`} data-state={cardStateClass || "default"}>
                <div className="c-result-card-top">
                  <div className="c-result-card-meta">
                    <span className="id-label">{item.id}</span>
                    <span className={`badge ${securityBadgeClass(item.secLevel)}`}>{item.secLevel || item.topGroupId}</span>
                    {item.modalverbs[0] ? (
                      <span className={`badge ${modalverbBadgeClass(item.modalverbs[0])}`}>{item.modalverbs[0]}</span>
                    ) : null}
                  </div>

                  <label className="card-export-toggle" title="Für CSV auswählen">
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={exportSelected}
                      onChange={(event) => onToggleSelection(item, event.currentTarget.checked)}
                      aria-label={`Control ${item.id} für CSV auswählen`}
                    />
                    <span className={`icon-btn ${exportSelected ? "export-active" : ""}`} aria-hidden="true">
                      <svg viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 9.5h8M6 2v5M3.5 4.5L6 7l2.5-2.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </label>
                </div>

                <button type="button" className="result-card-button" onClick={() => onSelect(item)} aria-current={selected ? "true" : undefined}>
                  <h3 className="c-result-card-title">{item.title}</h3>
                  {item.snippet ? <p className="c-result-card-snippet">{markMatches(item.snippet, query)}</p> : null}
                  <div className="c-result-card-footer">
                    <span className="badge badge-default">{item.topGroupId}</span>
                    {item.effortLevel ? <span className="chip chip-default">Aufwand {item.effortLevel}</span> : null}
                    {item.class ? <span className="chip chip-default">{item.class}</span> : null}
                    {exportSelected ? <span className="chip chip-amber">Export</span> : null}
                  </div>
                </button>
              </article>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 ? (
        <nav className="list-pagination" aria-label="Seitennavigation Suchergebnisse">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
            Vorherige Seite
          </button>
          <p className="list-pagination-status" aria-live="polite">
            Seite {currentPage} von {totalPages} ({visibleStart}-{visibleEnd})
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
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
