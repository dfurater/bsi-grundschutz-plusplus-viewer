# Setup und Betrieb

## Lokales Setup

### Voraussetzungen

- Node.js `>= 20.19.0` (`package.json`, `.nvmrc`)
- npm `>= 10`

### Installation

```bash
npm install
cp .env.example .env.local
```

`.env.local` enthält:
- `VITE_OPERATOR_NAME`
- `VITE_OPERATOR_ADDRESS_LINE1`
- `VITE_OPERATOR_ADDRESS_LINE2`
- `VITE_OPERATOR_EMAIL`

### Entwicklungsstart

```bash
npm run dev
```

`npm run dev` führt zuerst `build:data` aus und startet anschließend den Vite-Dev-Server.

## Build / Run / Test

### Produktionsbuild

```bash
npm run build
```

Buildkette:
1. `clean:release-artifacts`
2. `build:data`
3. `tsc -b`
4. `check-legal-placeholders`
5. `vite build`

### Lokale Produktionsvorschau

```bash
npm run preview
```

Läuft auf `http://127.0.0.1:4173` mit `--strictPort`.

### Unit-Tests

```bash
npm run test:unit
```

Vitest testet `src/**/*.test.ts(x)` im Node-Environment.
`npm run test:unit` führt intern zuerst `npm run build` aus, damit die generierten Artefakte unter `public/data/**` und `public/sw.js` verfügbar sind.

### Erweiterte QA

```bash
npm run qa
```

Enthält Build, Unit-Tests, Release-Hygiene, Lighthouse und Playwright-A11y.

## Benötigte Services

- Für lokale Kernfunktion sind keine externen Laufzeitservices erforderlich.
- Für `npm audit` und CI-Installationsschritte wird Netzwerkzugriff auf npm/GitHub benötigt.

## Deployment-Grundlagen

### GitHub Pages

- Workflow: `.github/workflows/deploy-pages.yml`
- Trigger: Push auf `main` und `workflow_dispatch`
- Build-Artefakt: `dist/`
- Secrets: `VITE_OPERATOR_*`

### Daily BSI Sync + Auto-PR

- Workflow: `.github/workflows/daily-bsi-sync.yml`
- Trigger: `schedule` (täglich) und `workflow_dispatch`
- Quelle: `BSI-Bund/Stand-der-Technik-Bibliothek` (`main`, optionaler Override via `upstream_ref`)
- Ablauf:
  1. `npm run sync:bsi` lädt den Grundschutz++-Anwenderkatalog gegen einen aufgelösten Commit-Snapshot (`BSI_REF -> Commit SHA`), mit Retry/Backoff.
  2. Der Sync validiert Struktur/Semantik und promoted Änderungen atomar nach `Kataloge/`.
  3. Nur bei echten Dateidifferenzen in `Kataloge/` folgen `npm ci`, `npm run build`, `npm run test:unit:raw`, `npm run check:release-hygiene`.
  4. Anschließend erstellt/aktualisiert `peter-evans/create-pull-request` einen PR inklusive Sync-Report.
  5. Ohne Katalogdifferenzen endet der Job ohne PR.

### Main-Branch-Governance (GitHub-Einstellungen)

Diese Einstellungen werden in GitHub manuell im Repository gesetzt (z. B. Ruleset für `main`):

- Require a pull request before merging
- Require status checks to pass before merging
- Require merge queue
- Disallow force pushes
- Disallow deletions
- Optional: Require linear history

Empfohlene Merge-Methode:
- Squash merge aktivieren und als Standard verwenden

Empfohlener Required Status Check:
- Job `qa` aus Workflow `.github/workflows/quality.yml` (in der GitHub-UI typischerweise als `quality / qa` sichtbar)

Merge-Queue-Kompatibilität:
- Der Qualitätsworkflow triggert auf `pull_request` und `merge_group`.
- `deploy-pages.yml` ist absichtlich kein Required PR-Check, da Deployment erst nach Merge auf `main` läuft.
- `daily-bsi-sync.yml` ist eine Automationspipeline und ebenfalls kein Required PR-Check für Feature-PRs.

Hinweis zu Auto-merge:
- Auto-merge nur aktivieren, wenn es im Teamprozess nicht redundant zur Merge Queue ist.

### Hosting

- Produktiv-Deployment ist auf GitHub Pages ausgerichtet.
- Es gibt keine hostspezifischen Header-Policy-Dateien im Repository.

## Konfiguration

### Build-/Runtime-Variablen

- `VITE_BASE_PATH`
- `VITE_OPERATOR_NAME`
- `VITE_OPERATOR_ADDRESS_LINE1`
- `VITE_OPERATOR_ADDRESS_LINE2`
- `VITE_OPERATOR_EMAIL`

### Datenkonfiguration

- Primärquelle: `Kataloge/Grundschutz++-catalog.json`
- `public/data/**` und `public/sw.js` sind generiertes Build-Output (nicht versioniert)
- manueller Upstream-Sync: `npm run sync:bsi`

## Troubleshooting

### Build bricht mit Legal-Placeholder-Fehler ab

Ursache:
- `VITE_OPERATOR_*` fehlt, ist leer oder enthält Platzhalter.

Lösung:
- `.env.local` prüfen und reale Werte setzen.

### Such-/Detaildaten fehlen

Ursache:
- `public/data/**` ist nicht aktuell.

Lösung:
```bash
npm run build:data
```

## Betriebsaspekte

- Service Worker wird auf localhost deregistriert.
- Service Worker wird in Production auf Nicht-Localhost registriert.
- Caching im SW:
  - Navigation/Data: Network First mit Fallback
  - Assets: Stale-While-Revalidate

## Monitoring / Logging

- Es gibt kein dediziertes Application-Monitoring im Repository.
- Fehlerzustände werden in der UI angezeigt.
- CI enthält Qualitätskontrollen (Tests, Lighthouse, A11y, Dependency-Audit).

## Betriebsrisiken

- Die Datenqualität hängt von der Strukturkonsistenz des Grundschutz++-Anwenderkatalogs in `Kataloge/Grundschutz++-catalog.json` ab.
- GitHub Pages bietet nur eingeschränkte, nicht repository-lokale Steuerung von Response-Headern.

## Einstiegsvoraussetzungen für Entwickler

- Passende Node/npm-Version
- React/TypeScript-Grundlagen
- Verständnis der statischen Build-/Deploy-Pipeline

Siehe auch `docs/developer-onboarding.md`.
