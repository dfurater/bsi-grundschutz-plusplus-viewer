# Grundschutz++ Katalog-App

Statische React/Vite-Webanwendung zur Suche, Navigation und lokalen Auswertung von BSI-Grundschutz++-OSCAL-Katalogen.

## Projektzweck

Die Anwendung macht maschinenlesbare Katalogdaten (OSCAL JSON) als lokale, durchsuchbare Weboberfläche nutzbar.

Kernziele:
- Volltext-/ID-Suche mit Facetten und Sortierung
- Detailansicht je Control inkl. Relationen und Graphdarstellung
- Primärquelle: fertiger BSI-Grundschutz++-Anwenderkatalog
- CSV-Export ausgewählter Controls
- statisches Deployment (GitHub Pages)

## Kernfunktionen

- Hash-Routing (`#/`, `#/search`, `#/group/:id`, `#/control/:id`, `#/about`, `#/about/license` (Legacy-Alias: `#/about/source`), `#/impressum`, `#/datenschutz`)
- Suche und Filter über Web Worker
- Relations-Graph (1-Hop/2-Hop, Filter `all|required|related`)
- CSV-Export mit Formel-Neutralisierung und URL-Härtung
- Service Worker für Caching/Offline-Basis
- Validierung aller geladenen JSON-Strukturen

## Architektur (Kurzüberblick)

- Frontend: React 19 + TypeScript + Vite (CSR)
- Suche/Indexierung: Browser Worker (`src/workers/searchWorker.ts`)
- Datenhaltung: statische JSON-/SW-Artefakte in `public/data/**` und `public/sw.js` (werden im Build erzeugt)
- Build-Datenpipeline: `scripts/build-catalog.mjs` erzeugt Suchindex, Meta, Detail-Chunks und Service Worker aus dem Anwenderkatalog
- Deployment: statisches Hosting (CI-Workflow für GitHub Pages vorhanden)

Details: siehe `docs/architecture.md`.

## Tech Stack

- Runtime: Node.js `>=20.19.0`, npm `>=10`
- Frontend: `react`, `react-dom`
- Validierung: `zod`
- Tooling: `vite`, `typescript`, `vitest`, `playwright`, `@axe-core/playwright`, `@lhci/cli`

## Voraussetzungen

- Node.js 20.19.0 oder neuer (`.nvmrc` = `20.19.0`)
- npm 10 oder neuer

## Installation

```bash
git clone https://github.com/dfurater/bsi-grundschutz-plusplus-viewer.git
cd bsi-grundschutz-plusplus-viewer
npm install
cp .env.example .env.local
```

`.env.local` mit Betreiberdaten befüllen:

- `VITE_OPERATOR_NAME`
- `VITE_OPERATOR_ADDRESS_LINE1`
- `VITE_OPERATOR_ADDRESS_LINE2`
- `VITE_OPERATOR_EMAIL`

## Lokaler Start

```bash
npm run dev
```

`npm run dev` führt zuerst `npm run build:data` aus.

## Build

```bash
npm run build
```

Build-Pipeline:
1. Release-Artefakte bereinigen
2. Daten-Artefakte erzeugen (`build:data`)
3. TypeScript-Build (`tsc -b`)
4. Legal-Placeholder-Check
5. Vite Production Build (`dist/`)

## Test und Qualität

```bash
npm run test:unit
npm run check:release-hygiene
npm run qa
```

`public/data/**` und `public/sw.js` sind generiertes Build-Output und werden nicht versioniert.
`npm run test:unit` führt daher intern zuerst `npm run build` aus.

Zusätzliche Checks:

```bash
npm run audit:prod
npm run audit:dev
```

## Deployment-Hinweise

### GitHub Pages

- Workflow: `.github/workflows/deploy-pages.yml`
- Trigger: automatisch nach erfolgreichem `quality`-Run auf `main` sowie manuell via `workflow_dispatch`
- setzt `VITE_BASE_PATH=/${{ github.event.repository.name }}/`
- benötigt folgende Secrets:
  - `VITE_OPERATOR_NAME`
  - `VITE_OPERATOR_ADDRESS_LINE1`
  - `VITE_OPERATOR_ADDRESS_LINE2`
  - `VITE_OPERATOR_EMAIL`

### Daily BSI Sync + Auto-PR

- Workflow: `.github/workflows/daily-bsi-sync.yml`
- Trigger: täglich per Schedule sowie manuell via `workflow_dispatch`
- Quelle: `BSI-Bund/Stand-der-Technik-Bibliothek` (standardmäßig `main`)
- Ablauf:
  - `npm run sync:bsi` lädt den fertigen Grundschutz++-Anwenderkatalog gegen einen konsistenten Upstream-Commit-Snapshot
  - Sync erfolgt atomar (Staging + Promotion), inkl. Retry/Backoff und klassifizierten Fehlern (`network`, `api`, `schema`, `semantic`)
  - Semantik-/Driftprüfungen erzeugen einen maschinenlesbaren Sync-Report (`sync_report_json`) und Markdown-Summary (`sync_report_markdown`)
  - nur bei Änderungen werden Build/Tests ausgeführt
  - bei unveränderten Katalogen endet der Workflow ohne PR (No-Op)

### Hosting Scope

- Produktiv-Deployment ist auf GitHub Pages ausgerichtet.
- Es gibt in diesem Repository keine hostspezifischen Header-Policy-Dateien mehr.

### Manueller Katalog-Sync lokal

```bash
npm run sync:bsi
```

## Konfiguration / Umgebungsvariablen

| Variable | Zweck | Pflicht |
|---|---|---|
| `VITE_OPERATOR_NAME` | Impressum/Datenschutz Betreibername | ja (Build-Check) |
| `VITE_OPERATOR_ADDRESS_LINE1` | Impressum/Datenschutz Adresse Zeile 1 | ja (Build-Check) |
| `VITE_OPERATOR_ADDRESS_LINE2` | Impressum/Datenschutz Adresse Zeile 2 | ja (Build-Check) |
| `VITE_OPERATOR_EMAIL` | Impressum/Datenschutz Kontakt-E-Mail | ja (Build-Check) |
| `VITE_BASE_PATH` | Vite Base Path für Hosting-Unterpfade | nein (optional, je Hosting) |

## Projektstruktur

```text
.
├─ src/                      # React-App, Worker, UI-Komponenten, Libs
├─ scripts/                  # Build-/Security-/Hygiene-Skripte
├─ tests/                    # Playwright E2E- und A11y-Tests
├─ Kataloge/                 # BSI-OSCAL-Eingabedaten (Primärquelle: Grundschutz++-Anwenderkatalog)
├─ public/data/              # generierte statische Datenartefakte (nicht versioniert)
├─ public/sw.js              # generierter Service Worker (nicht versioniert)
├─ .github/workflows/        # CI (quality), CD (deploy-pages), Sync-Automation (daily-bsi-sync)
└─ docs/                     # vertiefende technische Dokumentation
```

## Vertiefende Dokumentation

- [Architektur](docs/architecture.md)
- [Fachliche Einordnung](docs/functional-overview.md)
- [Setup und Betrieb](docs/setup-and-operations.md)
- [Schnittstellen](docs/api-and-interfaces.md)
- [Security Review](docs/security-review.md)
- [Teststrategie](docs/testing.md)
- [QA/Coverage Finalisierung](docs/qa-coverage-finalization.md)
- [QA/Coverage Maintenance Summary](docs/qa-coverage-maintenance-summary.md)
- [Developer Onboarding](docs/developer-onboarding.md)
- [ADR-Zusammenfassung](docs/adr-summary.md)
- [Offene Punkte / Gaps](docs/open-issues-and-gaps.md)

## Lizenz

MIT, siehe `LICENSE`.
