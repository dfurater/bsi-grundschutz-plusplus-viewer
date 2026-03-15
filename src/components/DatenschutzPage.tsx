import { LEGAL_PLACEHOLDERS, isPlaceholderValue } from "../legal/placeholders";
import { safeExternalUrl } from "../lib/urlSafety";

const HOSTING_PROVIDER_NAME = "Github Pages";
const HOSTING_PROVIDER_CONTACT_URL = "https://www.microsoft.com/de-de/rechtliche-hinweise/impressum";

function renderEmail(email: string) {
  if (!email) {
    return <span>-</span>;
  }
  if (isPlaceholderValue(email)) {
    return <span>{email}</span>;
  }
  return <a href={`mailto:${email}`}>{email}</a>;
}

function renderExternalLink(value: string) {
  if (!value) {
    return <span>-</span>;
  }
  if (isPlaceholderValue(value)) {
    return <span>{value}</span>;
  }
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

export function DatenschutzPage() {
  return (
    <section className="legal-page" aria-labelledby="datenschutz-title">
      <h1 id="datenschutz-title">Datenschutzerklärung</h1>

      <h2>1. Verantwortliche Stelle</h2>
      <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
      <p>
        <strong>{LEGAL_PLACEHOLDERS.operatorName}</strong>
      </p>
      <address>
        {LEGAL_PLACEHOLDERS.operatorAddressLine1}
        <br />
        {LEGAL_PLACEHOLDERS.operatorAddressLine2}
      </address>
      <p>Kontakt für Datenschutzanfragen: {renderEmail(LEGAL_PLACEHOLDERS.operatorEmail)}</p>

      <h2>2. Überblick: Was diese Website (nicht) tut</h2>
      <p>
        Diese Website ist eine statische Webanwendung (Katalog-Viewer). Nach aktuellem Stand werden keine externen
        Tracking-, Analyse- oder Marketing-Dienste eingesetzt und beim Erstaufruf keine externen
        Drittanbieter-Skripte, Fonts oder CDNs eingebunden.
      </p>

      <h2>3. Hosting und serverseitige Logdaten</h2>
      <p>
        Die Website wird über {HOSTING_PROVIDER_NAME} bereitgestellt. Beim Aufruf können beim
        Hosting-Anbieter technisch erforderliche Verbindungsdaten (Server-Logs) verarbeitet werden, zum Beispiel:
      </p>
      <ul>
        <li>IP-Adresse</li>
        <li>Datum und Uhrzeit des Abrufs</li>
        <li>angeforderte Ressource/URL</li>
        <li>HTTP-Statuscode</li>
        <li>Browser-/Betriebssystem-Informationen (User-Agent)</li>
        <li>Referrer (sofern übertragen)</li>
      </ul>
      <p>
        <strong>Zweck:</strong> technische Bereitstellung, Stabilität und Sicherheit des Angebots, Missbrauchs- und
        Fehleranalyse.
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem, stabilem
        Betrieb).
      </p>
      <p>
        <strong>Hinweis zum Hosting-Anbieter:</strong>
        <br />
        {renderExternalLink(HOSTING_PROVIDER_CONTACT_URL)}
      </p>

      <h2>4. Externe Dienste und Drittanbieter</h2>
      <p>
        Beim Erstaufruf werden nach aktuellem Stand keine externen Drittanbieter-Dienste geladen (kein
        Analytics/Tracking, keine externen Fonts, keine externen CDN-Skripte).
      </p>

      <h2>5. Cookies und lokale Speicherung auf dem Endgerät</h2>
      <h3>5.1 Cookies</h3>
      <p>Diese Website verwendet nach aktuellem Stand keine Cookies.</p>

      <h3>5.2 localStorage</h3>
      <p>Nach aktuellem Stand verwendet diese Website kein localStorage für nutzerbezogene Einstellungen oder Inhaltsdaten.</p>

      <h3>5.3 Service Worker / Cache Storage</h3>
      <p>
        Die Website kann einen Service Worker nutzen und Inhalte (zum Beispiel HTML, Assets, JSON-Daten) im Cache
        Storage zwischenspeichern.
      </p>
      <p>
        <strong>Zweck:</strong> Performance, Stabilität, gegebenenfalls Offline-/Caching-Funktionalität.
        <br />
        <strong>Rechtsgrundlage (DSGVO):</strong> Art. 6 Abs. 1 lit. f DSGVO.
        <br />
        <strong>Endgerätezugriff (Paragraf 25 TDDDG/TTDSG):</strong> Soweit die Speicherung oder das Auslesen von
        Informationen auf dem Endgerät betroffen ist, erfolgt dies nur, soweit dies für die Bereitstellung der vom
        Nutzer gewünschten Funktion erforderlich ist.
      </p>

      <h3>5.4 Nicht genutzte Speicher</h3>
      <ul>
        <li>
          Nach aktuellem Stand werden <strong>sessionStorage</strong> und <strong>IndexedDB</strong> nicht genutzt.
        </li>
      </ul>

      <h2>6. Lokale Verarbeitung (CSV-Export)</h2>
      <p>
        Wenn Nutzer in der Anwendung CSV-Dateien exportieren, erfolgt die Erstellung der Datei ausschließlich lokal im
        Browser. Es werden keine Inhaltsdaten des Exports an einen Server der Anwendung übertragen.
      </p>
      <p>
        <strong>Zweck:</strong> Bereitstellung der vom Nutzer angeforderten Viewer-Funktion.
        <br />
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Nutzungs-/Funktionsbereitstellung) bzw. Art. 6
        Abs. 1 lit. f DSGVO.
      </p>

      <h2>7. Empfänger / Weitergabe</h2>
      <p>
        Eine aktive Weitergabe personenbezogener Daten durch den Betreiber an Dritte findet nach aktuellem Stand nicht
        statt, außer soweit dies technisch durch den Hosting-Anbieter im Rahmen der Bereitstellung (Server-Logs)
        erfolgt.
      </p>

      <h2>8. Speicherdauer</h2>
      <ul>
        <li>
          <strong>Lokale Browserdaten</strong> (insbesondere Cache-Inhalte des Service Workers) bleiben gespeichert, bis
          sie durch den Nutzer gelöscht oder technisch invalidiert werden.
        </li>
        <li>
          <strong>Server-Logs</strong> richten sich nach den Vorgaben des Hosting-Anbieters.
        </li>
      </ul>

      <h2>9. Betroffenenrechte</h2>
      <p>
        Betroffene Personen haben - bei Vorliegen der gesetzlichen Voraussetzungen - insbesondere folgende Rechte:
      </p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Datenschutzaufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>

    </section>
  );
}
