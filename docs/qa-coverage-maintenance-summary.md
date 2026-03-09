# QA/Coverage Maintenance Summary

## 1. Was ist der aktuelle QA-/Coverage-Endstand?

- Unit-Coverage ist aktiv und als CI-Gate etabliert.
- Schneller Pflicht-Gate (`quality / qa`) ist von schwerer Browser-QA getrennt.
- Maßgebliche Endstandsreferenz: `docs/qa-coverage-finalization.md`.

## 2. Welche Konfiguration ist maßgeblich?

- Unit-/Coverage-Konfiguration: `vitest.config.ts`
- CI-Gates: `.github/workflows/quality.yml`
- Laufende Teststrategie: `docs/testing.md`
- Endstandsentscheidung: `docs/qa-coverage-finalization.md`

## 3. Welche Checks sind verpflichtend?

Verpflichtender schneller CI-Gate (`qa`):

1. `npm run audit:prod && npm run audit:dev`
2. `npm run test:unit:coverage`
3. `npm run check:release-hygiene`

Nachgelagerter schwerer QA-Gate (`browser-qa`):

1. `npm run build`
2. `npm run qa:browser` (Lighthouse + Playwright/Axe)

## 4. Welche Bereiche bleiben bewusst außerhalb der Coverage-Ziele?

- Generierte Artefakte (`public/data/**`, `public/sw.js`, `dist/**`)
- Test-/Report-Ausgaben (`coverage/**`, `.lighthouseci/**`, `test-results/**`, `playwright-report/**`)
- Nicht-Quellcodebereiche (`docs/**`, `.github/**`, `Kataloge/**`)
- Testdateien und Typ-Deklarationen (`*.test.*`, `*.d.ts`, `src/types.ts`)

## 5. Welche bekannten Restlücken sind akzeptiert?

1. Begrenzte direkte Tests für `src/App.tsx` und `src/main.tsx`.
2. Kein dedizierter Worker-Last-/Soak-Test.
3. Kein automatisierter Produktiv-Header-Testpfad in der Repository-CI.
4. TypeScript weiterhin `strict: false`.
