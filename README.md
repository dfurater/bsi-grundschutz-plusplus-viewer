# Grundschutz++ Katalog-App

Statische React/Vite-Webanwendung zur Suche, Navigation und lokalen Auswertung des BSI-Grundschutz++-Anwenderkatalogs (OSCAL JSON).

## Was die App ist

Die App macht den Katalog im Browser nutzbar, ohne eigenes Backend:
- Volltext-/ID-Suche mit Facetten und Sortierung
- Navigation über Bereiche, Gruppen und Controls
- Control-Detailansicht inkl. Relationen (1-Hop/2-Hop)
- CSV-Export ausgewählter Controls
- Quellen-, Versions- und Lizenztransparenz in der Oberfläche

## Zielgruppe

- Teams, die Grundschutz++-Controls schnell durchsuchen und einordnen wollen
- Entwickler/Architekten, die OSCAL-Katalogdaten lokal auswerten möchten

## Bewusste Nicht-Ziele

- Keine serverseitige API, keine Datenbank, kein Login
- Keine Schreiboperationen gegen externe Systeme
- Kein Compliance- oder Zertifizierungsversprechen durch die Anwendung selbst

## Routing (Hash-basiert)

- `#/`
- `#/search`
- `#/group/:id`
- `#/control/:id`
- `#/about`
- `#/about/license` (Legacy-Alias: `#/about/source`)
- `#/impressum`
- `#/datenschutz`

## Voraussetzungen

- Node.js `>=20.19.0` (`.nvmrc` ist maßgeblich)
- npm `>=10`

## Lokaler Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Erforderliche Betreibervariablen (für produktionsnahe Builds):
- `VITE_OPERATOR_NAME`
- `VITE_OPERATOR_ADDRESS_LINE1`
- `VITE_OPERATOR_ADDRESS_LINE2`
- `VITE_OPERATOR_EMAIL`

## Build, Test, QA

```bash
npm run build
npm run test:unit
npm run check:release-hygiene
npm run qa
```

Wichtige Hinweise:
- `npm run build` erzeugt Datenartefakte und den Service Worker neu.
- `npm run test:unit` führt intern zuerst `npm run build` aus.
- `public/data/**` und `public/sw.js` sind generierte Artefakte und in Git ignoriert.

## Wichtige Skripte

| Skript | Zweck |
|---|---|
| `npm run dev` | `build:data` + Vite Dev-Server |
| `npm run sync:bsi` | BSI-Quellkatalog aus Upstream synchronisieren |
| `npm run build:data` | Suchindex/Meta/Detail-Chunks + `public/sw.js` generieren |
| `npm run build` | Release-Build inkl. Legal-Placeholder-Check |
| `npm run test:unit` | Build + Vitest |
| `npm run test:unit:coverage` | Build + Vitest inkl. Coverage-Gate |
| `npm run qa` | Build + Unit-Tests + Release-Hygiene + Browser-QA |

## Deployment

### GitHub Pages

Workflow: `.github/workflows/deploy-pages.yml`
- Trigger: nach erfolgreichem `quality`-Workflow auf `main` (`workflow_run`) oder manuell (`workflow_dispatch`)
- setzt `VITE_BASE_PATH=/${{ github.event.repository.name }}/`
- erwartet Secrets für `VITE_OPERATOR_*`

### Daily Catalog Sync

Workflow: `.github/workflows/daily-bsi-sync.yml`
- Trigger: täglich (`cron: 23 4 * * *`, UTC) und manuell
- synchronisiert `Kataloge/Grundschutz++-catalog.json` aus `BSI-Bund/Stand-der-Technik-Bibliothek`
- erstellt nur bei Katalogänderung einen PR

## Dokumentation

- [Architektur](docs/architecture.md)
- [API- und Schnittstellen](docs/api-and-interfaces.md)
- [Setup und Betrieb](docs/setup-and-operations.md)
- [Testing und QA](docs/testing.md)
- [Security Review](docs/security-review.md)
- [Recht, Lizenz und Attribution](docs/legal-and-attribution.md)

## Lizenz

- Code: MIT (`LICENSE`)
- Eingebundene BSI-Inhalte: CC BY-SA 4.0 (siehe In-App-Seite „Quellen & Lizenz“ und `docs/legal-and-attribution.md`)
