import { LEGAL_PLACEHOLDERS, isPlaceholderValue } from "../legal/placeholders";

function renderEmail(email: string) {
  if (!email) {
    return <span>-</span>;
  }
  if (isPlaceholderValue(email)) {
    return <span>{email}</span>;
  }
  return <a href={`mailto:${email}`}>{email}</a>;
}

export function DatenschutzPage() {
  return (
    <section className="legal-page" aria-labelledby="datenschutz-title">
      <h1 id="datenschutz-title">Datenschutzerklaerung</h1>

      <h2>Verantwortliche Stelle</h2>
      <p>{LEGAL_PLACEHOLDERS.operatorName}</p>
      <address>
        {LEGAL_PLACEHOLDERS.operatorAddressLine1}
        <br />
        {LEGAL_PLACEHOLDERS.operatorAddressLine2}
      </address>
      <p>Kontakt fuer Datenschutzanfragen: {renderEmail(LEGAL_PLACEHOLDERS.operatorEmail)}</p>

      <h2>Hosting und serverseitige Logdaten</h2>
      <p>
        Die Website wird ueber {LEGAL_PLACEHOLDERS.hostingProviderName} bereitgestellt. Beim Aufruf koennen beim Hoster
        technische Verbindungsdaten (z. B. IP-Adresse, Zeitpunkt, angefragte Ressource, Statuscode, User-Agent,
        Referrer) in Server-Logs verarbeitet werden.
      </p>
      <p>
        Informationen zum Hosting-Anbieter:{" "}
        <a href={LEGAL_PLACEHOLDERS.hostingProviderContact} target="_blank" rel="noopener noreferrer">
          {LEGAL_PLACEHOLDERS.hostingProviderContact}
        </a>
      </p>

      <h2>Externe Dienste und Drittanbieter</h2>
      <p>
        Beim Erstaufruf werden keine externen Drittanbieter-Dienste, keine Tracking-Tools, keine externen Fonts, keine
        Analyse-Skripte und keine externen CDNs eingebunden.
      </p>

      <h2>Cookies und lokale Speicherung</h2>
      <p>Diese Anwendung verwendet keine Cookies.</p>
      <ul>
        <li>
          <strong>localStorage:</strong> Der Key <code>gspp-theme</code> speichert ausschliesslich die
          Darstellungs-Praeferenz (Hell/Dunkel).
        </li>
        <li>
          <strong>Service Worker / Cache Storage:</strong> Es werden statische Inhalte (HTML, Assets, JSON-Daten) fuer
          Performance und Offline-Funktionalitaet zwischengespeichert.
        </li>
        <li>
          <strong>sessionStorage/IndexedDB:</strong> Werden durch die Anwendung nicht genutzt.
        </li>
      </ul>

      <h2>Lokale Upload-Verarbeitung</h2>
      <p>
        Optional hochgeladene JSON-Dateien werden ausschliesslich lokal im Browser verarbeitet. Es erfolgt keine
        Uebertragung an einen Server der Anwendung.
      </p>

      <h2>Zwecke und Rechtsgrundlagen</h2>
      <p>
        Die Verarbeitung erfolgt fuer die technische Bereitstellung der Website, fuer Sicherheits- und
        Stabilitaetszwecke sowie fuer die nutzerseitig angeforderte Funktionalitaet des Katalog-Viewers.
      </p>

      <h2>Speicherdauer</h2>
      <ul>
        <li>
          <strong>Lokale Browserdaten</strong> (z. B. Theme-Praeferenz, Cache) bleiben gespeichert, bis sie durch den
          Nutzer im Browser geloescht werden oder technisch invalidiert werden.
        </li>
        <li>
          <strong>Server-Logs</strong> richten sich nach den Vorgaben des Hosting-Anbieters.
        </li>
      </ul>

      <h2>Betroffenenrechte</h2>
      <p>
        Betroffene Personen haben nach den gesetzlichen Vorgaben insbesondere Rechte auf Auskunft, Berichtigung,
        Loeschung, Einschraenkung der Verarbeitung, Datenuebertragbarkeit, Widerspruch sowie Beschwerde bei einer
        Aufsichtsbehoerde.
      </p>

      <h2>Projektbezug</h2>
      <p>
        Projekt-Repository:{" "}
        <a href={LEGAL_PLACEHOLDERS.projectRepoUrl} target="_blank" rel="noopener noreferrer">
          {LEGAL_PLACEHOLDERS.projectRepoUrl}
        </a>
      </p>

      <p className="legal-last-updated">Stand: {LEGAL_PLACEHOLDERS.lastUpdatedDate}</p>
    </section>
  );
}
