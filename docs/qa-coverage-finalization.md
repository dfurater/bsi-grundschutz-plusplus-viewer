# QA/Coverage Finalization (Stand: 2026-03-09)

## 1. Executive Summary

Die in Phase A, B und C integrierten Maßnahmen wurden um eine zusätzliche Phase-B-Testwelle für Orchestrierungs- und Interaktionspfade erweitert.
Der technische Endstand für QA/Coverage ist konsistent dokumentiert; widersprüchliche Alt-Aussagen wurden bereinigt, und historische Zwischenstands-Dokumente sind klar als nicht maßgeblich markiert.

Maßgeblich für den Endstand sind:

- `vitest.config.ts` (Coverage-Definition)
- `.github/workflows/quality.yml` (CI-Gates)
- `docs/testing.md` (laufende Teststrategie)
- `docs/qa-coverage-finalization.md` (diese Datei als Endstandsreferenz)

## 2. Konsolidierter finaler QA-/Coverage-Stand

- Unit-/Integrationsnahe Tests laufen über Vitest (`src/**/*.test.ts(x)`).
- Browser-QA ist getrennt in Lighthouse + Playwright/Axe abgebildet.
- Unit-Coverage ist aktiv und gate-relevant (global thresholds in `vitest.config.ts`).
- Release-Hygiene und Dependency-Audits sind im schnellen CI-Gate enthalten.
- Die größten bisherigen Lücken (`src/App.tsx`, `src/main.tsx`, `src/hooks/useFocusTrap.ts`, zentrale Worker-Branches) sind substanziell adressiert.
- Historische Phasenprotokolle bleiben zur Nachvollziehbarkeit erhalten, definieren aber nicht mehr den aktuellen Sollzustand.

## 3. Finaler Zuschnitt der Testpyramide im Repo

1. Unit-/modulnahe Integration (Vitest)
   - Sicherheitslogik, Validierung, Routing, Worker-Client, Worker-Contract, zentrale UI-Zustandskomponenten.
2. Browser-E2E (Playwright)
   - Kernflüsse aus Nutzerperspektive (Navigation, Suche/Filter/Sortierung, Deep-Link/Fallback, CSV-Flow).
3. A11y (Playwright + Axe)
   - Kritische und schwerwiegende Accessibility-Verletzungen auf Kernrouten und Overlay-Zuständen.
4. Lighthouse-Gates
   - Performance/Accessibility/Best-Practices mit Mindestwerten und Budgets.
5. Release-Hygiene
   - Artefaktprüfung auf verbotene Dateien im Build-Output.

## 4. Finale Coverage-Konfiguration und Begründung

Quelle: `vitest.config.ts`

- Provider: `v8`
- Reporter: `text`, `text-summary`, `json-summary`, `lcov`
- Reports-Pfad: `coverage/unit`
- Include: `src/**/*.{ts,tsx,js}`
- Excludes:
  - `src/**/*.test.ts`
  - `src/**/*.test.tsx`
  - `src/**/*.d.ts`
  - `src/vite-env.d.ts`
  - `src/types.ts`
  - `src/styles.css`
- Globale Mindestschwellen:
  - `lines: 30`
  - `functions: 34`
  - `branches: 24`
  - `statements: 30`

Begründung:

- Der Zuschnitt misst echte App-Implementierung unter `src/`.
- Testdateien, Typ-Deklarationen und Styling werden bewusst nicht in Prozentkennzahlen eingerechnet.
- Generierte Artefakte (`public/data/**`, `public/sw.js`) liegen außerhalb der Coverage-Zielmenge.
- Schwellen liegen über "nur Build-grün", bleiben aber robust genug für inkrementelle Weiterentwicklung ohne kosmetische Ausschlüsse.

## 5. Finale CI-/Gate-Strategie

Quelle: `.github/workflows/quality.yml`

- Job `qa` (schneller Pflicht-Gate):
  - Dependency Audit (`audit:prod`, `audit:dev`)
  - Unit-Coverage-Gate (`test:unit:coverage`)
  - Release-Hygiene (`check:release-hygiene`)
  - Coverage-Artefakt-Upload (`coverage/unit`)
- Job `browser-qa` (schwerer, nachgelagert):
  - Build
  - `qa:browser` (Lighthouse + Playwright/Axe)

Konsolidierungsentscheidung:

- Die bestehende Zweiteilung wurde beibehalten, da sie schnelle Pflichtsignale und schwerere Browserprüfungen sauber trennt.
- Keine zusätzliche Workflow-Variante eingeführt, um konkurrierende Gate-Pfade zu vermeiden.

## 6. Bewusste Excludes und Nicht-Ziele

Bewusste Excludes:

- Generierte Outputs: `public/data/**`, `public/sw.js`, `dist/**`
- Test-/Report-Artefakte: `coverage/**`, `.lighthouseci/**`, `test-results/**`, `playwright-report/**`
- Nicht-codebezogene Inhalte: `docs/**`, `Kataloge/**`, `.github/**`

Nicht-Ziele dieser Finalisierung:

- Keine neue Phase D; es wurde nur eine gezielte, risikobasierte Phase-B-Erweiterung umgesetzt.
- Keine großflächigen Refactorings von `App.tsx` oder Worker-Architektur.
- Keine neuen fachlichen Produktfeatures.

## 7. Inkonsistenzen/Altlasten und wie sie aufgelöst wurden

Aufgelöste Inkonsistenzen:

1. Widerspruch in `docs/testing.md` (Coverage konfiguriert vs. "Coverage-Reports sind nicht konfiguriert") entfernt.
2. Veraltete Aussage in `docs/architecture.md` ("Keine Coverage-Messung konfiguriert") korrigiert.
3. Veraltete Gap-Aussage in `docs/open-issues-and-gaps.md` ("Es gibt keine Coverage-Metriken") ersetzt.
4. Historische Phase-A/B/C-Dokumente als historische Umsetzungsprotokolle markiert, mit Verweis auf diese Finaldatei.
5. `.gitignore` um `coverage` ergänzt, damit lokale Coverage-Ausgaben keinen unnötigen Git-Noise erzeugen.

Verbleibender historischer Kontext:

- `docs/coverage-phase-a-implementation.md`
- `docs/coverage-phase-b-implementation.md`
- `docs/coverage-phase-c-implementation.md`

Diese Dokumente bleiben für Verlauf und Reviewbarkeit erhalten, sind aber nicht mehr normativ.

## 8. Verbleibende Restlücken / Risiken

1. Kein dedizierter Last-/Soak-Test für Worker unter hoher Last.
2. Kein automatisierter Testpfad für reale Produktiv-Header außerhalb der Repository-CI.
3. `src/components/RelationGraphLite.tsx` und Teilpfade von `src/components/ControlDetailPanel.tsx` sind branch-seitig unterdurchschnittlich abgesichert.
4. TypeScript bleibt bei `strict: false`; potenzielle Typregressionen werden nicht maximal früh erkannt.

Diese Punkte sind bekannt, akzeptiert und bewusst nicht im Rahmen dieser Finalisierung erweitert worden.

## 9. Ausgeführte Validierungsschritte und Ergebnis

Lokal ausgeführt auf Branch `test/phase-b-orchestration-interactions`:

1. `npm run test:unit:coverage`
   - Ergebnis: erfolgreich
   - Testdateien: 25
   - Tests: 117 (alle grün)
   - Coverage Summary:
     - Statements: 64.14%
     - Branches: 53.16%
     - Functions: 60.00%
     - Lines: 64.58%
   - Schwellen eingehalten: ja

2. `npm run test:unit`
   - Ergebnis: erfolgreich
   - Enthält erfolgreich:
     - `npm run build`
     - `npm run test:unit:raw`
   - Unit-Ergebnis:
     - 25/25 Testdateien bestanden
     - 117/117 Tests bestanden

3. `npm run check:release-hygiene`
   - Ergebnis: erfolgreich

Nebenbefunde:

- Build erzeugt erwartungsgemäß generierte Artefakte unter `public/data/**` und `public/sw.js`.
- Keine Änderung am GitHub-Pages-Verhalten.

## 10. Klare Einschätzung: finalisiert oder noch nicht finalisiert

Einschätzung: **finalisiert**.

Der QA-/Coverage-Endstand ist konsistent, überprüfbar und wartbar dokumentiert.
Die verbleibenden Lücken sind klar benannt, bewusst akzeptiert und nicht Ergebnis von unbeabsichtigter Inkonsistenz.
