import type { CatalogMeta, GroupNode } from "../types";

interface GroupOverviewProps {
  meta: CatalogMeta | null;
  onOpenGroup: (groupId: string) => void;
  onStartSearch: () => void;
}

export function GroupOverview({ meta, onOpenGroup, onStartSearch }: GroupOverviewProps) {
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
        <h1>{meta.title}</h1>
        <p>
          Durchsuchbarer CSR-Katalog mit {meta.stats.controlCount} Controls in {meta.stats.groupCount} Gruppen.
        </p>
        <button className="primary" type="button" onClick={onStartSearch}>
          Zur Suche
        </button>
      </article>

      <section>
        <h2>Bereiche</h2>
        <div className="group-grid">
          {topGroups.map((group) => (
            <button key={group.id} type="button" className="group-tile" onClick={() => onOpenGroup(group.id)}>
              <strong>{group.id}</strong>
              <span>{group.title}</span>
              <em>{countByTopGroup.get(group.id) ?? 0} Untergruppen</em>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
