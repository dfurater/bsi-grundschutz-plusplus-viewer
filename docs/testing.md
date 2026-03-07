# Testing

## Teststrategie

### 1) Unit-Tests (Vitest)

- Konfiguration in `vitest.config.ts` (`src/**/*.test.ts(x)`, Environment `node`).
- Schwerpunkte:
  - CSV/Export-Härtung (`csv`, `controlExport`)
  - URL-Sicherheit (`urlSafety`)
  - Routing-Härtung (`routing`)
  - Datenschema-Validierung inkl. Budgetgrenzen (`dataSchemas`)
  - statisches Rendering zentraler UI-Komponenten

### 2) End-to-End-Tests (Playwright)

- `tests/core-flows.spec.ts` deckt Kernflows ab:
  - Such-/Filter-/Sortierflüsse
  - responsive Breakpoints
  - Overlay-/Fokusverhalten
  - CSV-UI-Flows

### 3) Accessibility-Tests

- `tests/a11y.spec.ts` mit `@axe-core/playwright`.
- Prüfung auf critical/serious Violations auf definierten Routen und mit offenem Overlay.

### 4) Performance-/Qualitätsgates

- Lighthouse CI (`lighthouserc.json`) mit Mindestwerten/Budgets.

### 5) Release-Hygiene

- Skript prüft verbotene Artefakte in `dist/` (`.DS_Store`, `.map`).

## Testausführung

### Lokal

```bash
npm run test:unit
npm run qa
```

Hinweis: `public/data/**` und `public/sw.js` sind nicht versioniert und werden im Build erzeugt. `npm run test:unit` führt deshalb intern zuerst `npm run build` aus.

### CI

Workflow `.github/workflows/quality.yml` führt aus:
1. Install
2. Playwright Browser Install
3. Dependency-Audit
4. `npm run qa`

## Nachgewiesene lokale Läufe (2026-03-06)

- `npm run test:unit`
  - 13 Testdateien
  - 34 Tests
  - alle erfolgreich

- `npm run build`
  - erfolgreich

- `npm run check:release-hygiene`
  - erfolgreich

## Coverage-Hinweise

- Coverage-Reports sind nicht konfiguriert.

## Testlücken

1. Kein dedizierter Integrationstest für Worker-Protokollgrenzen unter Last.
2. Kein Snapshot-/Regressionstest für komplette Seitenzustände.
3. Kein dedizierter automationsgestützter Test für reale Response-Header auf dem Produktiv-Host.

## Empfohlene Prioritäten

### Must-have

1. Coverage-Messung in CI ergänzen und Schwellwerte definieren.
2. Kritische Worker-Flows (Timeout/Cancel/Budget) mit gezielten Integrationstests absichern.

### Should-have

1. E2E-Tests für Upload + Graph-Klickpfade erweitern.
2. Zusätzliche Integrationsprüfungen für Host-spezifisches Laufzeitverhalten ergänzen.

### Nice-to-have

1. Performance-Regressionstests für Suchlatenz und Graphaufbau ergänzen.
