import { useEffect, useMemo, useState } from "react";
import type { GroupNode, SearchResultItem } from "../types";

interface GroupPageProps {
  group: GroupNode | null;
  subgroups: GroupNode[];
  controls: SearchResultItem[];
  selectedControlIds: Set<string>;
  loading: boolean;
  selectingAllControls: boolean;
  allControlsSelected: boolean;
  onOpenSubgroup: (id: string) => void;
  onOpenControl: (control: SearchResultItem) => void;
  onToggleControlSelection: (control: SearchResultItem, selected: boolean) => void;
  onSelectAllControls: () => void;
}

export function GroupPage({
  group,
  subgroups,
  controls,
  selectedControlIds,
  loading,
  selectingAllControls,
  allControlsSelected,
  onOpenSubgroup,
  onOpenControl,
  onToggleControlSelection,
  onSelectAllControls
}: GroupPageProps) {
  /* REQ: EC-03, UI 5.2 Group/Search Pagination */
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    setVisibleCount(25);
  }, [group?.id, controls]);

  const visibleControls = useMemo(() => controls.slice(0, visibleCount), [controls, visibleCount]);

  if (!group) {
    return <section className="status-box error">Gruppe nicht gefunden.</section>;
  }

  return (
    <section className="group-page">
      <header>
        <h1>
          {group.id} - {group.title}
        </h1>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          {group.pathTitles.map((title, index) => {
            const groupId = group.pathIds[index];
            const isLast = index === group.pathTitles.length - 1;
            return (
              <span key={`group-breadcrumb-${groupId || index}`} className="breadcrumb-item">
                {isLast ? (
                  <span className="breadcrumb-link current" aria-current="page">
                    {title}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="breadcrumb-link"
                    onClick={() => {
                      if (groupId) {
                        onOpenSubgroup(groupId);
                      }
                    }}
                  >
                    {title}
                  </button>
                )}
                {!isLast ? (
                  <span className="breadcrumb-separator" aria-hidden="true">
                    /
                  </span>
                ) : null}
              </span>
            );
          })}
        </nav>
      </header>

      {subgroups.length > 0 ? (
        <section>
          <h2>Untergruppen</h2>
          <div className="group-grid">
            {subgroups.map((subgroup) => (
              <button key={subgroup.id} type="button" className="group-tile" onClick={() => onOpenSubgroup(subgroup.id)}>
                <strong className="group-tile-id">{subgroup.id}</strong>
                <span className="group-tile-title">{subgroup.title}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="section-heading-row">
          <h2>Controls</h2>
          <button className="secondary compact" type="button" onClick={onSelectAllControls} disabled={selectingAllControls}>
            {selectingAllControls ? "Alles auswählen..." : allControlsSelected ? "Alles abwählen" : "Alles auswählen"}
          </button>
        </div>
        {loading ? <p>Controls werden geladen…</p> : null}
        <ul className="group-control-list">
          {visibleControls.map((control) => {
            const exportSelected = selectedControlIds.has(control.id);
            return (
              <li key={control.id} className={exportSelected ? "export-selected" : ""}>
                <div className="group-control-row">
                  <label className="control-selection">
                    <input
                      type="checkbox"
                      checked={exportSelected}
                      onChange={(event) => onToggleControlSelection(control, event.currentTarget.checked)}
                    />
                    <span>Für CSV auswählen</span>
                  </label>
                  <button type="button" onClick={() => onOpenControl(control)}>
                    <strong>{control.id}</strong>
                    <span>{control.title}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {visibleCount < controls.length ? (
          <div className="list-pagination">
            <button type="button" className="secondary" onClick={() => setVisibleCount((prev) => prev + 25)}>
              Mehr laden
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
