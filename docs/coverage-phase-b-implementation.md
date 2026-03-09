# Coverage Phase B Implementation (Update: 2026-03-09)

> Historisches Umsetzungsprotokoll. Maßgeblicher Endstand: `docs/qa-coverage-finalization.md`.

## 1. Kurzüberblick der umgesetzten Phase-B-Maßnahmen

Die erweiterte Phase-B-Welle wurde auf fünf priorisierte Bereiche umgesetzt:

1. `src/App.tsx` (Orchestrierung)
2. `src/hooks/useFocusTrap.ts` (DOM-/Keyboard-Fokuslogik)
3. `src/workers/searchWorker.ts` (zusätzliche Branch-Pfade)
4. `src/main.tsx` (Startup-/Service-Worker-Lifecycle)
5. `src/components/ResultList.tsx` und `src/components/GroupPage.tsx` (echte Interaktion statt statischem Rendering)

Neben neuen Tests wurde ein kleiner funktional-neutraler Refactor in `src/main.tsx` vorgenommen (exportierbare Bootstrap-Funktionen für deterministische Lifecycle-Tests).

## 2. Umgesetzte Tests nach Bereich

### App-Orchestrierung (`src/App.test.tsx`)

- Boot-Loading- und Boot-Error-Pfade
- Hash-Routing mit Such-/Detailkontext und Back-to-results-Navigation
- Suchfehlerpfad bei Worker-Fehler
- CSV-Export Erfolgs- und Fehlerpfad
- Fallback-Verhalten bei ungültigem Gruppenkontext

### Focus Trap (`src/hooks/useFocusTrap.test.tsx`)

- Tab-Zyklus (letztes -> erstes Fokusziel)
- Shift+Tab-Zyklus (erstes/Container -> letztes)
- Escape-Handling inkl. aktualisiertem Callback
- Fallback ohne fokussierbare Elemente
- Fokus-Restore bei Deaktivierung/Unmount und Listener-Cleanup

### Search Worker (`src/workers/searchWorker.test.ts`)

- `effort-asc` / `effort-desc` inkl. fehlender Werte am Ende
- Filterkombinationen mit Facet-Berechnung auf gefilterter Ergebnismenge
- Offset-/Limit-Pfade
- Fail-closed bei fehlender `indexUrl` / fehlender `controlId`
- Zeitbudget-/Timeout-Fehlerpfad

### Main Lifecycle (`src/main.test.tsx`)

- App-Mount in `#root`
- SW-Unregister auf localhost
- SW-Register in PROD inkl. `updatefound`/`statechange`/`controllerchange`-Reload
- Robustheit bei fehlenden Browser-SW-APIs

### ResultList / GroupPage Interaktionen

- Checkbox-/Card-Klicks und Callback-Auslösung
- Pagination (`Mehr laden`) inkl. Reset-Verhalten bei Kontextwechsel
- Select-all-Transitions (default/busy/all-selected)
- Empty-State-/Reset-Interaktionen
- zustandsabhängige UI-Transitions (selected/export-selected/chips)

## 3. Coverage-Wirkung der Phase-B-Erweiterung

Gemessen mit `npm run test:unit:coverage`:

- Global:
  - Statements: `42.17% -> 64.14%`
  - Branches: `37.31% -> 53.16%`
  - Functions: `39.95% -> 60.00%`
  - Lines: `42.35% -> 64.58%`
- Wichtige Zielmodule:
  - `src/App.tsx`: `0% -> 50.79%` Statements
  - `src/main.tsx`: `0% -> 90.24%` Statements
  - `src/hooks/useFocusTrap.ts`: `13.11% -> 96.72%` Statements, Branches `0% -> 77.77%`
  - `src/workers/searchWorker.ts`: Statements `70.56% -> 80.49%`, Branches `47.38% -> 61.32%`
  - `src/components/ResultList.tsx`: `100%` über alle vier Metriken
  - `src/components/GroupPage.tsx`: Statements/Lines/Functions `100%`, Branches `86.36%`

## 4. Ausgeführte Validierung

- `npm run test:unit` ✅
- `npm run test:unit:coverage` ✅
- `npm run check:release-hygiene` ✅

Ergebnisstand:
- Testdateien: `25`
- Tests: `117`
- Alle grün

## 5. Verbleibende Restlücken nach Phase B

1. Kein dedizierter Last-/Soak-Test für den Worker unter hoher Last.
2. Kein automatisierter Produktiv-Header-Testpfad außerhalb der Repository-CI.
3. Branch-seitige Lücken vor allem in `src/components/RelationGraphLite.tsx` und Teilen von `src/components/ControlDetailPanel.tsx`.

## 6. Hinweise zu Artefakten/Hosting

- `public/data/**` und `public/sw.js` werden bei Builds erwartungsgemäß lokal generiert, ohne versionierte Artefaktänderungen.
- Keine Änderung am GitHub-Pages-Verhalten.
