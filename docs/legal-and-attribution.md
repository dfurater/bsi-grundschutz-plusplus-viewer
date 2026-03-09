# Recht, Lizenz und Attribution

## 1) Trennung von Code und Inhalten

- Softwarecode dieses Repositories: MIT (`LICENSE`)
- Eingebundene BSI-Inhalte (Grundschutz++-Katalogdaten): laut Quellenhinweis des Projekts unter CC BY-SA 4.0

Maßgebliche Quellenreferenz in der App:
- Route `#/about/license` (Alias `#/about/source`)
- Komponente `src/components/SourcePanel.tsx`

## 2) Primärquelle der Katalogdaten

Runtime-Primärquelle im Projekt:
- `Kataloge/Grundschutz++-catalog.json`

Upstream-Bezug:
- `BSI-Bund/Stand-der-Technik-Bibliothek`
- Pfad: `Anwenderkataloge/Grundschutz++/Grundschutz++-catalog.json`
- Synchronisation über `npm run sync:bsi` bzw. `daily-bsi-sync.yml`

## 3) Betreiberangaben und rechtliche Seiten

Rechtliche Seiten in der App:
- `#/impressum`
- `#/datenschutz`

Betreiberdaten kommen aus:
- `VITE_OPERATOR_NAME`
- `VITE_OPERATOR_ADDRESS_LINE1`
- `VITE_OPERATOR_ADDRESS_LINE2`
- `VITE_OPERATOR_EMAIL`

Diese Werte werden in `src/legal/placeholders.ts` eingelesen und im Build geprüft.

## 4) Build-Gate für rechtliche Platzhalter

`npm run build` enthält `scripts/check-legal-placeholders.mjs`.

Der Build schlägt fehl, wenn:
- eine der `VITE_OPERATOR_*`-Variablen fehlt oder leer ist
- ein Platzhalterwert (`{{...}}`) stehen bleibt

## 5) Datenschutzrelevante, im Code belegte Laufzeitaspekte

- kein eingebautes Tracking/Analytics-Skript im App-Code
- `localStorage` wird für Theme-Präferenz (`gspp-theme`) genutzt
- Service Worker kann Inhalte lokal cachen (`public/sw.js`)
- CSV-Export wird lokal im Browser erzeugt

## 6) Maintainer-Hinweise

Bei Änderungen an Impressum/Datenschutz/Attribution zusätzlich prüfen:
- `src/components/ImpressumPage.tsx`
- `src/components/DatenschutzPage.tsx`
- `src/components/SourcePanel.tsx`
- README-Abschnitte zu Lizenz/Deployment
