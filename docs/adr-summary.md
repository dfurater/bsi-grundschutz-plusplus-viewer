# ADR Summary

Dieses Dokument fasst zentrale, im Repository umgesetzte Architekturentscheidungen zusammen.

## ADR-001: Rein statische CSR-Anwendung

- Kontext: Deployment ohne serverseitige App-Komponente.
- Entscheidung: React/Vite SPA, statische Auslieferung aus `dist/`.
- Konsequenzen:
  - einfaches Hosting
  - kein Backend-Betrieb

## ADR-002: Hash-Routing statt History-Routing

- Kontext: Hosting-Ziele ohne Rewrite-Pflicht.
- Entscheidung: Navigation über Hash (`#/...`).
- Konsequenzen:
  - robust auf GitHub Pages

## ADR-003: Suchlogik im Web Worker

- Kontext: Entkopplung von Suchlast und UI-Thread.
- Entscheidung: Suche, Detail-Laden und Graph-Berechnung in `searchWorker`.
- Konsequenzen:
  - UI bleibt responsiver bei Suchoperationen

## ADR-004: Fail-closed Datenvalidierung mit Budgets

- Kontext: Verarbeitung externer und hochgeladener JSON-Daten.
- Entscheidung: Zod-Schemas plus Größen-/Mengen-/Zeitlimits.
- Konsequenzen:
  - Datenpfade brechen bei ungültigen Inputs ab

## ADR-005: Build-time Normalisierung in statische Artefakte

- Kontext: Runtime vereinfachen und Suche beschleunigen.
- Entscheidung: `build-catalog.mjs` generiert Index/Meta/Detail-Chunks aus dem Grundschutz++-Anwenderkatalog.
- Konsequenzen:
  - Runtime greift auf vorbereitete Datenstrukturen zu

## ADR-006: Single-Source-Architektur mit Anwenderkatalog

- Kontext: Fachlich maßgebliche Nutzung des fertigen BSI-Anwenderkatalogs.
- Entscheidung: Produktivpfad basiert auf `Kataloge/Grundschutz++-catalog.json` als Source of Truth.
- Konsequenzen:
  - keine Pflichtabhängigkeit auf Kernel/Methodik/Profile im Viewer-Laufzeitpfad

## ADR-007: Build-Gate für Rechtsseiten-Platzhalter

- Kontext: Vermeidung von Deployments mit Dummy-Betreiberdaten.
- Entscheidung: Build schlägt fehl bei fehlenden/platzhalterhaften `VITE_OPERATOR_*`.
- Konsequenzen:
  - Rechtsseiten-Konfiguration wird vor Build validiert

## ADR-008: Service Worker für Caching

- Kontext: bessere Verfügbarkeit/Performance auf statischem Hosting.
- Entscheidung: SW mit Network-First (HTML/JSON) und Stale-While-Revalidate (Assets).
- Konsequenzen:
  - wiederholte Zugriffe profitieren von Cache-Strategien
