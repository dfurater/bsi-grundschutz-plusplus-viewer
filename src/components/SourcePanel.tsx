import type { CatalogMeta, CatalogRegistry, DatasetDescriptor, ProfileAnalysis } from "../types";
import { safeExternalUrl } from "../lib/urlSafety";

interface SourcePanelProps {
  meta: CatalogMeta | null;
  activeDataset: DatasetDescriptor | null;
  registry: CatalogRegistry | null;
  profileAnalysis: ProfileAnalysis | null;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return date.toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function isHttpLink(value: string | null) {
  if (!value) {
    return false;
  }
  return /^https?:\/\//i.test(value);
}

function datasetMetaHref(datasetId: string | null) {
  if (!datasetId) {
    return null;
  }
  return `./data/datasets/${encodeURIComponent(datasetId)}/catalog-meta.json`;
}

function renderExternalLink(rawValue: string | null) {
  const safeUrl = safeExternalUrl(rawValue);
  if (!safeUrl) {
    return (
      <span className="blocked-link" title={rawValue || "leer"}>
        Unsicherer Link blockiert
      </span>
    );
  }

  return (
    <a href={safeUrl} target="_blank" rel="noopener noreferrer">
      {safeUrl}
    </a>
  );
}

export function SourcePanel({ meta, activeDataset, registry, profileAnalysis }: SourcePanelProps) {
  if (!meta) {
    return <section className="source-panel status-box">Metadaten werden geladen…</section>;
  }

  return (
    <section className="source-panel">
      <h2>Quellen & Version</h2>
      <dl className="meta-grid">
        <dt>Aktiver Datensatz</dt>
        <dd>{activeDataset?.label ?? meta.title}</dd>

        <dt>Katalogtitel</dt>
        <dd>{meta.title}</dd>

        <dt>Version</dt>
        <dd>{meta.version || "-"}</dd>

        <dt>Last Modified</dt>
        <dd>{formatDateTime(meta.lastModified)}</dd>

        <dt>OSCAL Version</dt>
        <dd>{meta.oscalVersion || "-"}</dd>

        <dt>Publisher</dt>
        <dd>{meta.publisher.name}</dd>

        <dt>Kontakt</dt>
        <dd>{meta.publisher.email || "-"}</dd>

        <dt>Build-Zeitpunkt</dt>
        <dd>{formatDateTime(meta.buildInfo?.buildTimestamp ?? null)}</dd>

        <dt>Catalog SHA-256</dt>
        <dd className="code-line">{meta.buildInfo?.catalogFileSha256 || "-"}</dd>
      </dl>

      {registry?.datasets?.length ? (
        <section>
          <h3>Integrierte Kataloge</h3>
          <ul className="source-links">
            {registry.datasets.map((dataset) => (
              <li key={dataset.id}>
                <strong>
                  {dataset.label}: {dataset.title}
                </strong>
                <div>
                  Controls {dataset.stats.controlCount}, Gruppen {dataset.stats.groupCount}, Datei {dataset.sourceFileName}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profileAnalysis ? (
        <section>
          <h3>Profil-Zusammenhang (Grundschutz++-profile)</h3>
          <p>
            {profileAnalysis.profile.title || "Profil"} ({profileAnalysis.profile.oscalVersion || "-"}) importiert {" "}
            {profileAnalysis.imports.length} Katalogquellen und setzt {profileAnalysis.setParameters.length} Parameterwerte.
          </p>

          <ul className="source-links">
            {profileAnalysis.imports.map((item, index) => (
              <li key={`${item.href}-${index}`}>
                <strong>{item.resolvedDatasetLabel || item.href}</strong>
                <div className="source-path-row">
                  {isHttpLink(item.resourceHref || item.href) ? (
                    renderExternalLink(item.resourceHref || item.href)
                  ) : datasetMetaHref(item.resolvedDatasetId) ? (
                    <a href={datasetMetaHref(item.resolvedDatasetId)!} target="_blank" rel="noopener noreferrer">
                      {item.resourceHref || item.href}
                    </a>
                  ) : (
                    <span>{item.resourceHref || item.href}</span>
                  )}
                  {datasetMetaHref(item.resolvedDatasetId) ? (
                    <a
                      className="source-inline-link"
                      href={datasetMetaHref(item.resolvedDatasetId)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Datensatz-Meta öffnen
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <p>
            Kontrollmengenprüfung: {profileAnalysis.relationAudit.exactUnionMatch ? "exakte Vereinigung" : "Abweichung"}
            {" "}(Union: {profileAnalysis.relationAudit.sourceUnionControlCount}, Anwender: {profileAnalysis.relationAudit.anwenderControlCount})
          </p>
        </section>
      ) : null}

      <h3>Originalquellen</h3>
      <ul className="source-links">
        <li>
          <strong>Stand-der-Technik-Bibliothek (GitHub)</strong>
          <div>
            <a
              href="https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/blob/main/README.md
            </a>
          </div>
        </li>
        {meta.sourceReferences.map((source, index) => (
          <li key={`${source.href}-${index}`}>
            <strong>{source.title || source.rel || "Quelle"}</strong>
            <div>
              {source.resolvedHref ? (
                renderExternalLink(source.resolvedHref)
              ) : (
                <span>{source.href}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {meta.remarks ? (
        <section>
          <h3>Beschreibung</h3>
          <p>{meta.remarks}</p>
        </section>
      ) : null}

      <section>
        <h3>Rechtliches</h3>
        <p>
          <a href="#/impressum">Impressum</a> / <a href="#/datenschutz">Datenschutz</a>
        </p>
      </section>
    </section>
  );
}
