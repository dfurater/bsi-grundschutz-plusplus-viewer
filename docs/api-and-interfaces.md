# API und Schnittstellen

Die Anwendung hat keine serverseitige REST-/GraphQL-API. Maßgebliche Schnittstellen sind statische Datenartefakte, Worker-Messages, Hash-Routen und CSV-Export.

## 1) Statische Datenartefakte (`public/data/**`)

Generiert aus `Kataloge/Grundschutz++-catalog.json`:

- `./data/catalog-meta.json`
- `./data/catalog-index.json`
- `./data/details/<TOPGROUP>.json`
- `./data/build-info.json`

Eigenschaften:
- Build-Output, nicht als handgepflegte Quelle behandeln
- wird bei `npm run build:data` / `npm run build` neu erzeugt
- wird per `src/lib/dataSchemas.ts` (Zod) validiert

## 2) Worker-Protokoll (`SearchClient` <-> `searchWorker`)

Requests:
- `init`: `{ indexUrl, detailBasePath }`
- `search`: `SearchQuery`
- `get-control`: `{ id, topGroupId }`
- `get-neighborhood`: `{ id, hops }`
- `cancel`: `{ requestId }`

Antwortformat:
- `{ type: "response", requestId, ok, data?, error? }`

Sicherheits-/Robustheitsaspekte:
- Request-Timeouts im Client
- Abbruch laufender Suchrequests
- Zeit-/Mengenbudgets im Worker
- Validierung externer JSON-Payloads

## 3) Routing-Schnittstelle

Routen:
- `#/`
- `#/search`
- `#/group/:id`
- `#/control/:id`
- `#/about`
- `#/about/license` (Alias: `#/about/source`)
- `#/impressum`
- `#/datenschutz`

`#/search` Query-Parameter:
- Text/Sort: `q`, `sort`
- Facetten: `tg`, `gid`, `sec`, `eff`, `cls`, `mod`, `tgt`, `tag`, `rel`
- Detailkontext: `control`, `top`

## 4) CSV-Export-Schnittstelle

Dateiname:
- `grundschutz-controls_<YYYY-MM-DD>_<count>.csv`

Format:
- UTF-8 BOM
- Delimiter `;`
- Zeilenenden `CRLF`

Spalten:
- `control_id`, `control_title`, `group_path`, `class`, `sec_level`, `effort_level`, `modalverb`, `handlungsworte`, `tags`, `statement`, `guidance`, `params`, `links`, `source_version`, `source_last_modified`

Härtung:
- Neutralisierung spreadsheet-gefährlicher Zellpräfixe
- Export von Links nur bei sicheren `http/https`-URLs

## 5) Rechtliche Konfigurationsschnittstelle

Build-relevante Variablen:
- `VITE_OPERATOR_NAME`
- `VITE_OPERATOR_ADDRESS_LINE1`
- `VITE_OPERATOR_ADDRESS_LINE2`
- `VITE_OPERATOR_EMAIL`

`npm run build` schlägt fehl, wenn diese Werte fehlen/leer sind oder Platzhalter enthalten (`scripts/check-legal-placeholders.mjs`).
