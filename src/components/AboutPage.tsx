import type { CatalogMeta } from "../types";
import { LEGAL_PLACEHOLDERS, isPlaceholderValue } from "../legal/placeholders";
import { safeExternalUrl } from "../lib/urlSafety";

interface AboutPageProps {
  meta: CatalogMeta | null;
}

const PROJECT_REPOSITORY_URL = "https://github.com/dfurater/bsi-grundschutz-plusplus-viewer";
const PROJECT_ISSUES_URL = `${PROJECT_REPOSITORY_URL}/issues`;

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

function renderExternalLink(value: string) {
  const safeUrl = safeExternalUrl(value);
  if (!safeUrl) {
    return <span>{value}</span>;
  }

  return (
    <a href={safeUrl} target="_blank" rel="noopener noreferrer">
      {safeUrl}
    </a>
  );
}

function renderContactEmail(value: string) {
  if (!value) {
    return <span>-</span>;
  }

  if (isPlaceholderValue(value)) {
    return <span>{value}</span>;
  }

  return <a href={`mailto:${value}`}>{value}</a>;
}

export function AboutPage({ meta }: AboutPageProps) {
  const buildDate = formatDateTime(meta?.buildInfo?.buildTimestamp ?? null);
  const datasetVersion = meta?.version ?? "-";
  const datasetHash = meta?.buildInfo?.catalogFileSha256 ?? "-";

  return (
    <section className="about-page" aria-labelledby="about-title">
      <h1 id="about-title">About</h1>

      <p>
        <strong>Sicherheitsanforderungen können fachlich richtig sein – und trotzdem schwer nutzbar.</strong>
        {" "}
        Grundschutz++ setzt genau dort an: Anforderungen werden als{" "}
        <strong>klar strukturierte, standardisierte Regeln</strong> gedacht, die{" "}
        <strong>maschinenlesbar</strong> sind und damit von Tools interpretiert werden können. Ziel ist, die Umsetzung
        so zu unterstützen, dass Organisationen schneller zu einem angemessenen Sicherheitsniveau kommen – passend zu
        ihrem Schutzbedarf.
      </p>

      <p>
        Dieser Viewer ist ein pragmatischer Übersetzer:
        <br />
        <strong>vom maschinenlesbaren Regelwerk zur menschenlesbaren Arbeitsoberfläche.</strong>
      </p>

      <p>
        <strong>Stand (Build):</strong> {buildDate} · <strong>Datensatz/Version:</strong> {datasetVersion} ·{" "}
        <strong>Hash:</strong> {datasetHash}
        <br />
        (Details siehe <a href="#/about/source">„Quellen &amp; Version“</a> in der App.)
      </p>

      <p>
        Die Anwendung nutzt als Primärquelle den fertigen BSI-Grundschutz++-Anwenderkatalog
        {" "}
        (<code>Anwenderkataloge/Grundschutz++/Grundschutz++-catalog.json</code>).
      </p>

      <h2>Warum dieser Viewer existiert</h2>
      <ul>
        <li>Weil „Durchsuchen“ schneller sein sollte als „Scrollen“.</li>
        <li>
          Weil Teams Anforderungen <strong>diskutieren, priorisieren und operationalisieren</strong> müssen – nicht nur
          ablegen.
        </li>
        <li>
          Weil aus Katalogen erst Wert entsteht, wenn daraus{" "}
          <strong>Arbeitslisten, Exporte und nachvollziehbare Entscheidungen</strong> werden.
        </li>
      </ul>

      <h2>Was Grundschutz++ besonders macht (Kurz erklärt)</h2>
      <ul>
        <li>
          <strong>Maschinenlesbarkeit &amp; Automatisierungspotenzial:</strong> Anforderungen liegen so vor, dass
          digitale Werkzeuge sie interpretieren und bei der Umsetzung unterstützen können.
        </li>
        <li>
          <strong>Prozessorientierung:</strong> Grundschutz++ ist als prozessorientierter Rahmen konzipiert; jede
          Anforderung wird als standardisierte Regel erfasst.
        </li>
        <li>
          <strong>Schlanker &amp; flexibler gedacht:</strong> Der Ansatz ist stärker auf Anwenderbedürfnisse
          ausgerichtet; zusammen mit dem Grundschutz++-Compendium sollen abstrakte, eigenständige Anforderungen
          bereitstehen, die sich tool-gestützt nutzen lassen.
        </li>
      </ul>

      <h2>Was du hier konkret tun kannst</h2>
      <ul>
        <li>Katalog <strong>durchsuchen</strong> (IDs und Volltext)</li>
        <li>
          <strong>Navigieren &amp; filtern</strong> nach Bereichen, Gruppen und Controls
        </li>
        <li>
          Controls <strong>sortieren</strong> (z. B. nach Relevanz)
        </li>
        <li>
          Auswahl <strong>exportieren</strong> (z. B. CSV)
        </li>
        <li>
          Datenstand transparent prüfen unter <strong>„Quellen &amp; Version“</strong> (Version/Build/Metadaten)
        </li>
      </ul>

      <h2>Transparenz &amp; Disclaimer</h2>
      <ul>
        <li>
          Dieser Viewer ist <strong>kein offizielles Produkt</strong> des BSI.
        </li>
        <li>
          Maßgeblich sind die <strong>Originalquellen</strong> und Veröffentlichungen des BSI.
        </li>
        <li>
          Der Viewer dient der <strong>Recherche und Orientierung</strong> und ersetzt keine fachliche Bewertung,
          Zertifizierungsaussage oder Rechtsberatung.
        </li>
      </ul>

      <h2>Mitmachen / Feedback</h2>
      <ul>
        <li>
          Repository: <strong>{renderExternalLink(PROJECT_REPOSITORY_URL)}</strong>
        </li>
        <li>
          Issues/Feedback: <strong>{renderExternalLink(PROJECT_ISSUES_URL)}</strong>
        </li>
        <li>
          Kontakt: <strong>{renderContactEmail(LEGAL_PLACEHOLDERS.operatorEmail)}</strong>
        </li>
      </ul>
    </section>
  );
}
