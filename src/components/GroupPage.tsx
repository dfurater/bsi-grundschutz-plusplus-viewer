import type { GroupNode, SearchResultItem } from "../types";

interface GroupPageProps {
  group: GroupNode | null;
  subgroups: GroupNode[];
  controls: SearchResultItem[];
  selectedControlIds: Set<string>;
  loading: boolean;
  onOpenSubgroup: (id: string) => void;
  onOpenControl: (control: SearchResultItem) => void;
  onToggleControlSelection: (control: SearchResultItem, selected: boolean) => void;
}

export function GroupPage({
  group,
  subgroups,
  controls,
  selectedControlIds,
  loading,
  onOpenSubgroup,
  onOpenControl,
  onToggleControlSelection
}: GroupPageProps) {
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
                <strong>{subgroup.id}</strong>
                <span>{subgroup.title}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2>Controls</h2>
        {loading ? <p>Controls werden geladen…</p> : null}
        <ul className="group-control-list">
          {controls.map((control) => {
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
      </section>
    </section>
  );
}
