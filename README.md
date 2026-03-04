# Grundschutz++ Katalog-App (Static CSR)

Clientseitige React/Vite-Webanwendung zur Suche und Navigation eines BSI Grundschutz++ OSCAL-Katalogs.

## Features

- Reines CSR, statisch deploybar
- Hash-Routing (`#/search`, `#/control/:id`, `#/group/:id`, `#/about/source`)
- Multi-Dataset-Unterstützung (Anwender, Kernel, Methodik)
- Volltext- und ID-Suche mit Facetten (Web Worker)
- Detailansicht mit Statement/Guidance/Parametern/Relationen
- Relations-Graph-Visualisierung (1/2-Hop, required/related-Filter, Zoom/Pan, klickbare Knoten)
- Provenienz- und Versionsanzeige
- Optionaler lokaler JSON-Upload (ohne Server)
- Offline-Basisunterstützung per Service Worker

## Entwicklung

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Preview-URL: `http://127.0.0.1:4173`

Wichtig: `dist/index.html` nicht direkt per `file://` oeffnen, sondern immer ueber den lokalen Preview-Server (`npm run preview`), da Worker/Fetch sonst fehlschlagen koennen.

Die Build-Pipeline liest die Kataloge aus `Kataloge/`:

- `Grundschutz++-catalog.json` (Anwenderkatalog)
- `BSI-Stand-der-Technik-Kernel-catalog.json`
- `BSI-Methodik-Grundschutz++-catalog.json`
- `Grundschutz++-profile.json` (Beziehungs-/Profilanalyse)

## Qualitätssicherung

```bash
npx playwright install chromium
npm run qa
```

`npm run qa` führt Lighthouse (mit Budgets) und Axe-Tests aus.

Der Build-Step `npm run build:data` erzeugt aus `Grundschutz++-catalog.json` die statischen Datenassets:

- `public/data/catalog-meta.json`
- `public/data/catalog-index.json`
- `public/data/build-info.json`
- `public/data/details/<TOPGROUP>.json`
- `public/data/catalog-registry.json`
- `public/data/profile-links.json`
- `public/data/datasets/<dataset-id>/*`

## Deployment

Das Ergebnis in `dist/` kann auf beliebigem Static Hosting bereitgestellt werden (GitHub Pages, Netlify, Cloudflare Pages, S3 Static Website).
