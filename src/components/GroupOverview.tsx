import type { CatalogMeta } from "../types";

interface GroupOverviewProps {
  meta: CatalogMeta | null;
  onOpenGroup: (groupId: string) => void;
  onStartSearch: () => void;
  onSelectAllControls: () => void;
  selectingAllControls: boolean;
  allControlsSelected: boolean;
}

function heroIntroText() {
  return "Der Viewer nutzt den fertigen BSI-Grundschutz++-Anwenderkatalog als Primärquelle und stellt Anforderungen für Recherche, Bewertung und Umsetzung in Institutionen strukturiert bereit.";
}

export function GroupOverview({
  meta,
  onOpenGroup,
  onStartSearch,
  onSelectAllControls,
  selectingAllControls,
  allControlsSelected
}: GroupOverviewProps) {
  if (!meta) {
    return <section className="status-box">Katalogdaten werden geladen…</section>;
  }

  const topGroups = meta.groups.filter((group) => group.depth === 1);
  const countByTopGroup = new Map<string, number>();
  for (const group of meta.groups.filter((item) => item.depth > 1)) {
    countByTopGroup.set(group.topGroupId, (countByTopGroup.get(group.topGroupId) ?? 0) + 1);
  }

  return (
    <section className="dashboard-view">
      <article className="hero-card">
        <div className="hero-head">
          <h1>{meta.title}</h1>
        </div>
        <p>{heroIntroText()}</p>
        <p className="hero-stats">
          Aktuell durchsuchbar: {meta.stats.controlCount} Controls in {meta.stats.groupCount} Gruppen.
        </p>
        <div className="hero-actions">
          <button className="primary" type="button" onClick={onStartSearch}>
            Zur Suche
          </button>
          <button className="secondary" type="button" onClick={onSelectAllControls} disabled={selectingAllControls}>
            {selectingAllControls ? "Alles auswählen..." : allControlsSelected ? "Alles abwählen (CSV)" : "Alles auswählen (CSV)"}
          </button>
        </div>
      </article>

      <section>
        <h2>Bereiche</h2>
        <div className="group-grid">
          {topGroups.map((group) => (
            <button key={group.id} type="button" className="group-tile" onClick={() => onOpenGroup(group.id)}>
              <strong className="group-tile-id">{group.id}</strong>
              <span className="group-tile-title">{group.title}</span>
              <em className="group-tile-meta">{countByTopGroup.get(group.id) ?? 0} Untergruppen</em>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
