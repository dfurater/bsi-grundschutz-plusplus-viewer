# Security Review

## Scope und Einordnung

Dieses Dokument beschreibt die im Repository sichtbar umgesetzten Sicherheitsmechanismen und bekannten Restrisiken.

Es ist kein externes Penetrationstest-Zertifikat und kein Compliance-Nachweis.

## 1) Umgesetzte Sicherheitsmechanismen

### Daten- und Eingabevalidierung

- Zod-Schemas für Meta/Index/Detail-Daten (`src/lib/dataSchemas.ts`)
- Fail-closed bei Schema-/Budgetverstößen
- Größen-/Zeit-/Mengenbudgets (`src/lib/securityBudgets.ts`)

### Scope-bedingte Reduktion der Angriffsfläche

- Single-Catalog-Modell mit festen Build-/Runtime-Pfaden statt freier Dataset-Auswahl.
- Kein manueller JSON-Upload in der Runtime (kein Upload-UI, kein Upload-State, kein Upload-Worker-Protokoll).
- Legacy-Mehrkatalog-Artefakte werden im Build aktiv bereinigt.

### Such- und Routing-Härtung

- Suchtext- und Filter-Sanitizing (`src/lib/searchSafety.ts`)
- robustes URL-Decoding und Routentoken-Sanitizing (`src/lib/routing.ts`, `src/lib/safeDecode.ts`)

### URL-/Link-Sicherheit

- externe Links nur mit sicheren Schemes (`http/https`)
- Blockieren unsicherer URL-Varianten (`src/lib/urlSafety.ts`)

### CSV-Export-Härtung

- Neutralisierung spreadsheet-gefährlicher Zellinhalte
- Linkfilterung auf sichere URLs (`src/lib/csv.ts`, `src/lib/controlExport.ts`)
- Regressions-Guardrails in `src/lib/csv.test.ts` und `src/lib/controlExport.test.ts` decken führende Whitespaces, Control-Chars, Unicode-Normalisierung, Formelpräfixe und Export-Linkfilter explizit ab (konsistent zum Doku-Sync aus EH-04/#48).

### Service-Worker-Betrieb

- localhost: Deregistrierung statt Registrierung
- Production: kontrollierte Registrierung + Update-Handling (`src/main.tsx`)

### CI-/Supply-Chain-Kontrollen

- Audit-Checks in `quality.yml` (`audit:prod`, `audit:dev`)
- Dependabot-Konfiguration für npm und Actions vorhanden

## 2) Rechtliche/konfigurationsbezogene Schutzmechanismen

- verpflichtende Betreiberdaten per `VITE_OPERATOR_*`
- Build-Gate gegen fehlende/platzhalterhafte Werte (`scripts/check-legal-placeholders.mjs`)

## 3) Bekannte Restrisiken und Grenzen

- keine Authentifizierung/Autorisierung (bewusste Architekturgrenze)
- GitHub Pages erlaubt keine vollständige, repository-lokale Headersteuerung
- keine dedizierte SAST-/Lint-Sicherheits-Pipeline in `package.json`
- TypeScript läuft mit `strict: false`
- bei künftiger Wiedereinführung von Upload-Funktionen entstünde zusätzlicher Validierungs- und Missbrauchsaufwand

## 4) Operative Empfehlungen

- Hosting-seitig explizite Security-Header/CSP prüfen und dokumentieren
- Secret-Scanning als zusätzlichen CI-Baustein ergänzen
- TypeScript-Strict-Migration schrittweise planen
- Sicherheitsrelevante Änderungen an Worker/Parsing/Export besonders streng reviewen
