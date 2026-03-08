# API und Schnittstellen

## Überblick

- Es gibt keine serverseitige REST-/GraphQL-API.
- Externe Schnittstellen sind statische JSON-Dateien, Browser-Routen, Worker-Nachrichten und CSV-Download.

## 1) Statische Daten-Schnittstellen (`public/data/**`)

Hinweis: Die Dateien unter `public/data/**` sind generierte Build-Artefakte (aus `Kataloge/Grundschutz++-catalog.json`) und nicht versioniert.

### Primäre Build-Artefakte

Dateien:
- `./data/catalog-meta.json`
- `./data/catalog-index.json`
- `./data/details/<TOPGROUP>.json`
- `./data/build-info.json`

Quelle:
- `Kataloge/Grundschutz++-catalog.json` (fertiger BSI-Grundschutz++-Anwenderkatalog)

### Validierung und Fehlerfälle

- JSON-Responses werden mit Byte-Budget, JSON-Parsing und Zod-Schema validiert.
- Bei Verstoß wird der Ladevorgang abgebrochen.

Typische Fehler:
- HTTP-Fehler
- Content-Length/Budget überschritten
- JSON ungültig
- Schema ungültig

## 2) Worker-Schnittstelle (`SearchClient` <-> `searchWorker`)

### Request-Typen

- `init`
  - Payload: `{ indexUrl, detailBasePath }`
  - Antwort: `{ stats, facetOptions }`
- `search`
  - Payload: `SearchQuery`
  - Antwort: `SearchResponse`
- `get-control`
  - Payload: `{ id, topGroupId }`
  - Antwort: `ControlDetail`
- `get-neighborhood`
  - Payload: `{ id, hops }`
  - Antwort: `RelationGraphPayload`
- `cancel`
  - Payload: vorherige `requestId`

### Fehlerfälle

- Worker-Timeouts je Operation (10s-30s je Typ)
- Abgebrochene Requests liefern einen Fehlerpfad
- Unbekannte Request-Typen werden abgelehnt

## 3) Routing-Schnittstelle (Hash Routing)

Routen:
- `#/`
- `#/search`
- `#/group/:id`
- `#/control/:id`
- `#/about`
- `#/about/license` (Legacy-Alias: `#/about/source`)
- `#/impressum`
- `#/datenschutz`

Such-Query-Parameter (`#/search?...`):
- `q`, `sort`
- Facettenparameter: `tg`, `gid`, `sec`, `eff`, `cls`, `mod`, `tgt`, `tag`, `rel`
- optional: `control`, `top`

Routing-Härtung:
- Sanitizing für Suchtext/Filter/Routentoken
- Limits auf Länge und Anzahl

## 4) CSV-Export-Schnittstelle

### Output

Dateiname:
- `grundschutz-controls_<YYYY-MM-DD>_<count>.csv`

Format:
- UTF-8 BOM
- Delimiter `;`
- Zeilenende `CRLF`

Spalten:
- `control_id`, `control_title`, `group_path`, `class`, `sec_level`, `effort_level`, `modalverb`, `handlungsworte`, `tags`, `statement`, `guidance`, `params`, `links`, `source_version`, `source_last_modified`

### Härtung

- Spreadsheet-Formel-Präfixe (`=,+,-,@`) werden neutralisiert.
- Exportiert werden nur `http/https`-Links.

## 5) Security-/Berechtigungsaspekte

- Es gibt keine Authentifizierung/Autorisierung.
- Fokus liegt auf Eingabehärtung, Budgetgrenzen und sicherer URL-Verarbeitung.
