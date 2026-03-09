# Coverage Phase A Implementation (2026-03-09)

> Historisches Umsetzungsprotokoll (Snapshot vor Phase-B/Phase-C-Erweiterungen).
> Maßgeblicher Endstand: `docs/qa-coverage-finalization.md`.

## 1. Kurzueberblick der umgesetzten Phase-A-Massnahmen

Auf Basis der vorhandenen Analyse (`docs/qa-coverage-gap-analysis.md`) wurden die priorisierten, schnell umsetzbaren Unit-Tests fuer kritische pure Logik und fail-closed Fehlerpfade umgesetzt. Fokus war auf:

- Input-Haertung und Budgetgrenzen
- Textnormalisierung/Snippet-Verhalten fuer Suche
- Validierungs- und Parsing-Fehlersemantik
- sichere JSON-Fetch-Pfade mit Schema-Validierung
- first-pass Fixture-Absicherung fuer Katalognormalisierung

Keine produktive Fachlogik wurde geaendert.

## 2. Welche Dateien/Module getestet wurden

- `src/lib/searchSafety.ts` -> `src/lib/searchSafety.test.ts`
- `src/lib/text.ts` -> `src/lib/text.test.ts`
- `src/lib/validation.ts` -> `src/lib/validation.test.ts`
- `src/lib/fetchJsonSafe.ts` -> `src/lib/fetchJsonSafe.test.ts`
- `src/lib/normalize-core.js` -> `src/lib/normalize-core.test.ts`
- `src/legal/placeholders.ts` -> `src/legal/placeholders.test.ts`

## 3. Durchgefuehrte Refactorings und warum

- Keine produktiven Refactorings notwendig.
- Es wurde ausschliesslich Testcode hinzugefuegt.

## 4. Welche Testfaelle hinzugefuegt wurden

### `searchSafety`

- Nicht-String-Input wird fail-closed zu leerem Suchtext.
- Steuerzeichen-Entfernung, Trim und Zeichenlimit fuer Query.
- Filterwert-Sanitizing: Leereintraege verwerfen, Einzellimit, Gesamtlimit.
- Tokenlimit wird strikt angewendet.

### `text`

- Umlaute/Eszett/Akzent-Normalisierung.
- Tokenisierung mit Ausschluss sehr kurzer Tokens.
- Entfernung von Mustache-Inserts.
- Snippet-Verhalten:
  - leere Quelle nach Cleanup
  - ohne Query-Tokens
  - mit Treffer im Text (Prefix/Suffix-Ellipsen)
  - ohne Treffer (Fallback auf Textanfang)

### `validation`

- Erfolgreiche Validierung mit Rueckgabe geparster Daten.
- Fehlermeldungen mit Kontext und Pfad (`items[0].id`).
- Zusammenfassung vieler Issues mit Suffix `(+N weitere)`.
- JSON-Parsefehler mit Antwort-Snippet.
- Byte-Budget (inkl. UTF-8 Mehrbytezeichen).

### `fetchJsonSafe`

- Erfolgsfall mit validierter JSON-Antwort.
- HTTP-Fehlerpfad (`!response.ok`).
- Content-Length-Fehlerpfad vor Body-Parsing.
- JSON-Parsefehler.
- Schema-Validierungsfehler.
- Byte-Budget-Pruefung auch ohne `content-length`.

### `normalize-core`

- Guard-Fehler bei ungueltiger OSCAL-Struktur (`catalog.groups fehlt`).
- Fixture-basierter End-to-End-Normalisierungsdurchlauf fuer:
  - Metadaten inkl. Publisher-Aufloesung
  - Source-Reference-Aufloesung aus `back-matter`
  - Gruppenbaum
  - Controls inkl. Tags/Modalverben/Target-Objects
  - eingehende/ausgehende Relationen
  - aggregierte Statistiken

### `legal/placeholders`

- Placeholder-Erkennung (`{{...}}`) true/false-Pfad.

## 5. Welche Risiken bewusst noch offen bleiben

Hinweis: Die folgenden Punkte beziehen sich auf den Stand direkt nach Phase A; mehrere davon wurden in späteren Phasen adressiert.

- Worker-Protokoll und Suchkern in `src/workers/searchWorker.ts` bleiben weiterhin ohne dedizierte Unit-/Integrationstests.
- `src/lib/searchClient.ts` Fehler-/Timeout-Lifecycle bleibt offen.
- `src/App.tsx` Orchestrierungspfad (Hash/State/Flow) bleibt offen.
- Coverage-Messung selbst ist weiterhin nicht aktiviert (fehlende `@vitest/coverage-v8` Dependency laut Analyse).

## 6. Naechste Kandidaten fuer Phase B

- `src/lib/searchClient.ts`: Timeout/Cancel/messageerror/Pending-Lifecycle.
- `src/App.tsx`: Hash-State-Sync, Boot-Error-Pfade, CSV-Flow-Fehlerpfade.
- `src/hooks/useFocusTrap.ts`: Tab-Zyklus, Shift+Tab, Fokus-Restore.
- `src/components/ResultList.tsx` und `src/components/GroupPage.tsx`: Pagination/Selection/Empty-State.

## 7. Qualitative Einordnung der verbesserten Prueftiefe

- Die Suite deckt jetzt mehrere fachlich kritische und deterministische Kernpfade ab, die zuvor nur indirekt oder gar nicht geprueft waren.
- Besonders bei Input-Sanitizing, Validierung, Fehlersemantik und Katalognormalisierung wurden Branches mit realem Regressionsnutzen geschlossen.
- Es wurden keine kosmetischen Render-Tests ergaenzt; der Zugewinn liegt in inhaltlicher Prueftiefe, nicht in oberflaechlicher Coverage-Erhoehung.

## 8. Nachgelagerter Update-Hinweis

Dieser Phase-A-Bericht ist ein früher Snapshot. Der aktuelle Endstand ist deutlich weiter und in folgenden Dokumenten beschrieben:

- `docs/qa-coverage-finalization.md`
- `docs/coverage-phase-b-implementation.md`
