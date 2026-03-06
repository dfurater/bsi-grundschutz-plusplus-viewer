# Fachliche Übersicht

## Fachliche Zielsetzung

Die Anwendung stellt Grundschutz++-Katalogdaten als durchsuchbare Oberfläche bereit, inklusive Navigation über Gruppen, Controls und Relationen.

## Haupt-Use-Cases

### UC-1: Katalogüberblick und Bereichsnavigation

- Startseite mit Top-Gruppen, Kennzahlen und Datensatzauswahl.

### UC-2: Suche nach Controls

- Suche über ID und Volltext.
- Debounce, Enter-Submit, Ergebnispaginierung und Sortierung.

### UC-3: Filtern und Facettieren

- Filter auf Top-Gruppe, Gruppe, Sicherheitsniveau, Aufwand, Klasse, Modalverb, Zielobjekte, Tags und Relationstyp.

### UC-4: Detailanalyse eines Controls

- Anzeige von Statement, Guidance, Parametern, Eigenschaften, Breadcrumbs und Relationen.

### UC-5: Relationsanalyse

- Graphansicht mit 1-/2-Hop und Typfilter (`all`, `required`, `related`).

### UC-6: Datensatzwechsel

- Wechsel zwischen `anwender`, `kernel`, `methodik`.
- Anzeige von Version, Build-Informationen, Hash und Profilbezügen.

### UC-7: Export und lokaler Import

- CSV-Export ausgewählter Controls.
- Lokaler JSON-Upload mit Validierung.

## Fachliche Domänenobjekte

- Katalog (Metadaten, BuildInfo, SourceReferences)
- Gruppe (hierarchisch, Top-Gruppe/Subgruppe)
- Control (ID, Titel, Klasse, Statement, Guidance, Parameter, Eigenschaften)
- Relation (`required`/`related`)
- Facetten (z. B. Sicherheitsniveau, Aufwand, Tags)
- Datensatzdescriptor (ID, Label, Version, Hash, Kennzahlen)
- Profilanalyse (Imports, Set-Parameters, Mengenabgleich)

## Zentrale Geschäftslogik

- Textnormalisierung für Suche (inkl. deutscher Sonderzeichen und Tokenisierung).
- Relevanzscoring mit Gewichtung für ID/Titel/Statement/Guidance/Tags/Zielobjekte.
- Aufwandsortierung mit Spezialbehandlung fehlender Werte.
- Auflösen von OSCAL-Parameterplatzhaltern beim CSV-Export.
- Blockieren unsicherer URL-Schemes für Anzeige und Export.

## Funktionale Grenzen

- Keine Schreib-/Mutationsoperationen gegen externe Systeme.
- Kein User-/Rechtemodell.
- Kein persistenter Upload-Speicher; Upload gilt bis zum Seitenreload.
- Kein Workflow-Engine-/Freigabeprozess in der Anwendung.
