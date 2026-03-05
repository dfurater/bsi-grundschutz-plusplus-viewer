# Grundschutz++ Katalog-App (Static CSR)

Clientseitige React/Vite-Webanwendung zur Suche und Navigation eines BSI Grundschutz++ OSCAL-Katalogs.

## Features

- Reines CSR, statisch deploybar
- Hash-Routing (`#/search`, `#/control/:id`, `#/group/:id`, `#/about/source`)
- Rechtliche Seiten: `#/impressum` und `#/datenschutz` (global ueber Footer verlinkt)
- Multi-Dataset-Unterstützung (Anwender, Kernel, Methodik)
- Volltext- und ID-Suche mit Facetten (Web Worker)
- Detailansicht mit Statement/Guidance/Parametern/Relationen
- Relations-Graph-Visualisierung (1/2-Hop, required/related-Filter, Zoom/Pan, klickbare Knoten)
- Provenienz- und Versionsanzeige
- Optionaler lokaler JSON-Upload (ohne Server)
- Offline-Basisunterstützung per Service Worker
- Strikte JSON-Schema-Validierung und Security-Budgets (fail-closed)
- Sichere externe Link-Behandlung (`http/https`-Whitelist)
- CSV-Export fuer ausgewaehlte Controls (Excel-kompatibel, UTF-8 mit BOM)

## Rechtliches

Die App enthaelt zwei oeffentlich erreichbare Rechtsseiten:

- `#/impressum`
- `#/datenschutz`

Die Links sind global im Footer sichtbar und damit auf allen Routen in maximal zwei Klicks erreichbar.

### Platzhalter befuellen

Die Inhalte werden ueber Platzhalter in `src/legal/placeholders.ts` gepflegt:

- `{{OPERATOR_NAME}}`
- `{{OPERATOR_ADDRESS_LINE1}}`
- `{{OPERATOR_ADDRESS_LINE2}}`
- `{{OPERATOR_EMAIL}}`
- `{{HOSTING_PROVIDER_NAME}}`
- `{{HOSTING_PROVIDER_CONTACT}}`
- `{{PROJECT_REPO_URL}}`
- `{{LAST_UPDATED_DATE}}`

Wichtige Datenschutzinhalte in der vorhandenen Erklaerung:

- keine Cookies
- keine externen Drittanbieter/Tracking-Requests beim Erstaufruf
- `localStorage`-Key `gspp-theme` (Theme-Praeferenz)
- Service-Worker Cache/Cache Storage (Performance/Offline)
- lokale Upload-Verarbeitung im Browser (keine Uebertragung an App-Server)

## CSV Export (Controls)

- Auswahl pro Control ueber Checkbox in Such- und Gruppenansicht
- Suchansicht: optional "Alle auf Seite auswaehlen"
- Export ueber Header-Button `CSV exportieren (n)`
- Dateiname: `grundschutz-controls_<YYYY-MM-DD>_<count>.csv`

Exportspalten:
`control_id`, `control_title`, `group_path`, `class`, `sec_level`, `effort_level`, `modalverb`,
`handlungsworte`, `tags`, `statement`, `guidance`, `params`, `links`, `source_version`, `source_last_modified`.

Hinweise:
- `links` exportiert nur `http/https`; unsichere Schemes werden verworfen.
- CSV wird mit UTF-8 BOM und `CRLF` erzeugt, damit Excel-Import robust funktioniert.
- Potenziell gefaehrliche Spreadsheet-Formeln (`=`, `+`, `-`, `@` am Feldanfang) werden neutralisiert.

## Entwicklung

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Preview-URL: `http://127.0.0.1:4173`

Wichtig: `dist/index.html` nicht direkt per `file://` oeffnen, sondern immer ueber den lokalen Preview-Server (`npm run preview`), da Worker/Fetch sonst fehlschlagen koennen.

Die Build-Pipeline liest die Kataloge aus `Kataloge/`:

- `Grundschutz++-catalog.json` (Anwenderkatalog)
- `BSI-Stand-der-Technik-Kernel-catalog.json`
- `BSI-Methodik-Grundschutz++-catalog.json`
- `Grundschutz++-profile.json` (Beziehungs-/Profilanalyse)

## Qualitätssicherung

```bash
npx playwright install chromium
npm run test:unit
npm run audit:prod
npm run audit:dev
npm run qa
```

`npm run qa` führt Build, Unit-Tests, Release-Hygiene-Check, Lighthouse (mit Budgets) und Axe-Tests aus.

## Security Header Check

```bash
SECURITY_HEADERS_URL="https://deine-preview-url" npm run check:headers
```

Ohne gesetzte URL wird der Check bewusst uebersprungen.

Der Build-Step `npm run build:data` erzeugt aus `Grundschutz++-catalog.json` die statischen Datenassets:

- `public/data/catalog-meta.json`
- `public/data/catalog-index.json`
- `public/data/build-info.json`
- `public/data/details/<TOPGROUP>.json`
- `public/data/catalog-registry.json`
- `public/data/profile-links.json`
- `public/data/datasets/<dataset-id>/*`

## Deployment

Das Ergebnis in `dist/` kann auf beliebigem Static Hosting bereitgestellt werden (GitHub Pages, Netlify, Cloudflare Pages, S3 Static Website).

Fuer Security-Header siehe:

- `public/_headers`
- `netlify.toml`
- `docs/hosting-security-headers.md`
