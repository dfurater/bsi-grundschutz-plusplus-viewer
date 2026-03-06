# Offene Punkte und Gaps

## Architektur-/Dokumentationsgaps

1. Es gibt kein formelles ADR-Repository mit Datums-/Owner-Tracking; aktuell liegt eine ADR-Zusammenfassung vor.
2. Es gibt kein eigenes Threat-Model-Dokument.

## Sicherheits-/Governance-Gaps

1. Es gibt keine Authentifizierung/Autorisierung.
2. Security-Header werden auf GitHub Pages nicht über `_headers`/`netlify.toml` erzwungen.
3. Es gibt keine SAST-/Lint-Sicherheitsregeln im Build.

## Qualitäts-/Testgaps

1. Es gibt keine Coverage-Metriken.
2. Es gibt keinen dedizierten Last-/Soak-Test für Worker und große Uploads.
3. Der Header-Check ist optional und abhängig von `SECURITY_HEADERS_URL`.

## Betriebsgaps

1. Es gibt keine zentrale Observability-Integration (Metriken/Logs/Alerting) im Repository.
2. Es gibt kein dokumentiertes Incident-/Rollback-Runbook.

## Wartungsauffälligkeiten

1. `src/components/SearchBar.tsx` ist vorhanden, aber nicht im aktuellen App-Flow eingebunden.
2. TypeScript läuft mit `strict: false`.
3. `build:data` erzeugt Änderungen in generierten Datenartefakten unter `public/data/**`.

## Empfohlene nächste Schritte

### Must-have

1. Security-Header-Strategie für produktives Hosting festlegen.
2. Secret-/Env-Hygiene absichern und CI um Secret-Scanning ergänzen.
3. Coverage-Messung und Mindestschwellen einführen.

### Should-have

1. Linting/SAST-Pipeline ergänzen.
2. Worker-Integrationstests für Timeout/Cancel/Budgetgrenzen erweitern.
3. Betriebsrunbook für Incident und Rollback ergänzen.

### Nice-to-have

1. Threat-Model-Dokument ergänzen.
2. ADR-Prozess mit Änderungsverlauf formalisieren.
