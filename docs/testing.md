# Testing und QA

## Ziel

Die Qualitätssicherung deckt drei Ebenen ab:
- modulnahe Unit-/Integrationstests
- browsernahe Smoke-/A11y-Prüfungen
- Build-/Release-Hygiene und Dependency-Audit

## 1) Unit- und modulnahe Tests (Vitest)

- Konfiguration: `vitest.config.ts`
- Testquellen: `src/**/*.test.ts`, `src/**/*.test.tsx`
- Schwerpunkt:
  - Datenvalidierung und Sicherheitslogik (`dataSchemas`, `fetchJsonSafe`, `searchSafety`, `csv`, `urlSafety`)
  - Routing-/Worker-Grenzen (`routing`, `searchClient`, `searchWorker`)
  - zentrale UI-Zustandspfade (`App`, Kernkomponenten)
  - A11y- und Interaktions-Hooks/-Komponenten (`useFocusTrap`, `SearchOverlay`, `FilterSheet`)
  - Single-Catalog-Regressionen in Kernkomponenten (u. a. kein Datensatz-Auswahl-UI im Header)

### Coverage-Gate

`npm run test:unit:coverage` nutzt `v8`-Coverage mit globalen Mindestschwellen:
- `lines: 35`
- `functions: 39`
- `branches: 29`
- `statements: 35`

## 2) Browser-QA

- Playwright-Konfiguration: `playwright.a11y.config.ts`
- E2E-Kernflüsse: `tests/core-flows.spec.ts`
- A11y-Smoketests: `tests/a11y.spec.ts` (Playwright + Axe)
- Lighthouse-Konfiguration: `lighthouserc.json`
- Die Breakpoint-Checks verifizieren explizit, dass kein Inline-Datensatzselector gerendert wird.
- Weitere Kernflüsse prüfen u. a. Search-Overlay (Enter/Clear/Escape), Fokus-Restore und Theme-Toggle.

## 3) Release-Hygiene

- Skript: `scripts/check-release-hygiene.mjs`
- prüft verbotene Release-Artefakte in `dist/` (z. B. `.DS_Store`, Source Maps)

## 4) Sicherheitsrelevante QA-Checks

- `npm run audit:prod` (blockiert bei High/Critical in Prod-Dependencies)
- `npm run audit:dev` (Policy: Critical blockierend, restliche Findings als Hinweis)

## 5) CI-Abbildung

Workflow: `.github/workflows/quality.yml`

- Job `qa`:
  - `npm run audit:prod && npm run audit:dev`
  - `npm run test:unit:coverage`
  - `npm run check:release-hygiene`
- Job `browser-qa` (nach `qa`):
  - Build + `npm run qa:browser`

## 6) Empfohlene lokale Check-Stufen

Schneller Mindestcheck:
```bash
npm run test:unit
npm run check:release-hygiene
```

Merge-nahe Prüfung:
```bash
npm run qa
```

## 7) Bekannte Grenzen

- kein dedizierter Last-/Soak-Test für Worker unter extremer Last
- kein automatisierter Test realer Response-Header des Produktivhostings
- TypeScript ist nicht in `strict`-Mode
- kein separater Pattern-Scanner, der beliebige `upload`-Tokens im Quelltext blockiert
