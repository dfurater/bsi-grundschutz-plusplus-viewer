# Architektur

## Systemkontext

- Clientseitige Single-Page-App (React/Vite) für Grundschutz++-Katalogdaten.
- Kein eigener Application-Server; Daten werden als statische Dateien ausgeliefert (`public/data/**`, `public/sw.js`, im Build generiert).
- Eingabedaten liegen als OSCAL-JSON-Datei in `Kataloge/Grundschutz++-catalog.json`.
- Deployment ist auf statische Hosts ausgelegt, inklusive GitHub Pages Workflow.

## Container-/Komponentenübersicht

### Browser UI (React)

Aufgaben:
- Routing und Seitenzustände (`src/App.tsx`)
- Suche, Filter, Detailansichten
- CSV-Export und lokaler JSON-Upload
- Quellen-/Lizenz-/Versions- und Rechtsseiten

Wichtige Komponenten:
- `AppHeader`, `SearchOverlay`, `FacetPanel`, `ResultList`, `ControlDetailPanel`, `RelationGraphLite`, `GroupOverview`, `GroupPage`, `SourcePanel`, `AppFooter`

### Search Worker (Web Worker)

Aufgaben:
- Laden und Validieren des Suchindex
- Suchausführung inkl. Ranking, Filterung, Facettenzählung
- Nachladen von Detail-Chunks
- Graph-Berechnung (1-/2-Hop)
- Ingestion von lokal hochgeladenem OSCAL-JSON

Technik:
- Worker-Protokoll (`init`, `search`, `get-control`, `get-neighborhood`, `load-upload`, `cancel`)
- Zod-Schema-Validierung und Budgets

### Build-/Transformationspipeline (Node)

Aufgaben:
- Normalisierung des Grundschutz++-Anwenderkatalogs (`normalize-core.js`)
- Erzeugung von:
  - `catalog-index.json`
  - `catalog-meta.json`
  - `details/<TOPGROUP>.json`
  - `build-info.json`
  - `public/sw.js`

### Statisches Hosting

Aufgabe:
- Auslieferung der generierten Assets aus `dist/`

## Hauptmodule

- `src/App.tsx`: Zustands- und Flow-Orchestrierung
- `src/workers/searchWorker.ts`: Suchkern, Worker-API, Detail-Ladepfad, Upload-Ingestion
- `src/lib/dataSchemas.ts`: zentrale Schema-/Budget-Validierung
- `src/lib/normalize-core.js`: Extraktion von Gruppen/Controls/Facetten/Relationen aus OSCAL
- `scripts/build-catalog.mjs`: Datenbuild aus dem Grundschutz++-Anwenderkatalog

## Datenflüsse

### Build-Zeit

1. `scripts/build-catalog.mjs` liest `Kataloge/Grundschutz++-catalog.json`.
2. `normalizeCatalog` erzeugt normalisierte Strukturen.
3. Skript schreibt statische Assets nach `public/data/**` und `public/sw.js`.
4. Vite baut die App nach `dist/`.

### Laufzeit

1. App lädt `catalog-index.json` und `catalog-meta.json`.
2. Worker lädt bei Bedarf `details/<TOPGROUP>.json`.
3. UI rendert Treffer, Details, Relationen und Exporte.

### Upload-Zeit (lokal)

1. Nutzer lädt eine JSON-Datei im Browser.
2. Worker validiert und normalisiert Upload-JSON.
3. In-Memory-Index ersetzt den statischen Index bis zum Reload.

## Schnittstellen

- Interne Schnittstellen:
  - Worker Message API (`SearchClient` <-> `searchWorker`)
  - Hash-Routing API (URL-Parameter für Suche/Sortierung/Filter/Control-Kontext)
  - Typgrenzen über `src/types.ts`

- Externe Schnittstellen:
  - Statische JSON-Dateien unter `./data/**`
  - Datei-Upload (`application/json`)
  - CSV-Dateidownload als Browser-Blob

## Zentrale Architekturentscheidungen

- Rein statisches CSR-Deployment ohne Backend.
- Suchlogik in separatem Worker.
- Datenschema-Validierung und Budgetgrenzen für kritische Datenpfade.
- Hash-Routing statt History-Routing.
- Primärquelle ist der fertige BSI-Grundschutz++-Anwenderkatalog.

## Technische Schulden und Grenzen

- TypeScript `strict` ist `false`.
- Keine dedizierte Linting-/Formatting-Pipeline im `package.json`.
- Keine Coverage-Messung konfiguriert.
- GitHub Pages bietet nur eingeschränkte, nicht repository-lokale Steuerung von Response-Headern.
- Keine serverseitigen APIs oder Datenbanken.
- Keine Authentifizierung/Autorisierung implementiert.
