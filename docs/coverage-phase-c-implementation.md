# Coverage Phase C Implementation (2026-03-09)

> Historisches Umsetzungsprotokoll. Maßgeblicher Endstand: `docs/qa-coverage-finalization.md`.

## 1. Kurzueberblick der umgesetzten Phase-C-Massnahmen

Phase C wurde auf die risikostaerksten Restluecken fokussiert umgesetzt:

- Worker-Vertragsgrenze mit dedizierten Contract-Tests abgesichert (`src/workers/searchWorker.test.ts`)
- Fehler-/Resilienzpfade am Worker-Client erweitert (`src/lib/searchClient.test.ts`)
- Selektive E2E-Haertung fuer Deep-Link, Route-Fallback und realen CSV-Exportfluss (`tests/core-flows.spec.ts`)
- CI-Gates fuer Unit-Coverage + getrennte Browser-QA in `quality.yml` eingefuehrt
- Coverage-Messung inkl. Mindestschwellen im Vitest-Setup aktiviert

Es wurden keine grossflaechigen Produktumbauten durchgefuehrt.

## 2. Welche Worker-/Systemgrenzen abgesichert wurden

### Worker-Schnittstelle (`searchWorker`)

- Message-Envelope-Haertung: malformed inbound messages werden ignoriert.
- Positive Vertragsfaelle: `init` und `search` liefern korrekte `response`-Nachrichten.
- Negative Vertragsfaelle:
  - unbekannter Request-Typ liefert definierte Fehlerantwort
  - `get-control` mit nicht aufloesbarer ID liefert fail-closed Fehler
  - `cancel` fuehrt bei laufender Suche zu sauberem Abbruch (`Anfrage wurde abgebrochen.`)
- Graph-Grenze:
  - `get-neighborhood` clamps hops robust auf erlaubte Werte
  - Relationen werden ueber Detail-Chunk-Grenze aufgeloest

### Worker-Client-Grenze (`searchClient`)

- Explizite Worker-Fehlerantwort (`ok: false`) wird deterministisch als Error propagiert.
- Nicht-vertragskonforme Worker-Messages (kein `type: response`) werden ignoriert.
- Synchronous `postMessage`-Fehlerpfad ist abgesichert.

## 3. Welche selektiven E2E-Flows ergaenzt wurden

- Direkter Control-Deep-Link aus realem Suchkontext in `#/control/:id?top=:topGroupId`
- Ungueltige Control-Route (`#/control/%E0%A4%A`) mit robustem Fallback auf Startansicht
- CSV-Export aus realistischer Suchauswahl inkl. Erfolgspfad und UI-Ruecksetzung

Diese E2E-Erweiterungen wurden bewusst klein gehalten und decken benoetigte Systemgrenzen ab, die Unit-/Integrationstests nicht gleichwertig pruefen.

## 4. Welche CI-/Gate-Anpassungen vorgenommen wurden

### Coverage/Gates

- `@vitest/coverage-v8` als Dev-Dependency hinzugefuegt.
- Neues Skript: `test:unit:coverage`.
- `vitest.config.ts` um Coverage-Konfiguration erweitert:
  - Reports: `text`, `text-summary`, `json-summary`, `lcov`
  - Verzeichnis: `coverage/unit`
  - Mindestschwellen:
    - `lines: 30`
    - `functions: 34`
    - `branches: 24`
    - `statements: 30`

### CI-Workflow

- `.github/workflows/quality.yml` in zwei Jobs getrennt:
  - `qa` (schneller PR-Gate):
    - Dependency-Audit
    - Unit-Coverage-Gate
    - Release-Hygiene
    - Upload des Coverage-Artefakts
  - `browser-qa` (schwerer Lauf, nach `qa`):
    - Build
    - Lighthouse + Playwright/Axe via `qa:browser`

### Skriptstruktur

- Neues Skript: `qa:browser`
- `qa` auf `build + unit + hygiene + qa:browser` umgestellt (funktionale Entsprechung erhalten)

## 5. Welche Refactorings durchgefuehrt wurden und warum

- Keine produktiven Architektur-Refactorings.
- Nur testnahe/CI-nahe Anpassungen:
  - Worker-Testharness ueber `self`-Mock fuer echte Message-Grenztests
  - kleine Skriptentkopplung (`qa:browser`) zur sauberen Gate-Trennung

## 6. Welche Risiken weiterhin offen bleiben

- `src/App.tsx` als zentrale Orchestrierung bleibt weiterhin ohne dedizierte domnahe Integrationstests.
- Service-Worker-Laufzeitpfade in `src/main.tsx` sind weiterhin nicht direkt getestet.
- Build-/Sync-Skripte (`scripts/build-catalog.mjs`, `scripts/sync-bsi-catalogs.mjs`) haben weiterhin keine eigenen Integrationstests.

## 7. Welche Themen bewusst nicht umgesetzt wurden

- Keine breite E2E-Ausweitung (nur selektive High-Risk-Flows)
- Keine Browser-Matrix-Erweiterung
- Keine visuellen Regressionstests
- Kein grosser Worker- oder App-Refactor fuer maximale Coverage
- Keine Tests fuer generierte Artefakte um ihrer selbst willen

## 8. Welche Test-/QA-Kommandos ausgefuehrt wurden und mit welchem Ergebnis

- `npm install`
  - erfolgreich (Lockfile aktualisiert)

- `npm run test:unit:raw`
  - erfolgreich
  - 22 Testdateien, 95 Tests, alle gruen

- `npm run test:unit:coverage`
  - erfolgreich
  - Coverage-Schwellen eingehalten
  - Summary:
    - Statements: `42.17%`
    - Branches: `37.31%`
    - Functions: `39.95%`
    - Lines: `42.35%`

- `npm run build`
  - erfolgreich

- `npm run check:release-hygiene`
  - erfolgreich

- `npx start-server-and-test "npm run preview" http://127.0.0.1:4173 "npx playwright test tests/core-flows.spec.ts --config=playwright.a11y.config.ts"`
  - erfolgreich
  - 14/14 Tests bestanden

- `npx start-server-and-test "npm run preview" http://127.0.0.1:4173 "npm run qa:a11y"`
  - erfolgreich
  - 18/18 Tests bestanden

- `npm run qa:browser`
  - erfolgreich (ausserhalb Sandbox ausgefuehrt)
  - Lighthouse + Playwright/Axe bestanden
