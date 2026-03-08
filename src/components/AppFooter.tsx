const BSI_REPOSITORY_URL = "https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek";
const CC_BY_SA_4_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

export function AppFooter() {
  return (
    <footer className="app-footer" aria-labelledby="footer-attribution">
      <p id="footer-attribution" className="app-footer-attribution">
        Enthält Inhalte aus der Stand-der-Technik-Bibliothek des BSI. Lizenz: CC BY-SA 4.0. Für diesen Viewer
        technisch aufbereitet.
      </p>

      <nav className="app-footer-links" aria-label="Attribution, Lizenz und Footer-Navigation">
        <a href={BSI_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
          BSI-Quelle
        </a>
        <a href={CC_BY_SA_4_URL} target="_blank" rel="noopener noreferrer">
          CC BY-SA 4.0
        </a>
        <a href="#/about/license">Quellen &amp; Lizenz</a>
        <a href="#/about">About</a>
        <a href="#/impressum">Impressum</a>
        <a href="#/datenschutz">Datenschutz</a>
      </nav>
    </footer>
  );
}
