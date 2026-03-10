# Architektur

## Systemkontext

Die Anwendung ist eine rein statische Client-Side-React-App (CSR) ohne eigenes Backend.

- Runtime: Browser (React + TypeScript + Vite-Bundle)
- Datenquelle zur Build-Zeit: `Kataloge/Grundschutz++-catalog.json`
- Generierte Runtime-Artefakte: `public/data/**`, `public/sw.js`
- Hostingziel: statische Hosts (primär GitHub Pages)

## Verbindlicher Runtime-/Artefakt-Vertrag (EH-02/EH-03)

- Single-Catalog: Build-Input ist ausschließlich `Kataloge/Grundschutz++-catalog.json`.
- Feste Runtime-Pfade: `./data/catalog-meta.json`, `./data/catalog-index.json`, `./data/details`.
- Kein Dataset-Switching in der UI.
- Kein manueller JSON-Upload (kein Upload-UI, kein Upload-State, kein Upload-Worker-Protokoll).
- Build bereinigt Legacy-Ausgaben (`public/data/datasets`, `catalog-registry.json`, `profile-links.json`).

## Informationsarchitektur und Routing

Hash-Routing ist bewusst gewählt (kein History-Rewrite erforderlich):

- `#/` Startseite mit Top-Gruppen
- `#/search` Suche, Filter, Sortierung, Ergebnisliste
- `#/group/:id` Gruppenansicht mit Untergruppen und Controls
- `#/control/:id` direkter Control-Deep-Link
- `#/about` Kontext/Projektseite
- `#/about/license` Quellen/Lizenz (Alias: `#/about/source`)
- `#/impressum`, `#/datenschutz` rechtliche Seiten

## Hauptbausteine

### 1) UI-Orchestrierung (`src/App.tsx`)

- bootstrapped Metadaten + Worker-Index
- nutzt feste Asset-Pfade statt dynamischer Dataset-Registries
- hält Routing-/UI-Zustand (Suche, Filter, Sortierung, Selektion)
- steuert Detail-/Graph-Laden und CSV-Export-Flows

### 2) Search Worker (`src/workers/searchWorker.ts`)

- lädt/validiert den Suchindex
- verarbeitet Suchanfragen inkl. Ranking, Filterung, Facettenzählung
- lädt Detail-Chunks bei Bedarf
- berechnet Nachbarschaftsgraphen (1/2 Hops)
- unterstützt Request-Cancel und Zeitbudgets

### 3) Datennormalisierung (`src/lib/normalize-core.js` + `scripts/build-catalog.mjs`)

- normalisiert OSCAL-Strukturen in UI-/Worker-taugliche Artefakte
- erzeugt `catalog-meta.json`, `catalog-index.json`, `details/<TOPGROUP>.json`, `build-info.json`
- rendert Service Worker aus Template (`scripts/sw.template.js` -> `public/sw.js`)
- bereinigt Legacy-Output-Pfade aktiv (`public/data/datasets`, alte Registry/Profile)

### 4) Service Worker (`public/sw.js`)

- wird im Build generiert
- lokal (localhost/127.0.0.1) deaktiviert bzw. deregistriert
- in Production registriert
- Caching-Strategien:
  - Navigation/HTML und JSON: Network First mit Cache-Fallback
  - Assets: Stale-While-Revalidate

## Datenflüsse

### Build-Zeit

1. `scripts/build-catalog.mjs` liest den Anwenderkatalog.
2. `normalizeCatalog` erzeugt normalisierte Gruppen/Controls/Relationen.
3. Skript schreibt `public/data/**` und `public/sw.js`.
4. Vite erzeugt `dist/`.

### Laufzeit

1. UI lädt den Katalog über feste Single-Catalog-Pfade (`./data/catalog-meta.json`).
2. `SearchClient` initialisiert Worker mit `./data/catalog-index.json` und `./data/details`.
3. Worker beantwortet `search`/`get-control`/`get-neighborhood` und unterstützt `cancel`.
4. UI rendert Treffer, Detailinformationen, Relationsgraph und CSV-Export.

## Architekturgrenzen und Nicht-Ziele

- kein Backend, keine serverseitige Session
- keine Authentifizierung/Autorisierung
- keine Multi-User-Funktionen
- keine serverseitige Persistenz

## Technische Leitplanken

- Hash-Routing statt History-Routing
- Fail-closed-Validierung mit Zod + Budgets auf kritischen Datenpfaden
- Sicherheitsrelevante Logik (URL-Härtung, CSV-Neutralisierung, Routing-/Query-Sanitizing) in dedizierten Lib-Modulen
- TypeScript `strict` ist derzeit `false`
- keine dedizierte Lint-/Format-Pipeline in `package.json`

Siehe auch:
- `docs/api-and-interfaces.md` (konkrete Schnittstellenverträge)
- `docs/security-review.md` (Sicherheitsannahmen und Restrisiken)
