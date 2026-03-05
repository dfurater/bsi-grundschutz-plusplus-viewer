import { LEGAL_PLACEHOLDERS, isPlaceholderValue } from "../legal/placeholders";

function renderContactEmail(email: string) {
  if (!email) {
    return <span>-</span>;
  }

  if (isPlaceholderValue(email)) {
    return <span>{email}</span>;
  }

  return <a href={`mailto:${email}`}>{email}</a>;
}

export function ImpressumPage() {
  return (
    <section className="legal-page" aria-labelledby="impressum-title">
      <h1 id="impressum-title">Impressum</h1>

      <h2>Anbieter</h2>
      <p>{LEGAL_PLACEHOLDERS.operatorName}</p>
      <address>
        {LEGAL_PLACEHOLDERS.operatorAddressLine1}
        <br />
        {LEGAL_PLACEHOLDERS.operatorAddressLine2}
      </address>

      <h2>Kontakt</h2>
      <p>
        E-Mail: {renderContactEmail(LEGAL_PLACEHOLDERS.operatorEmail)}
      </p>

      <h2>Projektbezug</h2>
      <p>
        Diese Website stellt einen fachlichen, oeffentlich erreichbaren Viewer fuer den Grundschutz++-Katalog bereit.
      </p>
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
