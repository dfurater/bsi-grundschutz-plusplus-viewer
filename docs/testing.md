# Testing

## Maßgeblicher Stand

Der maßgebliche QA-/Coverage-Endstand ist in `docs/qa-coverage-finalization.md` beschrieben.
Diese Datei (`docs/testing.md`) beschreibt die laufende Teststrategie und verweist auf die dafür gültigen Konfigurationsquellen.

## Testpyramide im Repository

### 1) Unit- und modulnahe Integrationstests (Vitest)

- Konfiguration: `vitest.config.ts`
- Testquellen: `src/**/*.test.ts`, `src/**/*.test.tsx`
- Standard-Environment: `node` (DOM-nahe Tests nutzen explizit `jsdom` pro Testdatei)
- Schwerpunkt:
  - Sicherheits- und Validierungslogik (`csv`, `urlSafety`, `searchSafety`, `validation`, `fetchJsonSafe`, `dataSchemas`)
  - Routing- und Worker-Client-Vertragsgrenzen (`routing`, `searchClient`)
  - Worker-Contract-Grenzen (`searchWorker`)
  - zentrale UI-Zustandspfade auf Komponentenebene (`ResultList`, `GroupPage`, `App`, `main`, `useFocusTrap`, weitere Kernkomponenten)

### 2) Browser-E2E (Playwright)

- Konfiguration: `playwright.a11y.config.ts`
- Kernflüsse: `tests/core-flows.spec.ts`
- Fokus: Navigation, Suche/Filter/Sortierung, Deep-Link-Fallbacks, CSV-Flow

### 3) Accessibility (Playwright + Axe)

- Datei: `tests/a11y.spec.ts`
- Fokus: kritische/ernsthafte Violations auf relevanten Routen und Overlay-Zuständen

### 4) Performance-/Qualitätsgates (Lighthouse)

- Konfiguration: `lighthouserc.json`
- Fokus: Performance, Accessibility, Best Practices sowie ausgewählte Budgets

### 5) Release-Hygiene

- Skript: `scripts/check-release-hygiene.mjs`
- Prüft verbotene Artefakte in `dist/` (z. B. `.DS_Store`, `.map`)

## Finale Coverage-Konfiguration (Unit)

Konfiguriert in `vitest.config.ts`:

- Provider: `v8`
- Reports: `text`, `text-summary`, `json-summary`, `lcov`
- Ausgabepfad: `coverage/unit`
- Include: `src/**/*.{ts,tsx,js}`
- Excludes:
  - `src/**/*.test.ts`
  - `src/**/*.test.tsx`
  - `src/**/*.d.ts`
  - `src/vite-env.d.ts`
  - `src/types.ts`
  - `src/styles.css`
- Aktive Mindestschwellen (global):
  - `lines: 30`
  - `functions: 34`
  - `branches: 24`
  - `statements: 30`

Hinweis: Generierte Artefakte (`public/data/**`, `public/sw.js`) liegen bewusst außerhalb der Unit-Coverage-Messung.

## CI-/Gate-Strategie

Workflow: `.github/workflows/quality.yml`

1. `qa` (schneller, PR-pflichtiger Gate):
   - `npm run audit:prod && npm run audit:dev`
   - `npm run test:unit:coverage`
   - `npm run check:release-hygiene`
   - Upload des Coverage-Artefakts (`coverage/unit`)
2. `browser-qa` (schwerer Lauf, nach `qa`):
   - Build
   - Lighthouse
   - Playwright/Axe

Diese Trennung hält den Pflicht-Gate schnell und verschiebt browsernahe, langsamere Prüfungen in einen separaten Lauf.

## Relevante lokale Kommandos

```bash
npm run test:unit
npm run test:unit:coverage
npm run build
npm run check:release-hygiene
npm run qa
```

Hinweis: `npm run test:unit` und `npm run test:unit:coverage` führen intern zuerst `npm run build` aus, damit generierte Datenartefakte lokal verfügbar sind.

## Verbleibende bekannte Lücken

1. Kein dedizierter Last-/Soak-Test für Worker unter hoher Last.
2. Kein automatisierter Produktiv-Header-Testpfad außerhalb der Repository-CI.
3. `src/components/RelationGraphLite.tsx` und Teile von `src/components/ControlDetailPanel.tsx` bleiben branch-seitig unterdurchschnittlich getestet.

## Historische Dokumente

- `docs/coverage-phase-a-implementation.md`
- `docs/coverage-phase-b-implementation.md`
- `docs/coverage-phase-c-implementation.md`

Diese Dateien sind Implementierungsprotokolle der Zwischenstände und nicht die maßgebliche Endstandsdefinition.
