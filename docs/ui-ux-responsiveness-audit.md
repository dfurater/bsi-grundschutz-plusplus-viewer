# UI/UX Responsiveness Audit — Grundschutz++ Katalog-App

Datum: 2026-03-13  
Rolle: Senior UX/UI Designer + Frontend Engineer (heuristische + technische Prüfung)

## 1) Executive Summary

Die Anwendung ist **grundsätzlich responsiv** und zeigt in den geprüften Viewports kein globales horizontales Overflow. Das Layout skaliert konsistent zwischen Desktop, Tablet und Mobile, insbesondere durch die vorhandenen Breakpoints (`1240px`, `1023px`, `767px`) und den Wechsel von 3‑Spalten auf 1‑Spalten-Layouts im Suchbereich.

Die größten Schwächen liegen weniger im „harten“ CSS-Overflow, sondern in der **mobilen Bedienqualität**:
- mehrere **Touch-Targets <44px**,
- geringe mobile Auffindbarkeit/Scannability einiger Actions,
- Footer-Navigation auf kleinen Screens mit horizontal scrollender Linkzeile,
- potenziell hohe visuelle Dichte im Search-Flow auf kleinen Höhen (z. B. 375x667).

**Kurzfazit:** technisch stabil responsiv, aber mit spürbaren UX-Reibungen auf Mobile (v. a. Interaktion + Informationshierarchie).

---

## 2) Major UX Problems

1. **Zu kleine Touch-Targets in interaktiven UI-Elementen** (u. a. Clear-Button in Suchfeld).  
2. **Footer-Linkzeile auf Mobile mit horizontalem Scrolling / abgeschnittener Wahrnehmung**.  
3. **Hohe UI-Dichte im Search-Kontext auf kleinen Höhen** → reduzierte Ergebnis- und CTA-Sichtbarkeit.  
4. **Icon-only/kompakte Actions auf Mobile reduzieren Erkennbarkeit** (insb. ohne explizite Textlabels).  
5. **Performance-UX formal nicht vollständig verifiziert** (Lighthouse nicht lauffähig im Environment wegen fehlender Chrome-Installation).

---

## 3) Detailed Findings

### Finding A — Touch-Target-Unterschreitungen
- **Seite:** Suche / globale Controls
- **Bildschirmgröße:** besonders relevant auf 390x844, 375x667, 360x640
- **Problem:** Mehrere bedienbare Elemente liegen unter 44x44 px (programmatisch gemessen).
- **Screenshot/Beleg:** Mobile Search (375x667) zeigte mehrere kleine Targets (`touchSmall: 8` im DOM-Check).
- **Ursache:** Einzelne Controls sind mit kleineren Mindestgrößen definiert (z. B. `min-width/min-height: 36px` beim Clear-Button).
- **UX Impact:** Erhöhte Fehl-Taps, geringere Bedienbarkeit mit Daumen, schlechtere a11y auf Touch-Geräten.
- **Severity:** **High**
- **Empfehlung:**
  - globales Touch-Target-Minimum 44x44 konsequent für alle interaktiven Elemente,
  - Trefferfläche per zusätzlichem Padding/Hit-Area vergrößern,
  - Regressionstest für Target-Größen im Browser-QA ergänzen.

### Finding B — Footer-Linkzeile mobil schwer konsumierbar
- **Seite:** Footer (global)
- **Bildschirmgröße:** 390x844, 375x667, 360x640
- **Problem:** Footer-Links sind in einer horizontal scrollbaren, nicht umbrechenden Zeile organisiert; auf kleinen Screens wird die Linkliste nur teilweise sichtbar.
- **Screenshot/Beleg:** Mobile Home (390x844) zeigt visuell abgeschnittene/verkürzte Linkdarstellung im Footer.
- **Ursache:** `flex-wrap: nowrap`, `white-space: nowrap`, `overflow-x: auto` bei sehr begrenzter Breite.
- **UX Impact:** Wichtige Legal/Info-Links sind weniger auffindbar, v. a. für Erstnutzer.
- **Severity:** **Medium**
- **Empfehlung:**
  - auf Mobile auf Wrap/2 Zeilen umstellen,
  - alternativ „Mehr“-Pattern für sekundäre Footer-Links,
  - visuelle Priorisierung: Impressum/Datenschutz immer direkt sichtbar.

### Finding C — Search-UI-Dichte auf kleinen Höhen
- **Seite:** Suche
- **Bildschirmgröße:** 375x667, 360x640
- **Problem:** Durch Header + Filter/Result-Controls bleibt wenig Above-the-fold-Raum für Ergebnisse und primäre Aktionen.
- **Screenshot/Beleg:** Mobile Search Query (375x667) zeigt hohe Verdichtung bei gleichzeitig knappem vertikalem Raum.
- **Ursache:** Mehrere steuerelementreiche Bereiche konkurrieren im oberen Viewport-Segment.
- **UX Impact:** Höhere kognitive Last, geringere Scanbarkeit, langsamere Task Completion.
- **Severity:** **Medium**
- **Empfehlung:**
  - mobile-first Priorisierung der obersten 1–2 Kernaktionen,
  - progressive disclosure für seltene Filter,
  - kompaktere Header-Höhen + bessere visuelle Gruppierung.

### Finding D — Mobile Informationshierarchie: Action-Auffindbarkeit
- **Seite:** Header / Sucheinstieg
- **Bildschirmgröße:** 375x667, 360x640
- **Problem:** Auf kleineren Screens werden zentrale Aktionen stärker ikonisiert/komprimiert; semantische Klarheit sinkt gegenüber Tablet/Desktop.
- **Ursache:** Breakpoint-bedingte Reduktion von Textlabels im Header.
- **UX Impact:** Erhöhte Lernlast bei neuen Nutzern; potenziell mehr explorative Klicks.
- **Severity:** **Low-Medium**
- **Empfehlung:**
  - kritische Aktionen mit ergänzendem Label/Tooltip oder Onboarding-Hinweis,
  - testen, ob ein minimaler Text-Label-Mode auf Mobile die Erfolgsrate verbessert.

### Finding E — Performance UX Messlücke (LCP/CLS)
- **Seite:** gesamtes Produkt
- **Bildschirmgröße:** alle
- **Problem:** LCP/CLS konnten im lokalen Audit nicht formal per Lighthouse ausgewertet werden.
- **Ursache:** `npm run qa:lighthouse` scheitert lokal mit „Chrome installation not found“.
- **UX Impact:** Es bleibt Unsicherheit in quantitativen Performance-KPIs.
- **Severity:** **Medium**
- **Empfehlung:**
  - Lighthouse im CI (mit gesicherter Browser Runtime) als verbindliche Responsiveness/Performance-Referenz,
  - zusätzlich Mobile-Preset laufen lassen (derzeit Desktop-Preset).

---

## 4) Responsiveness Score

| Kategorie | Score (0–100) | Begründung |
|---|---:|---|
| Layout Responsiveness | **86** | Solide Breakpoints, kein globales Horizontal-Overflow in Test-Viewports. |
| Mobile UX | **69** | Touch-Targets + Dichte/Scannability auf kleinen Höhen verbesserungsbedürftig. |
| Navigation | **74** | Grundsätzlich klar, aber mobile Action-Auffindbarkeit und Footer-Navigation ausbaufähig. |
| Accessibility (responsive-relevant) | **72** | Fokus auf Touch-Ziele/Lesbarkeit/Interaktionsflächen nötig. |
| Performance UX | **70** | Subjektiv solide, aber ohne vollständige LCP/CLS-Messung im Audit-Environment. |

**Gesamtscore: 74 / 100**

---

## 5) Priorisierte Verbesserungsliste

### High Impact
1. Alle interaktiven Elemente auf **min. 44x44 px** vereinheitlichen (inkl. sekundärer Buttons/Inline-Actions).  
2. Mobile Search-Header/Controls entschlacken (Priorisierung, progressive disclosure).  
3. Mobile Footer-Informationsarchitektur anpassen (kein versteckter Horizontal-Scroll als Primärmuster).

### Medium Impact
1. Mobile Labels für zentrale Icons verbessern (z. B. textunterstützte Varianten).  
2. Vertikales Spacing-System für kleine Höhen (≤667px) nachschärfen.  
3. Mobile Lighthouse + CLS/LCP als feste QA-Gates integrieren.

### Low Impact
1. Zusätzliche Mikrointeraktionen/Hinweise für seltene Aktionen.  
2. Feinjustierung von Typo-Scale und Line-Length für sehr kleine Geräte.

---

## 6) Test-Setup & Viewports

Getestete Viewports:
- Desktop: 1920x1080, 1440x900, 1280x800
- Tablet: 1024x768, 834x1194
- Mobile: 390x844, 375x667, 360x640

Methodik:
- Visuelle Prüfung via Playwright-Screenshots auf Home/Search/About (stichprobenartig).
- DOM-Checks auf Horizontal-Overflow und kleine Touch-Targets.
- Code-Review der Breakpoints/Responsiveness-Logik in `src/styles.css`, `src/App.tsx`, Header/Footer-Komponenten.

Hinweis zu Artefakten:
- `public/data/**` wurde nicht geändert (nur während Build neu generiert, nicht versioniert).
- Keine Änderung am GitHub-Pages-Verhalten.
