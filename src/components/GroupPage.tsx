import type { GroupNode, SearchResultItem } from "../types";

interface GroupPageProps {
  group: GroupNode | null;
  subgroups: GroupNode[];
  controls: SearchResultItem[];
  page: number;
  pageSize: number;
  selectedControlIds: Set<string>;
  loading: boolean;
  selectingAllControls: boolean;
  allControlsSelected: boolean;
  onOpenSubgroup: (id: string) => void;
  onOpenControl: (control: SearchResultItem) => void;
  onPageChange: (page: number) => void;
  onToggleControlSelection: (control: SearchResultItem, selected: boolean) => void;
  onSelectAllControls: () => void;
}

function renderGroupLoadingRows() {
  return Array.from({ length: 3 }, (_, index) => (
    <div key={`group-loading-${index}`} className="c-skeleton-card result-skeleton-card">
      <div className="flex gap-2 mb-3">
        <div className="skeleton result-skeleton-id" />
        <div className="skeleton result-skeleton-badge" />
      </div>
      <div className="skeleton result-skeleton-title" />
      <div className="skeleton result-skeleton-line short" />
    </div>
  ));
}

export function GroupPage({
  group,
  subgroups,
  controls,
  page,
  pageSize,
  selectedControlIds,
  loading,
  selectingAllControls,
  allControlsSelected,
  onOpenSubgroup,
  onOpenControl,
  onPageChange,
  onToggleControlSelection,
  onSelectAllControls
}: GroupPageProps) {
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 50;
  const totalPages = Math.max(1, Math.ceil(controls.length / safePageSize));
  const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page)));
  const sliceStart = (currentPage - 1) * safePageSize;
  const visibleControls = controls.slice(sliceStart, sliceStart + safePageSize);
  const visibleStart = sliceStart + 1;
  const visibleEnd = sliceStart + visibleControls.length;

  if (!group) {
    return (
      <section className="group-page">
        <div className="c-empty-state empty-state-error">
          <div className="c-empty-title">Gruppe nicht gefunden</div>
          <div className="c-empty-desc">Die angeforderte Gruppe konnte nicht geladen werden.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="group-page console-page">
      <header className="console-page-header">
        <div className="ds-section-tag">Gruppe</div>
        <div className="group-page-headline">
          <span className="id-label id-label-lg">{group.id}</span>
          <h1 className="console-page-title">{group.title}</h1>
        </div>
        <nav aria-label="Breadcrumb" className="detail-breadcrumb">
          {group.pathTitles.map((title, index) => {
            const groupId = group.pathIds[index];
            const isLast = index === group.pathTitles.length - 1;
            return (
              <span key={`group-breadcrumb-${groupId || index}`} className="detail-breadcrumb-item">
                {isLast ? (
                  <span className="detail-breadcrumb-link current" aria-current="page">
                    {title}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="detail-breadcrumb-link"
                    onClick={() => {
                      if (groupId) {
                        onOpenSubgroup(groupId);
                      }
                    }}
                  >
                    {title}
                  </button>
                )}
                {!isLast ? <span className="c-detail-group-path-sep">›</span> : null}
              </span>
            );
          })}
        </nav>
      </header>

      {subgroups.length > 0 ? (
        <section className="console-section" aria-labelledby="group-subgroups-title">
          <div className="console-section-header">
            <div>
              <div className="ds-section-tag">Navigation</div>
              <h2 id="group-subgroups-title" className="ds-section-title">
                Untergruppen
              </h2>
            </div>
          </div>
          <div className="home-group-grid compact">
            {subgroups.map((subgroup) => (
              <button key={subgroup.id} type="button" className="home-group-card compact" onClick={() => onOpenSubgroup(subgroup.id)}>
                <div className="home-group-card-head">
                  <span className="id-label">{subgroup.id}</span>
                </div>
                <div className="home-group-card-title">{subgroup.title}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="console-section" aria-labelledby="group-controls-title">
        <div className="console-section-header">
          <div>
            <div className="ds-section-tag">Arbeitsliste</div>
            <h2 id="group-controls-title" className="ds-section-title">
              Controls
            </h2>
          </div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={onSelectAllControls} disabled={selectingAllControls}>
            {selectingAllControls ? "Auswahl läuft..." : allControlsSelected ? "Auswahl lösen" : "Alle markieren"}
          </button>
        </div>

        {loading ? (
          <div className="result-list-loading" aria-busy="true">
            {renderGroupLoadingRows()}
          </div>
        ) : null}

        <ul className="group-control-list">
          {visibleControls.map((control) => {
            const exportSelected = selectedControlIds.has(control.id);

            return (
              <li key={control.id}>
                <article className={`c-result-card group-control-card ${exportSelected ? "state-export" : ""}`}>
                  <div className="c-result-card-top">
                    <div className="c-result-card-meta">
                      <span className="id-label">{control.id}</span>
                      <span className="badge badge-default">{control.topGroupId}</span>
                    </div>

                    <label className="card-export-toggle" title="Für CSV auswählen">
                      <input
                        className="sr-only"
                        type="checkbox"
                        checked={exportSelected}
                        onChange={(event) => onToggleControlSelection(control, event.currentTarget.checked)}
                        aria-label={`Control ${control.id} für CSV auswählen`}
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

                  <button type="button" className="result-card-button" onClick={() => onOpenControl(control)}>
                    <h3 className="c-result-card-title">{control.title}</h3>
                    <div className="c-result-card-footer">
                      {control.secLevel ? <span className="chip chip-default">{control.secLevel}</span> : null}
                      {control.modalverbs[0] ? <span className="chip chip-default">{control.modalverbs[0]}</span> : null}
                      {exportSelected ? <span className="chip chip-amber">Export</span> : null}
                    </div>
                  </button>
                </article>
              </li>
            );
          })}
        </ul>

        {totalPages > 1 ? (
          <nav className="list-pagination" aria-label="Seitennavigation Gruppen-Controls">
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
    </section>
  );
}
