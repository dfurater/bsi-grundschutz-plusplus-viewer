import { useEffect, useRef, useState } from "react";
import { SECURITY_BUDGETS } from "../lib/securityBudgets";

interface SearchBarProps {
  value: string;
  sort: "relevance" | "id-asc" | "title-asc";
  offline: boolean;
  theme: "light" | "dark";
  datasets: Array<{ id: string; label: string }>;
  selectedDatasetId: string;
  activeDatasetInfo: {
    label: string;
    version: string | null;
    lastModified: string | null;
    oscalVersion: string | null;
    controls: number;
    groups: number;
  };
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSortChange: (value: "relevance" | "id-asc" | "title-asc") => void;
  onDatasetChange: (datasetId: string) => void;
  onToggleTheme: () => void;
  onGoHome: () => void;
  onGoSource: () => void;
  onUpload: (file: File) => void;
  selectedControlCount: number;
  exportingCsv: boolean;
  exportMessage: string | null;
  onExportCsv: () => void;
}

export function SearchBar({
  value,
  sort,
  offline,
  theme,
  datasets,
  selectedDatasetId,
  activeDatasetInfo,
  onChange,
  onSubmit,
  onSortChange,
  onDatasetChange,
  onToggleTheme,
  onGoHome,
  onGoSource,
  onUpload,
  selectedControlCount,
  exportingCsv,
  exportMessage,
  onExportCsv
}: SearchBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLSpanElement | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const date = activeDatasetInfo.lastModified ? new Date(activeDatasetInfo.lastModified) : null;
  const lastModifiedLabel =
    date && !Number.isNaN(date.valueOf())
      ? date.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
      : activeDatasetInfo.lastModified || "-";

  useEffect(() => {
    if (!isPopoverOpen) {
      return;
    }

    function onDocumentMouseDown(event: MouseEvent) {
      if (isPinned) {
        return;
      }
      const target = event.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setIsPopoverOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPopoverOpen(false);
        setIsPinned(false);
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isPopoverOpen, isPinned]);

  return (
    <header className="search-header">
      <div className="header-top">
        <div className="brand-block">
          <div className="brand-main">
            <button
              className={`theme-badge ${theme === "dark" ? "active" : ""}`}
              onClick={onToggleTheme}
              type="button"
              aria-label={theme === "dark" ? "Tagmodus aktivieren" : "Nachtmodus aktivieren"}
              title={theme === "dark" ? "Tagmodus" : "Nachtmodus"}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === "dark" ? "☀︎" : "☾"}
              </span>
              <span>{theme === "dark" ? "Tag" : "Nacht"}</span>
            </button>
            <button className="link-button" onClick={onGoHome} type="button">
              Grundschutz++ Katalog
            </button>
          </div>

          <div className="brand-meta">
            <span className="dataset-badge-wrap" ref={popoverRef}>
              <button
                className="dataset-badge"
                type="button"
                aria-label="Datensatzdetails anzeigen"
                aria-expanded={isPopoverOpen}
                onClick={() => setIsPopoverOpen((prev) => !prev)}
              >
                {activeDatasetInfo.label}
              </button>

              {isPopoverOpen ? (
                <span className="dataset-tooltip" role="dialog" aria-label="Datensatzdetails">
                  <span className="dataset-tooltip-header">
                    <strong>{activeDatasetInfo.label}</strong>
                    <span className="dataset-tooltip-actions">
                      <button
                        type="button"
                        className={`secondary compact ${isPinned ? "active" : ""}`}
                        onClick={() => setIsPinned((prev) => !prev)}
                      >
                        {isPinned ? "Lösen" : "Anheften"}
                      </button>
                      <button
                        type="button"
                        className="secondary compact"
                        onClick={() => {
                          setIsPopoverOpen(false);
                          setIsPinned(false);
                        }}
                      >
                        Schließen
                      </button>
                    </span>
                  </span>
                  <span>Version: {activeDatasetInfo.version || "-"}</span>
                  <span>Last Modified: {lastModifiedLabel}</span>
                  <span>OSCAL: {activeDatasetInfo.oscalVersion || "-"}</span>
                  <span>Controls: {activeDatasetInfo.controls}</span>
                  <span>Gruppen: {activeDatasetInfo.groups}</span>
                </span>
              ) : null}
            </span>

            <span className={`network-badge ${offline ? "offline" : "online"}`}>{offline ? "Offline" : "Online"}</span>
          </div>
        </div>

        <div className="header-actions">
          <select
            className="dataset-select"
            aria-label="Katalog wählen"
            value={selectedDatasetId}
            onChange={(event) => onDatasetChange(event.target.value)}
          >
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.label}
              </option>
            ))}
          </select>
          <button className="secondary" onClick={onGoSource} type="button">
            Quellen & Version
          </button>
          <button
            className="secondary"
            onClick={onExportCsv}
            type="button"
            disabled={selectedControlCount === 0 || exportingCsv}
            title={
              selectedControlCount === 0
                ? "Mindestens ein Control auswählen"
                : "Ausgewählte Controls als CSV herunterladen"
            }
          >
            {exportingCsv ? `CSV wird erstellt (${selectedControlCount})` : `CSV exportieren (${selectedControlCount})`}
          </button>
          <button
            className="secondary"
            onClick={() => fileInputRef.current?.click()}
            type="button"
            title="Lokale JSON-Datei laden"
          >
            JSON laden
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onUpload(file);
              }
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>
      {exportMessage ? <p className="export-status">{exportMessage}</p> : null}

      <div className="search-controls">
        <input
          type="search"
          value={value}
          maxLength={SECURITY_BUDGETS.maxQueryChars}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSubmit();
            }
          }}
          placeholder="ID oder Volltext suchen (z. B. KONF.12.4, Notfallplanung)"
          aria-label="Katalog durchsuchen"
        />

        <select value={sort} onChange={(event) => onSortChange(event.target.value as any)} aria-label="Sortierung">
          <option value="relevance">Relevanz</option>
          <option value="id-asc">ID aufsteigend</option>
          <option value="title-asc">Titel A-Z</option>
        </select>

        <button className="primary" onClick={onSubmit} type="button">
          Suchen
        </button>
      </div>
    </header>
  );
}
