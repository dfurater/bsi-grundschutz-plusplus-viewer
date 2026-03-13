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

Die zuvor offene Lighthouse-Messlücke wurde inzwischen nachgeholt (Desktop + Mobile). Die Produktwerte sind gut; als verbleibende Prozesslücke bleibt, dass Mobile-Lighthouse aktuell noch kein fester QA-Gate ist.

**Kurzfazit:** technisch stabil responsiv, mit spürbaren UX-Reibungen auf Mobile (v. a. Interaktion + Informationshierarchie) und einem verbleibenden QA-Prozess-Thema bei Mobile-Performance-Gates.

---

## 2) Major UX Problems

1. **Zu kleine Touch-Targets in interaktiven UI-Elementen** (u. a. Clear-Button in Suchfeld).  
2. **Footer-Linkzeile auf Mobile mit horizontalem Scrolling / abgeschnittener Wahrnehmung**.  
3. **Hohe UI-Dichte im Search-Kontext auf kleinen Höhen** → reduzierte Ergebnis- und CTA-Sichtbarkeit.  
4. **Icon-only/kompakte Actions auf Mobile reduzieren Erkennbarkeit** (insb. ohne explizite Textlabels).  
5. **Lighthouse-Qualitätssicherung deckt standardmäßig nur Desktop ab** (Mobile-Messung noch kein verbindlicher QA-Gate).

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

### Finding E — Performance UX QA-Lücke (Mobile-Gating)
- **Seite:** gesamtes Produkt
- **Bildschirmgröße:** alle (insb. Mobile-Relevanz)
- **Problem:** Die Lighthouse-Prozedur wurde nachgeholt und zeigt gute Werte; Mobile-Lighthouse ist jedoch noch nicht als verbindlicher Standard-Gate hinterlegt.
- **Screenshot/Beleg:** 
  - `npm run qa:browser` (2026-03-13) erfolgreich inkl. `qa:lighthouse`.
  - Ad-hoc Mobile-Lighthouse (2026-03-13) erfolgreich für `#/`, `#/search?q=KONF.12.4`, `#/about/source`.
  - Desktop: Performance **100**, Accessibility **95-100**, Best Practices **96**, LCP **~404-407ms**, CLS **0-0.008**.
  - Mobile: Performance **99**, Accessibility **95-100**, Best Practices **96**, LCP **~1653-1660ms**, CLS **~0**.
- **Ursache:** `lighthouserc.json` nutzt aktuell `preset: desktop`; Mobile-Runs passieren derzeit nur manuell/ad-hoc.
- **UX Impact:** Kurzfristig geringe Produkt-Performance-Risiken, aber mittelfristig Risiko unentdeckter mobiler Regressions ohne festen Gate.
- **Severity:** **Low-Medium**
- **Empfehlung:**
  - Mobile-Lighthouse als zweiten verbindlichen CI-Lauf ergänzen (eigene Config oder separater Job),
  - mobile KPI-Schwellen für LCP/CLS explizit definieren und versionieren.

---

## 4) Responsiveness Score

| Kategorie | Score (0–100) | Begründung |
|---|---:|---|
| Layout Responsiveness | **86** | Solide Breakpoints, kein globales Horizontal-Overflow in Test-Viewports. |
| Mobile UX | **69** | Touch-Targets + Dichte/Scannability auf kleinen Höhen verbesserungsbedürftig. |
| Navigation | **74** | Grundsätzlich klar, aber mobile Action-Auffindbarkeit und Footer-Navigation ausbaufähig. |
| Accessibility (responsive-relevant) | **72** | Fokus auf Touch-Ziele/Lesbarkeit/Interaktionsflächen nötig. |
| Performance UX | **84** | Desktop- und Mobile-Lighthouse-Werte sind gut; verbleibend ist primär das fehlende Mobile-CI-Gating. |

**Gesamtscore: 77 / 100**

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
- Nachgeholte Lighthouse-Auswertung am 2026-03-13:
  - Desktop (`npm run qa:browser`): Performance 100, Accessibility 95-100, Best Practices 96, LCP ~404-407ms, CLS 0-0.008.
  - Mobile (ad-hoc Lighthouse): Performance 99, Accessibility 95-100, Best Practices 96, LCP ~1653-1660ms, CLS ~0.

Hinweis zu Artefakten:
- `public/data/**` wurde nicht geändert (nur während Build neu generiert, nicht versioniert).
- Keine Änderung am GitHub-Pages-Verhalten.
