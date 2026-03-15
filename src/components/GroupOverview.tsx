import type { FormEvent } from "react";
import type { CatalogMeta } from "../types";

interface GroupOverviewProps {
  meta: CatalogMeta | null;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  onSubmitSearch: () => void;
  onOpenGroup: (groupId: string) => void;
  onSelectAllControls: () => void;
  selectingAllControls: boolean;
  allControlsSelected: boolean;
}

function heroIntroText() {
  return "Recherche, Bewertung und Orientierung für normativen Inhalt in einer ruhigen, präzisen Arbeitsoberfläche.";
}

export function GroupOverview({
  meta,
  searchText,
  onSearchTextChange,
  onSubmitSearch,
  onOpenGroup,
  onSelectAllControls,
  selectingAllControls,
  allControlsSelected
}: GroupOverviewProps) {
  if (!meta) {
    return <section className="status-box">Katalogdaten werden geladen...</section>;
  }

  const topGroups = meta.groups.filter((group) => group.depth === 1);
  const countByTopGroup = new Map<string, number>();
  for (const group of meta.groups.filter((item) => item.depth > 1)) {
    countByTopGroup.set(group.topGroupId, (countByTopGroup.get(group.topGroupId) ?? 0) + 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmitSearch();
  }

  return (
    <section className="home-console">
      <div className="page-hero home-hero">
        <div className="hero-tag">
          <div className="hero-tag-dot" aria-hidden="true" />
          Regulatory Intelligence Console
        </div>
        <h1 className="hero-title">
          Grundschutz
          <br />
          <span>Explorer</span>
        </h1>
        <p className="hero-desc">{heroIntroText()}</p>

        <form className="c-search-wrapper home-search-panel" role="search" aria-label="Katalog durchsuchen" onSubmit={handleSubmit}>
          <div className="c-search-head">
            <svg className={`c-search-icon ${searchText.trim() ? "active" : ""}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 12l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              className="c-search-input"
              type="search"
              value={searchText}
              placeholder="ID, Titel oder Begriff suchen"
              onChange={(event) => onSearchTextChange(event.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M9.5 9.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Suche
            </button>
          </div>
          <div className="home-search-meta">
            <div className="hero-stats">
              <div>
                <div className="hero-stat-value">{meta.stats.controlCount}</div>
                <div className="hero-stat-label">Controls</div>
              </div>
              <div>
                <div className="hero-stat-value">{meta.stats.groupCount}</div>
                <div className="hero-stat-label">Gruppen</div>
              </div>
              <div>
                <div className="hero-stat-value">{meta.stats.relationCount}</div>
                <div className="hero-stat-label">Relationen</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={onSelectAllControls} disabled={selectingAllControls}>
              {selectingAllControls ? "Auswahl läuft..." : allControlsSelected ? "CSV-Auswahl lösen" : "Alle für CSV markieren"}
            </button>
          </div>
        </form>
      </div>

      <section className="console-section" aria-labelledby="home-groups-title">
        <div className="console-section-header">
          <div>
            <div className="ds-section-tag">Navigation</div>
            <h2 id="home-groups-title" className="ds-section-title">
              Katalogbereiche
            </h2>
          </div>
          <p className="console-section-desc">Kuratiertes Einstiegspanel für die wichtigsten Regelbereiche des Katalogs.</p>
        </div>

        <div className="home-group-grid">
          {topGroups.map((group) => (
            <button key={group.id} type="button" className="home-group-card" onClick={() => onOpenGroup(group.id)}>
              <div className="home-group-card-head">
                <span className="id-label id-label-lg">{group.id}</span>
                <span className="badge badge-default">{countByTopGroup.get(group.id) ?? 0} Untergruppen</span>
              </div>
              <div className="home-group-card-title">{group.title}</div>
              <div className="home-group-card-meta">Direkter Einstieg in {group.id}</div>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
