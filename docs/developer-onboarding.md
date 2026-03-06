# Developer Onboarding

## Schnellstart (20 Minuten)

1. Voraussetzungen prüfen:
```bash
node -v
npm -v
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Lokale Konfiguration anlegen:
```bash
cp .env.example .env.local
```

4. Dev-Server starten:
```bash
npm run dev
```

5. Unit-Tests ausführen:
```bash
npm run test:unit
```

## Repository-Struktur verstehen

- `src/App.tsx`: App-Orchestrierung, Routing, Such-/Detail-/Export-Flow
- `src/workers/searchWorker.ts`: Such-Engine und Daten-Ingestion im Worker
- `src/lib/normalize-core.js`: OSCAL -> internes Datenmodell
- `scripts/build-catalog.mjs`: Build-Datenpipeline
- `scripts/sync-bsi-catalogs.mjs`: Upstream-Sync der BSI-Katalogdateien
- `public/data/**`: generierte Such-/Metadaten
- `tests/`: Playwright E2E/A11y
- `.github/workflows/`: CI/CD

## Häufige Befehle

```bash
npm run dev
npm run sync:bsi
npm run build:data
npm run build
npm run preview
npm run test:unit
npm run check:release-hygiene
npm run qa
```

## Typischer Entwicklungsworkflow

1. Branch anlegen.
2. Änderung im Code + ggf. in `scripts/` umsetzen.
3. Bei Datenstrukturänderungen: `npm run build:data`.
4. Tests lokal: mindestens `npm run test:unit`.
5. Vor Merge: `npm run qa`.
6. Doku aktualisieren (`README.md` und `docs/*`) wenn Verhalten/Setup betroffen ist.

## Fallstricke

1. `npm run dev` erzeugt Daten neu (`build:data`) und kann dadurch `public/data/*` ändern.
2. Build bricht ab, wenn `VITE_OPERATOR_*` fehlt oder Platzhalter enthält.
3. `vite preview` verhält sich bezüglich Security-Headern anders als produktives Hosting.
4. Service Worker ist lokal deaktiviert (localhost), in Production aktiv.
5. Hash-Routing ist bewusst gewählt; History-Routing-Annahmen passen hier nicht.

## Qualitätscheckliste vor PR

1. `npm run test:unit` ist grün.
2. `npm run build` ist grün.
3. `npm run check:release-hygiene` ist grün.
4. Keine unbeabsichtigten Änderungen in generierten Datenartefakten (oder sauber begründet).
5. Dokumentation bei funktionalen/operativen Änderungen angepasst.

## Empfohlene Einarbeitungsreihenfolge

1. `README.md`
2. `docs/architecture.md`
3. `docs/setup-and-operations.md`
4. `src/App.tsx`
5. `src/workers/searchWorker.ts`
6. `scripts/build-catalog.mjs`
7. `docs/security-review.md`, `docs/testing.md`
