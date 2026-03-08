import type { CatalogMeta } from "../types";
import { safeExternalUrl } from "../lib/urlSafety";

interface SourcePanelProps {
  meta: CatalogMeta | null;
}

const BSI_REPOSITORY_URL = "https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek";
const BSI_CATALOG_URL =
  "https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/blob/main/Anwenderkataloge/Grundschutz%2B%2B/Grundschutz%2B%2B-catalog.json";
const CC_BY_SA_4_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
const PROJECT_LICENSE_URL = "https://github.com/dfurater/bsi-grundschutz-plusplus-viewer/blob/main/LICENSE";

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

export function SourcePanel({ meta }: SourcePanelProps) {
  const buildDate = formatDateTime(meta?.buildInfo?.buildTimestamp ?? null);
  const datasetVersion = meta?.version || "-";
  const datasetLastModified = formatDateTime(meta?.lastModified ?? null);
  const oscalVersion = meta?.oscalVersion || "-";
  const sourceFileName = meta?.buildInfo?.catalogFileName || "-";
  const sourceHash = meta?.buildInfo?.catalogFileSha256 || "-";
  const publisherName = meta?.publisher.name || "-";
  const publisherEmail = meta?.publisher.email || "-";

  return (
    <section className="source-panel license-page" aria-labelledby="license-page-title">
      <h1 id="license-page-title">Quellen &amp; Lizenz</h1>
      <p>
        Dieser Viewer nutzt Inhalte aus der Stand-der-Technik-Bibliothek des Bundesamts für Sicherheit in der
        Informationstechnik (BSI). Die eingebundenen Inhalte basieren auf den vom BSI bereitgestellten Katalogdaten
        und wurden für Anzeige, Suche, Filterung, Export und Visualisierung technisch aufbereitet.
      </p>

      <section className="license-section" aria-labelledby="license-origin-title">
        <h2 id="license-origin-title">Herkunft der Inhalte</h2>
        <p>
          Grundlage für den Viewer ist der vom BSI bereitgestellte Grundschutz++-Anwenderkatalog. Das
          BSI-Repository unterscheidet zwischen fertigen Anwenderkatalogen und Quellkatalogen; in dieser Anwendung
          wird der fertige Grundschutz++-Anwenderkatalog als direkte Primärquelle verwendet.
        </p>
      </section>

      <section className="license-section" aria-labelledby="license-source-title">
        <h2 id="license-source-title">Quelle</h2>
        <ul className="source-links">
          <li>
            <strong>Stand-der-Technik-Bibliothek (Repository)</strong>
            <div>
              <a href={BSI_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
                {BSI_REPOSITORY_URL}
              </a>
            </div>
          </li>
          <li>
            <strong>Grundschutz++-Anwenderkatalog (direkter Kataloglink)</strong>
            <div>
              <a href={BSI_CATALOG_URL} target="_blank" rel="noopener noreferrer">
                {BSI_CATALOG_URL}
              </a>
            </div>
          </li>
        </ul>
      </section>

      <section className="license-section" aria-labelledby="license-license-title">
        <h2 id="license-license-title">Lizenz</h2>
        <p>
          Die zugrunde liegenden BSI-Inhalte stammen aus der Stand-der-Technik-Bibliothek und stehen unter der
          Creative Commons Attribution-ShareAlike 4.0 International Lizenz (CC BY-SA 4.0).
        </p>
        <p>
          Lizenztext:{" "}
          <a href={CC_BY_SA_4_URL} target="_blank" rel="noopener noreferrer">
            {CC_BY_SA_4_URL}
          </a>
        </p>
      </section>

      <section className="license-section" aria-labelledby="license-processing-title">
        <h2 id="license-processing-title">Änderungen / technische Aufbereitung</h2>
        <p>
          Für diesen Viewer wurden die BSI-Inhalte technisch verarbeitet, damit sie in der Weboberfläche angezeigt,
          durchsucht, gefiltert, exportiert und visualisiert werden können. Diese Aufbereitung betrifft die technische
          Nutzbarkeit im Viewer und begründet keine inhaltliche Autorenschaft am BSI-Material.
        </p>
      </section>

      <section className="license-section" aria-labelledby="license-separation-title">
        <h2 id="license-separation-title">Trennung zwischen Code und Inhalt</h2>
        <p>
          Der Viewer als Softwareprojekt ist von den eingebundenen BSI-Inhalten zu unterscheiden. Die im Repository
          hinterlegte Softwarelizenz ist MIT (siehe{" "}
          <a href={PROJECT_LICENSE_URL} target="_blank" rel="noopener noreferrer">
            LICENSE
          </a>
          ).
        </p>
        <p>
          Soweit nicht anders angegeben, bezieht sich der vorstehende Lizenzhinweis auf die übernommenen bzw.
          technisch aufbereiteten BSI-Inhalte.
        </p>
      </section>

      <section className="license-section" aria-labelledby="license-sharealike-title">
        <h2 id="license-sharealike-title">ShareAlike-Hinweis</h2>
        <p>
          Wenn lizenzierte BSI-Inhalte bearbeitet oder weitergegeben werden, müssen diese Fassungen wieder unter
          derselben oder einer kompatiblen Lizenz bereitgestellt werden. Zusätzlich sind Quellenangabe,
          Lizenzverweis und ein Hinweis auf Änderungen erforderlich.
        </p>
      </section>

      <section className="license-section" aria-labelledby="license-transparency-title">
        <h2 id="license-transparency-title">Technische Datentransparenz</h2>
        {meta ? (
          <dl className="meta-grid">
            <dt>Primärquelle</dt>
            <dd>Grundschutz++-Anwenderkatalog</dd>

            <dt>Katalogtitel</dt>
            <dd>{meta.title}</dd>

            <dt>Version</dt>
            <dd>{datasetVersion}</dd>

            <dt>Last Modified</dt>
            <dd>{datasetLastModified}</dd>

            <dt>OSCAL Version</dt>
            <dd>{oscalVersion}</dd>

            <dt>Publisher</dt>
            <dd>{publisherName}</dd>

            <dt>Kontakt</dt>
            <dd>{publisherEmail}</dd>

            <dt>Build-Zeitpunkt</dt>
            <dd>{buildDate}</dd>

            <dt>Katalogdatei</dt>
            <dd>{sourceFileName}</dd>

            <dt>Catalog SHA-256</dt>
            <dd className="code-line">{sourceHash}</dd>
          </dl>
        ) : (
          <p className="status-box">Metadaten werden geladen…</p>
        )}
      </section>

      {meta?.sourceReferences.length ? (
        <section className="license-section" aria-labelledby="license-extra-sources-title">
          <h2 id="license-extra-sources-title">Weitere Quellenreferenzen</h2>
          <ul className="source-links">
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
        </section>
      ) : null}

      {meta?.remarks ? (
        <section className="license-section">
          <h2>Beschreibung</h2>
          <p>{meta.remarks}</p>
        </section>
      ) : null}

    </section>
  );
}
