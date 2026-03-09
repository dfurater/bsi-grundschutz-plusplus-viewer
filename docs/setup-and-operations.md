# Setup und Betrieb

## 1) Voraussetzungen

- Node.js `>=20.19.0`
- npm `>=10`
- `.nvmrc` ist die lokale Referenzversion

## 2) Lokales Setup

```bash
npm install
cp .env.example .env.local
```

Erforderliche Werte in `.env.local`:
- `VITE_OPERATOR_NAME`
- `VITE_OPERATOR_ADDRESS_LINE1`
- `VITE_OPERATOR_ADDRESS_LINE2`
- `VITE_OPERATOR_EMAIL`

Hinweis: Der Produktionsbuild prüft diese Variablen fail-closed.

## 3) Entwicklung

```bash
npm run dev
```

`npm run dev` führt zuerst `npm run build:data` aus und startet dann Vite.

## 4) Build- und Release-Pipeline

```bash
npm run build
```

Ablauf:
1. `clean:release-artifacts`
2. `build:data`
3. `tsc -b`
4. `check-legal-placeholders`
5. `vite build`

Generierte Artefakte:
- `public/data/**`
- `public/sw.js`
- `dist/**`

`public/data/**` und `public/sw.js` sind Build-Output und in `.gitignore` ausgenommen.

## 5) Tests und QA lokal

Relevante Befehle:

```bash
npm run test:unit
npm run test:unit:coverage
npm run check:release-hygiene
npm run qa
```

`npm run qa` umfasst:
- Build
- Unit-Tests (`test:unit:raw`)
- Release-Hygiene
- Browser-QA (`qa:browser` = Lighthouse + Playwright A11y)

## 6) Deployment

### GitHub Pages (`.github/workflows/deploy-pages.yml`)

- Trigger:
  - `workflow_run` nach erfolgreichem `quality` auf `main`
  - `workflow_dispatch`
- setzt `VITE_BASE_PATH=/${repository-name}/`
- baut und deployt `dist/`

### Qualitätsworkflow (`.github/workflows/quality.yml`)

- Trigger: `push` auf `main/master`, `pull_request`, `merge_group`
- Jobs:
  - `qa` (Audit + Unit-Coverage + Release-Hygiene)
  - `browser-qa` (Build + Browser-QA), nachgelagert zu `qa`

### Daily Sync (`.github/workflows/daily-bsi-sync.yml`)

- Trigger: täglich (`23 4 * * *`, UTC) und manuell
- lädt den aktuellen Grundschutz++-Anwenderkatalog aus dem BSI-Upstream
- erstellt/aktualisiert nur bei Änderungen einen PR

## 7) Datenpflege und Update-Pfade

### Manueller Upstream-Sync

```bash
npm run sync:bsi
```

Das Sync-Skript:
- resolved Upstream-Ref auf Commit-SHA
- lädt den Anwenderkatalog mit Retry/Backoff
- validiert Struktur/Semantik (inkl. Drift-/Regressionswarnungen)
- schreibt bei Änderung nach `Kataloge/Grundschutz++-catalog.json`

### Daten neu erzeugen

```bash
npm run build:data
```

Erwartbar bei:
- Änderungen an `Kataloge/Grundschutz++-catalog.json`
- Änderungen an `src/lib/normalize-core.js`
- Änderungen an `scripts/build-catalog.mjs` oder `scripts/sw.template.js`

## 8) Betriebshinweise

- Service Worker ist auf localhost deaktiviert/deregistriert, in Production aktiv.
- GitHub Pages kann Header-Policies nicht vollständig repository-lokal abbilden.
- Es gibt keine integrierte Runtime-Observability/Alerting-Pipeline in diesem Repo.

## 9) Troubleshooting

### Build bricht mit Legal-Fehler ab

Ursache:
- fehlende/leere Platzhalterwerte in `VITE_OPERATOR_*`

Lösung:
- `.env.local` bzw. CI-Secrets korrigieren

### Suche lädt keine Daten

Ursache:
- veraltete/fehlende generierte Artefakte

Lösung:
```bash
npm run build:data
```
