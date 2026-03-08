import { useRef } from "react";

interface AppFooterProps {
  importBusy: boolean;
  onUpload: (file: File) => void;
}

const BSI_REPOSITORY_URL = "https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek";
const CC_BY_SA_4_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

export function AppFooter({ importBusy, onUpload }: AppFooterProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <footer className="app-footer" aria-labelledby="footer-attribution">
      <p id="footer-attribution" className="app-footer-attribution">
        Enthält Inhalte aus der Stand-der-Technik-Bibliothek des BSI. Lizenz: CC BY-SA 4.0. Für diesen Viewer
        technisch aufbereitet.
      </p>

      <nav className="app-footer-license-links" aria-label="Attribution und Lizenz">
        <a href={BSI_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
          BSI-Quelle
        </a>
        <a href={CC_BY_SA_4_URL} target="_blank" rel="noopener noreferrer">
          CC BY-SA 4.0
        </a>
        <a href="#/about/license">Quellen &amp; Lizenz</a>
      </nav>

      <nav className="app-footer-links" aria-label="Footer-Navigation">
        <a href="#/about">About</a>
        <a href="#/impressum">Impressum</a>
        <a href="#/datenschutz">Datenschutz</a>
        <button
          type="button"
          className="app-footer-link-button"
          onClick={() => fileRef.current?.click()}
          disabled={importBusy}
          title="JSON-Datei laden"
        >
          {importBusy ? "JSON wird geladen" : "JSON laden"}
        </button>
      </nav>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept="application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onUpload(file);
          }
          event.currentTarget.value = "";
        }}
      />
    </footer>
  );
}
