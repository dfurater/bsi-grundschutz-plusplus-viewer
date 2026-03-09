# QA- und Coverage-Gap-Analyse (Update: 2026-03-09)

## 1. Executive Summary

- Die erweiterte Phase-B-Testwelle wurde umgesetzt und validiert.
- Kritische Lücken aus dem letzten Gap-Stand (`src/App.tsx`, `src/main.tsx`, `src/hooks/useFocusTrap.ts`, große Teile der Worker-Branches) sind substanziell geschlossen.
- Coverage ist aktiv, CI-gated und deutlich erhöht.
- Offene Restlücken liegen jetzt vor allem bei tieferen Branch-Pfaden in `RelationGraphLite`/`ControlDetailPanel` sowie bei fehlenden Worker-Last-/Soak- und Produktiv-Header-Tests.

## 2. Aktueller QA- und Coverage-Stand

### 2.1 Lokal ausgeführte Checks

- `npm run test:unit` ✅
  - Testdateien: `25`
  - Tests: `117`
- `npm run test:unit:coverage` ✅
  - Coverage Summary:
    - Statements: `64.14%`
    - Branches: `53.16%`
    - Functions: `60.00%`
    - Lines: `64.58%`
- `npm run check:release-hygiene` ✅

### 2.2 Zielmodule (Delta)

- `src/App.tsx`: `0% -> 50.79%` Statements
- `src/main.tsx`: `0% -> 90.24%` Statements
- `src/hooks/useFocusTrap.ts`: Statements `13.11% -> 96.72%`, Branches `0% -> 77.77%`
- `src/workers/searchWorker.ts`: Statements `70.56% -> 80.49%`, Branches `47.38% -> 61.32%`
- `src/components/ResultList.tsx`: `100%` über Statements/Branches/Functions/Lines
- `src/components/GroupPage.tsx`: Statements/Lines/Functions `100%`, Branches `86.36%`

## 3. Umgesetzte Risikopfade

### 3.1 App-Orchestrierung

- Boot-Lade-/Fehlersequenz
- Hash-Routing und Such-/Detail-Kontext
- Back-to-results
- CSV-Export Erfolg/Fehler
- Suchfehler und Fallback-Zustände

### 3.2 Focus- und Keyboard-Logik

- Tab- und Shift+Tab-Zyklus
- Escape-Handling
- Fokus-Restore bei Schließen/Unmount
- Verhalten ohne fokussierbare Elemente
- Cleanup

### 3.3 Worker-Branches

- `effort-asc`/`effort-desc` inkl. fehlender Aufwandswerte
- Filterkombinationen, Facets, Offset/Limit
- Fail-closed Fehlerpfade bei fehlenden Pflichtfeldern
- Zeitbudget-/Timeout-Fehlerpfad
- Cancel-/Abbruchverhalten

### 3.4 Main Lifecycle

- Service-Worker-Unregister auf localhost
- Service-Worker-Register in PROD
- Update-/Reload-Pfad (`updatefound`, `statechange`, `controllerchange`)
- Robustheit bei fehlenden Browser-SW-APIs

### 3.5 ResultList / GroupPage Interaktionen

- Checkbox-/Card-Klicks und Callback-Auslösung
- Pagination inkl. Reset-Verhalten
- Select-all Zustandswechsel
- Empty-/Reset-Interaktionen
- zustandsabhängige UI-Transitions

## 4. Verbleibende Lücken (priorisiert)

1. Branch-Abdeckung in `src/components/RelationGraphLite.tsx`.
2. Branch-Abdeckung in Teilen von `src/components/ControlDetailPanel.tsx`.
3. Kein dedizierter Worker-Last-/Soak-Test unter hoher Last.
4. Kein automatisierter Produktiv-Header-Testpfad außerhalb der Repository-CI.

## 5. Empfehlungen für die nächste Welle

1. `RelationGraphLite` auf Interaktions-/Filter-/Zoom-Branches testen.
2. `ControlDetailPanel` auf Fehlerpfade, Accordion-Transitions und Relation-Callbacks vertiefen.
3. Worker-Race-/Cancel-Szenarien unter höherer Datenlast ergänzen.
4. Externen Produktiv-Header-Check (außerhalb Repo-CI) dokumentieren und automatisieren.

## 6. Hinweise

- Diese Analyse ist ein laufendes Maintenance-Dokument.
- Maßgebliche Endstandsreferenz bleibt `docs/qa-coverage-finalization.md`.
