# Security Audit Report — bsi-grundschutz-plusplus-viewer
**Datum:** 2026-03-09
**Scope:** Supply Chain · XSS/Injection · CSV-Export · Service Worker · CI/CD
**Gesamt-Risikoeinschätzung:** MITTEL

## Executive Summary
Die Anwendung zeigt insgesamt eine solide Sicherheitsbasis (Schema-Validierung, URL-Härtung, Worker-Budgets, restriktive Link-Behandlung). Im Audit wurde jedoch ein **HOCH**-Finding im CSV-Export identifiziert: die Formel-Neutralisierung war unvollständig und ließ Umgehungen über führende Whitespaces/Steuerzeichen zu. Dieses Finding wurde im Rahmen dieses Audits direkt im Code behoben und per Unit-Tests abgesichert. Verbleibende Hauptrisiken liegen aktuell im Bereich CI/CD-Härtung (Action-Pinning, minimale Token-Rechte) und fehlender CSP.

## Findings

### FINDING-001 — Unvollständige CSV-Formelneutralisierung (umgehbar)
| Attribut | Wert |
|---|---|
| Schweregrad | HOCH |
| Kategorie | CSV |
| Betroffene Datei(en) | `src/lib/csv.ts`, `src/lib/csv.test.ts` |
| Zeile(n) | L28–L49, L43–L66 |
| CVE (falls zutreffend) | - |

**Beschreibung:**
Die ursprüngliche Neutralisierung prüfte nur direkte Präfixe (`=`, `+`, `-`, `@`) am Stringanfang. Dadurch waren Umgehungen über führende Whitespaces, Steuerzeichen (`\t`, `\r`), Pipe-Prefix (`|`) und Unicode-Varianten möglich. Der Fix wurde umgesetzt: er erkennt jetzt führende Steuerzeichen, trimmt sicherheitsrelevante führende Zeichen, normalisiert per `NFKC` und neutralisiert erweiterte Präfixe. Regressionstests decken die Edge-Cases ab.

**Angriffsszenario:**
Ein manipulierter Katalogeintrag (z. B. über kompromittierte Upstream-Daten) kann Exportfelder so präparieren, dass Tabellenkalkulationen trotz vermeintlicher Härtung Formeln interpretieren. Beim Öffnen der CSV in Excel/LibreOffice kann dies zu ungewollten Berechnungen, externen Verweisen oder DDE-nahen Missbrauchspfaden führen. Der Angriff benötigt Nutzerinteraktion (CSV öffnen), ist aber realistisch im operativen Workflow.

**Empfehlung:**
Fix beibehalten (bereits umgesetzt), Testabdeckung für weitere Spreadsheet-Parser-Varianten fortlaufend erweitern und CSV-Härtung als Security-Gate in CI belassen.

---

### FINDING-002 — Keine Content Security Policy (CSP) im ausgelieferten HTML
| Attribut | Wert |
|---|---|
| Schweregrad | MITTEL |
| Kategorie | XSS |
| Betroffene Datei(en) | `index.html` |
| Zeile(n) | L3–L8 |
| CVE (falls zutreffend) | - |

**Beschreibung:**
Im statischen Einstiegspunkt fehlt eine CSP (`<meta http-equiv="Content-Security-Policy">`) und im Repository ist keine hostseitige Header-Policy für GitHub Pages konfigurierbar hinterlegt. Das ist kein direkter Exploit, reduziert aber die Abwehrtiefe gegen künftige XSS-Fehler erheblich.

**Angriffsszenario:**
Sollte künftig an anderer Stelle ein DOM-XSS eingeführt werden (z. B. durch unsichere Drittkomponente oder Renderpfad), kann fehlende CSP die Ausnutzung deutlich erleichtern. Besonders bei statischem Hosting ohne serverseitige Runtime-Guards fehlt damit ein wichtiger Containment-Mechanismus.

**Empfehlung:**
Eine explizite CSP definieren (mindestens `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`) und auf GitHub-Pages-kompatible Durchsetzung prüfen.

---

### FINDING-003 — GitHub Actions nicht auf Commit-SHA gepinnt
| Attribut | Wert |
|---|---|
| Schweregrad | MITTEL |
| Kategorie | CI/CD |
| Betroffene Datei(en) | `.github/workflows/quality.yml`, `.github/workflows/deploy-pages.yml`, `.github/workflows/daily-bsi-sync.yml` |
| Zeile(n) | quality.yml L26/L29, deploy-pages.yml L23/L26/L32/L50/L63, daily-bsi-sync.yml L33/L38/L85 |
| CVE (falls zutreffend) | - |

**Beschreibung:**
Workflows referenzieren Actions über Major-Tags (`@v4`, `@v6`, `@v7`) statt unveränderlicher Commit-SHAs. Das ist branchenüblich, erhöht aber das Supply-Chain-Risiko gegenüber strikt gepinnten Referenzen.

**Angriffsszenario:**
Bei kompromittierter Action-Pipeline oder missbräuchlich verschobenen Tags könnte in CI/CD unerwarteter Code laufen. In Kombination mit schreibberechtigten Tokens (z. B. Sync-Workflow) kann das Auswirkungen auf Repository-Integrität haben.

**Empfehlung:**
Alle `uses:`-Einträge auf Commit-SHA pinnen und ein regelmäßiges Update-Verfahren etablieren (z. B. Dependabot für Actions mit Review-Pflicht).

---

### FINDING-004 — Fehlender `permissions`-Block im Quality-Workflow
| Attribut | Wert |
|---|---|
| Schweregrad | MITTEL |
| Kategorie | CI/CD |
| Betroffene Datei(en) | `.github/workflows/quality.yml` |
| Zeile(n) | L1–L44 |
| CVE (falls zutreffend) | - |

**Beschreibung:**
Der Workflow `quality.yml` definiert keinen expliziten `permissions`-Block. Damit hängt der effektive Scope vom Repository-Default ab und kann weiter reichen als für reine QA-Jobs erforderlich.

**Angriffsszenario:**
Falls ein Build-/Testschritt oder eine Dependency kompromittiert wird, erhöht ein zu breit berechtigtes `GITHUB_TOKEN` den möglichen Impact (z. B. Schreiboperationen statt reinem Lesen).

**Empfehlung:**
`permissions` explizit minimal setzen (für QA i. d. R. `contents: read` ausreichend).

---

### FINDING-005 — Dev-Dependency Advisory in `tmp` (transitiv via LHCI)
| Attribut | Wert |
|---|---|
| Schweregrad | NIEDRIG |
| Kategorie | Supply Chain |
| Betroffene Datei(en) | `package-lock.json`, `package.json` |
| Zeile(n) | package-lock.json L930–L949, L3291–L3299, L6042–L6050; package.json L27–L38 |
| CVE (falls zutreffend) | GHSA-52f5-9888-hmc6 / CVE-2025-54798 |
| Status | Risk accepted (Dev-only), Stand: 12.03.2026 |

**Beschreibung:**
`npm audit --json` meldet eine Low-Severity-Schwachstelle in `tmp` (`<=0.2.3`), transitiv über `@lhci/cli`/`inquirer`/`external-editor` im QA-Tooling. Produktionsabhängigkeiten (`npm audit --omit=dev`) sind ohne Befund.

**Angriffsszenario:**
Der Pfad betrifft primär Dev-/CI-Kontext. Auf gemeinsam genutzten Runnern kann ein lokaler Symlink-Angriff auf temporäre Dateien theoretisch möglich sein; auf isolierten GitHub-Hosted Runnern ist die praktische Ausnutzbarkeit deutlich reduziert.

**Empfehlung:**
Kurzfristig Risiko als Dev-only akzeptieren und dokumentiert beobachten. Re-Evaluation spaetestens bis 30.06.2026 oder frueher bei einem der folgenden Trigger:
- `@lhci/cli` veroeffentlicht eine Version mit `tmp >= 0.2.4`.
- QA-Tooling wird auf persistenten/self-hosted Runnern ausgefuehrt.
- die betroffene Dependency-Kette wird in produktionsrelevante Pfade verschoben.

---

### FINDING-006 — Service Worker cached Katalogdaten dauerhaft clientseitig
| Attribut | Wert |
|---|---|
| Schweregrad | INFO |
| Kategorie | ServiceWorker |
| Betroffene Datei(en) | `public/sw.js`, `src/main.tsx` |
| Zeile(n) | sw.js L7–L9, L146–L155; main.tsx L23–L52 |
| CVE (falls zutreffend) | - |

**Beschreibung:**
Der Service Worker cached HTML, JSON-Daten und Assets lokal (`Cache Storage`). Das ist funktional beabsichtigt und ohne direkten Sicherheitsfehler implementiert (same-origin, Response-Checks, Versionierung). Es bleibt jedoch ein Betriebsaspekt: Daten verbleiben bis zur Cache-Rotation auf Endgeräten.

**Angriffsszenario:**
Bei geteilten/unsicheren Endgeräten können lokal gecachte Inhalte länger verfügbar bleiben, selbst wenn sie serverseitig bereits ersetzt wurden. Das betrifft primär Datenschutz-/Betriebstransparenz, nicht unmittelbar Codeausführung.

**Empfehlung:**
Datenschutz-/Betriebshinweise beibehalten und optional eine UI-Funktion zum aktiven Cache-Reset ergänzen.

---

## Nicht untersuchte Bereiche
- Reale Response-Header und CSP-Durchsetzung auf produktivem GitHub-Pages-Endpoint (nur Repository-Artefakte geprüft).
- Laufzeitverhalten auf älteren Browsern und spezifischen Spreadsheet-Engines außerhalb der vorhandenen Unit-Tests.
- Organisatorische GitHub-Repository-Einstellungen außerhalb der Workflow-Dateien (Rulesets, Branch Protection im UI).
