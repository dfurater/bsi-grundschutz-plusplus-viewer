# Grundschutz++ Katalog-App

Statische React/Vite-Webanwendung zur Suche, Navigation und lokalen Auswertung von BSI-Grundschutz++-OSCAL-Katalogen.

## Projektzweck

Die Anwendung macht maschinenlesbare Katalogdaten (OSCAL JSON) als lokale, durchsuchbare Weboberfläche nutzbar.

Kernziele:
- Volltext-/ID-Suche mit Facetten und Sortierung
- Detailansicht je Control inkl. Relationen und Graphdarstellung
- Multi-Dataset-Betrieb (`anwender`, `kernel`, `methodik`)
- CSV-Export ausgewählter Controls
- lokaler JSON-Import (ohne Server)
- statisches Deployment (GitHub Pages/Netlify-kompatibel)

## Kernfunktionen

- Hash-Routing (`#/`, `#/search`, `#/group/:id`, `#/control/:id`, `#/about`, `#/about/source`, `#/impressum`, `#/datenschutz`)
- Suche und Filter über Web Worker
- Relations-Graph (1-Hop/2-Hop, Filter `all|required|related`)
- Datensatzwechsel zwischen integrierten Katalogen
- CSV-Export mit Formel-Neutralisierung und URL-Härtung
- Service Worker für Caching/Offline-Basis
- Validierung aller geladenen JSON-Strukturen

## Architektur (Kurzüberblick)

- Frontend: React 18 + TypeScript + Vite (CSR)
- Suche/Indexierung: Browser Worker (`src/workers/searchWorker.ts`)
- Datenhaltung: statische JSON-Artefakte in `public/data/**`
- Build-Datenpipeline: `scripts/build-catalog.mjs` erzeugt Suchindex, Detail-Chunks, Registry, Profilanalyse und Service Worker
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

Zusätzliche Checks:

```bash
npm run audit:prod
npm run audit:dev
SECURITY_HEADERS_URL="https://example.org" npm run check:headers
```

## Deployment-Hinweise

### GitHub Pages

- Workflow: `.github/workflows/deploy-pages.yml`
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
  - `npm run sync:bsi` synchronisiert nur `Kataloge/*.json` bei Inhaltsänderung
  - nur bei Änderungen werden Build/Tests ausgeführt und ein PR erzeugt
  - bei unveränderten Katalogen endet der Workflow ohne PR (No-Op)

### Netlify / Hosts mit Header-Support

- Header-Policy in `netlify.toml` bzw. `public/_headers`
- auf GitHub Pages werden diese Header-Dateien nicht als Policy erzwungen

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
| `SECURITY_HEADERS_URL` | Ziel-URL für Header-Check-Skript | nein (optional) |

## Projektstruktur

```text
.
├─ src/                      # React-App, Worker, UI-Komponenten, Libs
├─ scripts/                  # Build-/Security-/Hygiene-Skripte
├─ tests/                    # Playwright E2E- und A11y-Tests
├─ Kataloge/                 # OSCAL-Quellkataloge (Input für build:data)
├─ public/data/              # generierte statische Datenartefakte
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
- [Developer Onboarding](docs/developer-onboarding.md)
- [ADR-Zusammenfassung](docs/adr-summary.md)
- [Offene Punkte / Gaps](docs/open-issues-and-gaps.md)
- [Hosting Security Headers](docs/hosting-security-headers.md)

## Lizenz

MIT, siehe `LICENSE`.
