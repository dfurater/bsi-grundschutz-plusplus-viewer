import { LEGAL_PLACEHOLDERS, isPlaceholderValue } from "../legal/placeholders";
const LEGAL_LAST_UPDATED = "05.03.2026";

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
      <p>
        Angaben gemäß Paragraf 18 Abs. 1 Medienstaatsvertrag (MStV) sowie - soweit einschlägig - Paragraf 5
        Digitale-Dienste-Gesetz (DDG)
      </p>

      <h2>Anbieter</h2>
      <p>
        <strong>Name:</strong>
        <br />
        {LEGAL_PLACEHOLDERS.operatorName}
      </p>
      <p>
        <strong>Anschrift (ladungsfähig):</strong>
      </p>
      <address>
        {LEGAL_PLACEHOLDERS.operatorAddressLine1}
        <br />
        {LEGAL_PLACEHOLDERS.operatorAddressLine2}
      </address>

      <h2>Kontakt</h2>
      <p>
        <strong>E-Mail:</strong>
        <br />
        {renderContactEmail(LEGAL_PLACEHOLDERS.operatorEmail)}
      </p>

      <p className="legal-last-updated">Stand: {LEGAL_LAST_UPDATED}</p>
    </section>
  );
}
