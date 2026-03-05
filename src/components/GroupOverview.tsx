import type { CatalogMeta, GroupNode } from "../types";

interface GroupOverviewProps {
  meta: CatalogMeta | null;
  datasetId: string;
  onOpenGroup: (groupId: string) => void;
  onStartSearch: () => void;
}

function heroIntroTextForDataset(datasetId: string) {
  if (datasetId === "anwender") {
    return "Der Grundschutz++ ist eine vom Bundesamt für Sicherheit in der Informationstechnik (BSI) entwickelte und frei verfügbare Vorgehensweise, um ein ganzheitliches Informationssicherheits-Managementsystem (ISMS) in Institutionen aufzubauen und dauerhaft zu betreiben. Dieser Katalog enthält sowohl die Anforderungen zur Umsetzung der Grundschutz-Methodik als auch konkrete technisch-organisatorische Anforderungen zur Absicherung.";
  }
  if (datasetId === "kernel") {
    return "Der BSI-Kernelkatalog bündelt grundlegende Sicherheitsanforderungen und Controls als belastbare Basis für die Absicherung von Systemen und Prozessen. Er bildet das technische und organisatorische Sicherheitsfundament, auf dem weiterführende Anforderungen aufsetzen.";
  }
  if (datasetId === "methodik") {
    return "Der Methodik-Katalog beschreibt die Vorgehensweise zur Planung, Umsetzung, Bewertung und kontinuierlichen Verbesserung der Informationssicherheit nach Grundschutz++. Er unterstützt Institutionen dabei, ISMS-Prozesse strukturiert, nachvollziehbar und prüfbar umzusetzen.";
  }
  return "Dieser Katalog stellt sicherheitsrelevante Anforderungen strukturiert und durchsuchbar bereit.";
}

export function GroupOverview({ meta, datasetId, onOpenGroup, onStartSearch }: GroupOverviewProps) {
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
        <p>{heroIntroTextForDataset(datasetId)}</p>
        <p className="hero-stats">
          Aktuell durchsuchbar: {meta.stats.controlCount} Controls in {meta.stats.groupCount} Gruppen.
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
