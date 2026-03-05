# Grundschutz++ Katalog-App (Static CSR)

Clientseitige React/Vite-Webanwendung zur Suche und Navigation eines BSI Grundschutz++ OSCAL-Katalogs.

Direkte Quellen:
- [Bundesamt fuer Sicherheit in der Informationstechnik (BSI)](https://www.bsi.bund.de)
- [BSI Grundschutz++ Katalog (GitHub/JSON)](https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/tree/main/Anwenderkataloge/Grundschutz%2B%2B)

## Lokales Setup und Build

### Voraussetzungen

- Node.js `>= 20.19.0` (empfohlen: Node 20 LTS)
- npm `>= 10`

### Quickstart (Copy/Paste)

```bash
git clone https://github.com/dfurater/bsi-grundschutz-plusplus-viewer.git
cd bsi-grundschutz-plusplus-viewer
npm install
npm run dev
```

Optional danach:

```bash
npm run build
npm run preview
```

### Modus-Unterschiede

- `npm run dev`: startet den Vite-Dev-Server mit HMR fuer lokale Entwicklung.
- `npm run build`: erzeugt den Produktionsbuild (inkl. Datenaufbereitung) fuer Deployment.
- `npm run preview`: serviert den bereits gebauten Produktionsstand lokal zur realistischen End-to-End-Pruefung.

Vite schreibt den Produktionsbuild standardmaessig nach `dist/`; `npm run preview` serviert genau diesen Build lokal.

Hinweis zu Abhaengigkeiten: Nach dem Klonen muss `npm install` ausgefuehrt werden, damit npm die Abhaengigkeiten aus
`package.json` und `package-lock.json` aufloest und installiert.

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

Hosting-/Projekt-/Stand-Angaben sind direkt in den Rechtsseiten gepflegt:

- `src/components/DatenschutzPage.tsx`
- `src/components/ImpressumPage.tsx`

Wichtige Datenschutzinhalte in der vorhandenen Erklaerung:

- keine Cookies
- keine externen Drittanbieter/Tracking-Requests beim Erstaufruf
- `localStorage`-Key `gspp-theme` (Theme-Praeferenz)
- Service-Worker Cache/Cache Storage (Performance/Offline)
- lokale Upload-Verarbeitung im Browser (keine Uebertragung an App-Server)

## CSV Export (Controls)

- Auswahl pro Control ueber Checkbox in Such- und Gruppenansicht
- "Alles auswaehlen / Alles abwaehlen" ist auf allen Ebenen verfuegbar:
  - `#/` (Startseite): alle Controls des aktiven Datensatzes
  - `#/group/...`: alle Controls der aktuellen Gruppe
  - `#/search...`: alle Treffer der aktuellen Suche (inkl. Filter)
- Toggle-Verhalten: zweiter Klick auf denselben Button waehlt die jeweilige Menge wieder ab
- Export ueber Header-Button `CSV exportieren (n)`
- Button ist bei `0` Auswahl deaktiviert und zeigt waehrend des Exports einen Busy-Status
- Dateiname: `grundschutz-controls_<YYYY-MM-DD>_<count>.csv`

Exportspalten:
`control_id`, `control_title`, `group_path`, `class`, `sec_level`, `effort_level`, `modalverb`,
`handlungsworte`, `tags`, `statement`, `guidance`, `params`, `links`, `source_version`, `source_last_modified`.

Hinweise:
- `links` exportiert nur `http/https`; unsichere Schemes werden verworfen.
- CSV wird mit UTF-8 BOM, `CRLF` und Semikolon-Delimiter (`;`) erzeugt, damit Excel-Import robust funktioniert.
- OSCAL-Template-Marker in Texten (z. B. `{{ insert: param, ... }}`) werden, wenn moeglich, mit Parameterwerten aufgeloest.
- Potenziell gefaehrliche Spreadsheet-Formeln (`=`, `+`, `-`, `@` am Feldanfang) werden neutralisiert.
- Nach erfolgreichem Export wird die aktuelle Auswahl automatisch geleert.

## JSON Import (lokal, ohne Server)

- Import ueber Header-Button `JSON laden`
- Erwartetes Format: OSCAL-Katalog JSON (wird strikt validiert)
- Fail-closed Verhalten: bei Parse-/Schema-/Budget-Fehlern wird der Import komplett abgelehnt
- Upload-Limit: maximal `8 MiB` pro Datei
- Sicherheitsbudgets fuer Ingestion sind aktiv (u. a. Mengen-/Zeitbudgets), damit fehlerhafte oder zu grosse Inputs die App nicht blockieren
- Der Import ist rein lokal im Browser (keine externe Uebertragung); nach Reload wird wieder der statische Standarddatensatz geladen

## Suche, Filter und Routen

- Suche nach ID oder Volltext, Sortierung nach Relevanz/ID/Titel
- Facettierte Filter fuer Top-Gruppe, Sicherheitsniveau, Aufwand, Klasse, Modalverb, Zielobjekte, Tags, Relationstyp
- Suchquery ist auf `180` Zeichen begrenzt
- Hash-Routing:
  - `#/` Startseite
  - `#/search` Suche
  - `#/group/:id` Gruppenansicht
  - `#/control/:id` Einzel-Control
  - `#/about/source` Quellen & Version

## Relations-Graph

- Visualisierung eingehender/ausgehender Relationen pro Control
- 1-Hop und 2-Hop Ansicht
- Filter nach `all`, `required`, `related`
- Knoten sind klickbar und navigieren direkt zu Controls

## Entwicklung

Preview-URL fuer `npm run preview`: `http://127.0.0.1:4173`

Wichtig: `dist/index.html` nicht direkt per `file://` oeffnen, sondern immer ueber `npm run preview`, da Worker/Fetch
sonst fehlschlagen koennen.

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

### GitHub Pages (empfohlen via GitHub Actions)

Die App verwendet Hash-Routing und ist damit ohne Server-Rewrites auf GitHub Pages lauffaehig.

1. In GitHub unter `Settings -> Pages` bei **Build and deployment** die Option **GitHub Actions** aktivieren.
2. Auf `main` pushen (oder den Workflow manuell starten).
3. Der Workflow `.github/workflows/deploy-pages.yml` baut und deployed automatisch nach GitHub Pages.

Wichtige Base-Path-Regel:
- Projektseite (`https://<user>.github.io/<repo>/`): `VITE_BASE_PATH=/<repo>/`
- User/Org-Seite oder Custom Domain (`https://<user>.github.io/` oder eigene Domain): `VITE_BASE_PATH=/`

Der GitHub-Pages-Workflow setzt automatisch:

```bash
VITE_BASE_PATH=/${{ github.event.repository.name }}/
```

Lokaler Test mit GitHub-Pages-Base-Path:

```bash
VITE_BASE_PATH=/bsi-grundschutz-plusplus-viewer/ npm run build
npm run preview
```

Hinweis zu Security-Headern auf GitHub Pages:
- GitHub Pages wertet `public/_headers` und `netlify.toml` nicht als Response-Header-Policy aus.
- Fuer strikt erzwungene CSP/weitere Security-Header ist ein vorgeschalteter Proxy/CDN oder ein Host mit Header-Support (z. B. Netlify/Cloudflare) erforderlich.

Fuer Security-Header siehe:

- `public/_headers`
- `netlify.toml`
- `docs/hosting-security-headers.md`
