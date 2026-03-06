# Security Review

## Vorhandene Sicherheitsmechanismen

### Eingabe- und Datenvalidierung

- Zod-Schemas für Index, Meta, Detail-Chunks, Registry, Profilanalyse und Upload-Daten.
- Bei Parse-/Schema-/Budgetfehlern wird Verarbeitung abgebrochen.
- Byte-/Mengen-/Zeitbudgets (`SECURITY_BUDGETS`) für Suche und Upload-Ingestion.

### Such- und Routing-Härtung

- Suchtext-/Filter-Sanitizing mit Längen- und Token-Limits.
- Route-Token-Sanitizing und robustes URL-Decoding.

### URL-/Link-Sicherheit

- Externe URLs nur mit `http/https`.
- URLs mit Userinfo oder Control-Zeichen werden blockiert.
- Unsichere Links werden in UI und Export nicht verwendet.

### CSV-Export-Härtung

- Neutralisierung potenzieller Spreadsheet-Formeln.
- Entfernung unsicherer Link-Schemes.

### Browser- und Hosting-Schutz

- Header-Policies in `public/_headers` und `netlify.toml` (CSP, XCTO, COOP, CORP, Referrer-Policy, Permissions-Policy).
- Service Worker auf localhost deaktiviert, in Production registriert.

### CI-/Supply-Chain-Kontrollen

- `npm audit --omit=dev --audit-level=high` im QA-Workflow.
- `audit:dev`-Policy-Skript (critical blockierend).
- Dependabot für npm-Dependencies und GitHub Actions.

## Repository-sichtbare Sicherheitslücken und Risiken

1. Header-Policy auf GitHub Pages wird nicht über `_headers`/`netlify.toml` erzwungen.
2. Es gibt keine Authentifizierung/Autorisierung.
3. Es gibt keine SAST-/Lint-Sicherheitsregeln im Build.
4. TypeScript ist nicht im Strict-Modus (`strict: false`).

## Geheimnisse / Credential-Themen

- Build-/Deploy-Workflows verwenden `VITE_OPERATOR_*` als Secrets/Umgebungsvariablen.
- `.env.example` enthält Platzhalterwerte.
- Im aktuellen Arbeitsverzeichnis existiert eine `.env.local` Datei.

## Auth-/Session-Themen

- Es gibt keine Benutzer-Session und keinen Login-Flow.
- `localStorage` wird für `gspp-theme` verwendet.

## Konkrete Härtungsempfehlungen

### Must-have

1. Produktive Header-Strategie für das gewählte Hosting verbindlich festlegen.
2. Secret-/Env-Hygiene absichern (kein Tracking lokaler Env-Dateien).
3. Secret-Scanning in CI ergänzen.

### Should-have

1. TypeScript schrittweise auf `strict: true` migrieren.
2. Linting/SAST in die CI-Pipeline ergänzen.
3. Header-Checks auf Preview-/Produktions-URLs verpflichtend ausführen.

### Nice-to-have

1. Threat-Model-Dokument ergänzen.
2. SBOM/Dependency-Transparenz automatisieren.
