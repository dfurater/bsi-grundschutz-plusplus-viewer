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

### Alternative Hosts

- Header-Policy-Dateien: `netlify.toml`, `public/_headers`
- Hinweis zu GitHub Pages: `_headers`/`netlify.toml` werden dort nicht als Header-Policy erzwungen.

## Konfiguration

### Build-/Runtime-Variablen

- `VITE_BASE_PATH`
- `VITE_OPERATOR_NAME`
- `VITE_OPERATOR_ADDRESS_LINE1`
- `VITE_OPERATOR_ADDRESS_LINE2`
- `VITE_OPERATOR_EMAIL`
- `SECURITY_HEADERS_URL`

### Datenkonfiguration

- Quellkataloge: `Kataloge/`
- Standarddatensatz: `anwender` (`public/data/catalog-registry.json`)

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

### Header-Check wird übersprungen

Ursache:
- `SECURITY_HEADERS_URL` nicht gesetzt.

Lösung:
```bash
SECURITY_HEADERS_URL="https://<preview-or-prod-url>" npm run check:headers
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

- Die Datenqualität hängt von den Katalogquellen in `Kataloge/` und deren Strukturkonsistenz ab.
- Auf GitHub Pages werden Security-Header aus `_headers`/`netlify.toml` nicht erzwungen.

## Einstiegsvoraussetzungen für Entwickler

- Passende Node/npm-Version
- React/TypeScript-Grundlagen
- Verständnis der statischen Build-/Deploy-Pipeline

Siehe auch `docs/developer-onboarding.md`.
