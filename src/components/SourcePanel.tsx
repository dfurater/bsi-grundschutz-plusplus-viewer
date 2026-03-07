import type { CatalogMeta } from "../types";
import { safeExternalUrl } from "../lib/urlSafety";

interface SourcePanelProps {
  meta: CatalogMeta | null;
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
  if (!meta) {
    return <section className="source-panel status-box">Metadaten werden geladen…</section>;
  }

  return (
    <section className="source-panel">
      <h2>Quellen & Version</h2>
      <p>
        Primärquelle ist der fertige BSI-Grundschutz++-Anwenderkatalog aus dem Verzeichnis
        {" "}
        <code>Anwenderkataloge/Grundschutz++</code>.
      </p>
      <dl className="meta-grid">
        <dt>Primärquelle</dt>
        <dd>Grundschutz++-Anwenderkatalog</dd>

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

        <dt>Katalogdatei</dt>
        <dd>{meta.buildInfo?.catalogFileName || "-"}</dd>

        <dt>Catalog SHA-256</dt>
        <dd className="code-line">{meta.buildInfo?.catalogFileSha256 || "-"}</dd>
      </dl>

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
        <li>
          <strong>BSI Grundschutz++-Anwenderkatalog</strong>
          <div>
            <a
              href="https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/blob/main/Anwenderkataloge/Grundschutz%2B%2B/Grundschutz%2B%2B-catalog.json"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/blob/main/Anwenderkataloge/Grundschutz%2B%2B/Grundschutz%2B%2B-catalog.json
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

      {/* REQ: K-03, P2-03 (Rechtliches nur im Footer) */}
    </section>
  );
}
