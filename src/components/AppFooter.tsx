import { useRef } from "react";

interface AppFooterProps {
  importBusy: boolean;
  onUpload: (file: File) => void;
}

export function AppFooter({ importBusy, onUpload }: AppFooterProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <footer className="app-footer" aria-label="Footer-Navigation">
      <nav className="app-footer-links">
        <a href="#/about">About</a>
        <a href="#/about/source">Quellen &amp; Version</a>
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
