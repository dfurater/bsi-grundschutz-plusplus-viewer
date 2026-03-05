import { useEffect, useState } from "react";
import type { ControlDetail, RelationEdge, RelationGraphPayload } from "../types";
import { RelationGraphLite } from "./RelationGraphLite";

interface ControlDetailPanelProps {
  detail: ControlDetail | null;
  loading: boolean;
  error: string | null;
  graphData: RelationGraphPayload | null;
  graphLoading: boolean;
  graphError: string | null;
  graphHops: 1 | 2;
  graphFilter: "all" | "required" | "related";
  onGraphHopsChange: (hops: 1 | 2) => void;
  onGraphFilterChange: (filter: "all" | "required" | "related") => void;
  onRelationClick: (controlId: string) => void;
  onPropertyFilterClick: (facet: "secLevel" | "effortLevel" | "tags", value: string) => void;
  onBreadcrumbGroupClick: (groupId: string) => void;
  onBreadcrumbControlClick: (controlId: string) => void;
  onBackToResults?: (() => void) | null;
  expandAllByDefault?: boolean;
}

function renderRelation(
  relation: RelationEdge,
  direction: "incoming" | "outgoing",
  onRelationClick: (controlId: string) => void
) {
  const targetId = direction === "incoming" ? relation.sourceControlId : relation.targetControlId;
  return (
    <li key={`${direction}-${relation.sourceControlId}-${relation.targetControlId}-${relation.relType}`}>
      <button type="button" className="link-button" onClick={() => onRelationClick(targetId)}>
        {relation.relType}: {targetId}
      </button>
    </li>
  );
}

function renderTextWithParams(input: string, params: ControlDetail["params"]) {
  return input.replace(/\{\{\s*insert:\s*param,\s*([^}\s]+)\s*\}\}/gi, (_, paramId: string) => {
    const normalizedId = String(paramId).toLowerCase();
    const param = params.find((item) => String(item.id ?? "").toLowerCase() === normalizedId);
    if (!param) {
      return "";
    }
    return param.values[0] ?? param.label ?? "";
  });
}

function resolveFilterFacet(propName: string | null): "secLevel" | "effortLevel" | "tags" | null {
  if (!propName) {
    return null;
  }
  const normalized = propName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (normalized === "sec_level") {
    return "secLevel";
  }
  if (normalized === "effort_level") {
    return "effortLevel";
  }
  if (normalized === "tags") {
    return "tags";
  }
  return null;
}

function splitPropertyValues(facet: "secLevel" | "effortLevel" | "tags", rawValue: unknown): string[] {
  const text = String(rawValue ?? "").trim();
  if (!text) {
    return [];
  }
  if (facet !== "tags") {
    return [text];
  }
  return text
    .split(/[,;|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Control detail with breadcrumb, back-to-results and collapsible secondary sections.
 * REQ: US-05, US-06, US-07, A11y-02, F-06, F-07
 */
export function ControlDetailPanel({
  detail,
  loading,
  error,
  graphData,
  graphLoading,
  graphError,
  graphHops,
  graphFilter,
  onGraphHopsChange,
  onGraphFilterChange,
  onRelationClick,
  onPropertyFilterClick,
  onBreadcrumbGroupClick,
  onBreadcrumbControlClick,
  onBackToResults,
  expandAllByDefault = false
}: ControlDetailPanelProps) {
  const [sections, setSections] = useState(() => ({
    guidance: expandAllByDefault,
    params: expandAllByDefault,
    relations: expandAllByDefault,
    properties: expandAllByDefault
  }));

  useEffect(() => {
    if (!expandAllByDefault || !detail?.id) {
      return;
    }
    setSections({
      guidance: true,
      params: true,
      relations: true,
      properties: true
    });
  }, [detail?.id, expandAllByDefault]);

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return <section className="detail-panel status-box">Control wird geladen…</section>;
  }

  if (error) {
    return <section className="detail-panel status-box error">{error}</section>;
  }

  if (!detail) {
    return <section className="detail-panel status-box">Control auswählen, um Details zu sehen.</section>;
  }

  return (
    <section className="detail-panel" aria-live="polite">
      <header className="detail-header">
        <h2>
          <span>{detail.id}</span>
          <strong>{detail.title}</strong>
        </h2>
        <div className="chip-row">
          {detail.secLevel ? (
            <button
              type="button"
              className="chip chip-button"
              onClick={() => onPropertyFilterClick("secLevel", detail.secLevel as string)}
              title={`Nach Sicherheitsniveau ${detail.secLevel} filtern`}
            >
              {detail.secLevel}
            </button>
          ) : null}
          {detail.effortLevel ? (
            <button
              type="button"
              className="chip chip-button"
              onClick={() => onPropertyFilterClick("effortLevel", detail.effortLevel as string)}
              title={`Nach Aufwand ${detail.effortLevel} filtern`}
            >
              Aufwand {detail.effortLevel}
            </button>
          ) : null}
          {detail.class ? <span className="chip">{detail.class}</span> : null}
        </div>
      </header>

      {/* REQ: US-06, 4.4.3 */}
      {onBackToResults ? (
        <button type="button" className="secondary" onClick={onBackToResults}>
          Zur Ergebnisliste
        </button>
      ) : null}

      <nav aria-label="Breadcrumb" className="breadcrumb">
        {detail.groupPathTitles.map((title, index) => {
          const groupId = detail.groupPathIds[index];
          const isLast = index === detail.groupPathTitles.length - 1 && detail.controlPathTitles.length === 0;
          return (
            <span key={`group-${groupId || index}`} className="breadcrumb-item">
              <button
                type="button"
                className={`breadcrumb-link ${isLast ? "current" : ""}`}
                onClick={() => {
                  if (!isLast && groupId) {
                    onBreadcrumbGroupClick(groupId);
                  }
                }}
                aria-current={isLast ? "page" : undefined}
                disabled={isLast}
              >
                {title}
              </button>
              {index < detail.groupPathTitles.length - 1 || detail.controlPathTitles.length > 0 ? (
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              ) : null}
            </span>
          );
        })}

        {detail.controlPathTitles.map((title, index) => {
          const controlId = detail.controlPathIds[index];
          const isLast = index === detail.controlPathTitles.length - 1;
          return (
            <span key={`control-${controlId || index}`} className="breadcrumb-item">
              {isLast ? (
                <span className="breadcrumb-link current" aria-current="page">
                  {title}
                </span>
              ) : (
                <button
                  type="button"
                  className="breadcrumb-link"
                  onClick={() => {
                    if (controlId) {
                      onBreadcrumbControlClick(controlId);
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

      <article className="part-block">
        <h3>Statement</h3>
        <p>{renderTextWithParams(detail.statementText, detail.params) || "Kein Statement vorhanden."}</p>
      </article>

      {/* REQ: US-07, A11y-02 */}
      <section className="part-block accordion-block">
        <button
          type="button"
          className="accordion-toggle"
          aria-expanded={sections.guidance}
          onClick={() => toggleSection("guidance")}
        >
          <span>Guidance</span>
          <span className="accordion-indicator" aria-hidden="true">
            ▾
          </span>
        </button>
        {sections.guidance ? (
          <div>
            <p>{renderTextWithParams(detail.guidanceText, detail.params) || "Keine Guidance vorhanden."}</p>
          </div>
        ) : null}
      </section>

      <section className="part-block accordion-block">
        <button
          type="button"
          className="accordion-toggle"
          aria-expanded={sections.params}
          onClick={() => toggleSection("params")}
        >
          <span>Parameter</span>
          <span className="accordion-indicator" aria-hidden="true">
            ▾
          </span>
        </button>
        {sections.params ? (
          detail.params.length > 0 ? (
            <ul>
              {detail.params.map((param) => (
                <li key={param.id ?? `${detail.id}-param`}>
                  <strong>{param.id}</strong>: {(param.values || []).join(", ") || param.label || "-"}
                </li>
              ))}
            </ul>
          ) : (
            <p>Keine Parameter vorhanden.</p>
          )
        ) : null}
      </section>

      <section className="part-block accordion-block">
        <button
          type="button"
          className="accordion-toggle"
          aria-expanded={sections.relations}
          onClick={() => toggleSection("relations")}
        >
          <span>Relationen</span>
          <span className="accordion-indicator" aria-hidden="true">
            ▾
          </span>
        </button>

        {sections.relations ? (
          <div>
            <div className="relation-heading-row">
              <div className="relation-controls">
                <label>
                  Filter Hops
                  <select
                    aria-label="Filter Hops"
                    value={String(graphHops)}
                    onChange={(event) => onGraphHopsChange(Number(event.target.value) === 2 ? 2 : 1)}
                  >
                    <option value="1">1-Hop</option>
                    <option value="2">2-Hop</option>
                  </select>
                </label>
                <label>
                  Filter Typ
                  <select
                    aria-label="Filter Typ"
                    value={graphFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      onGraphFilterChange(value === "required" || value === "related" ? value : "all");
                    }}
                  >
                    <option value="all">Alle</option>
                    <option value="required">Nur required</option>
                    <option value="related">Nur related</option>
                  </select>
                </label>
              </div>
            </div>

            {graphLoading ? <p className="relation-empty">Graph wird geladen…</p> : null}
            {graphError ? <p className="relation-empty error">{graphError}</p> : null}

            <RelationGraphLite
              controlId={detail.id}
              graph={graphData}
              relFilter={graphFilter}
              onNodeClick={onRelationClick}
            />

            <div className="relation-columns">
              <div>
                <h4>Required / Related nach</h4>
                <ul>{detail.relationsOutgoing.map((item) => renderRelation(item, "outgoing", onRelationClick))}</ul>
              </div>
              <div>
                <h4>Verweist auf diese Control</h4>
                <ul>{detail.relationsIncoming.map((item) => renderRelation(item, "incoming", onRelationClick))}</ul>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="part-block accordion-block">
        <button
          type="button"
          className="accordion-toggle"
          aria-expanded={sections.properties}
          onClick={() => toggleSection("properties")}
        >
          <span>Eigenschaften</span>
          <span className="accordion-indicator" aria-hidden="true">
            ▾
          </span>
        </button>
        {sections.properties ? (
          <ul>
            {detail.props.map((prop, index) => {
              const facet = resolveFilterFacet(prop.name);
              const values = facet ? splitPropertyValues(facet, prop.value) : [];

              return (
                <li key={`${detail.id}-prop-${index}`} className="property-item">
                  <strong>{prop.name}</strong>: {" "}
                  {facet && values.length > 0 ? (
                    <span className="property-chip-row">
                      {values.map((value) => (
                        <button
                          key={`${detail.id}-prop-${index}-${value}`}
                          type="button"
                          className="property-filter-chip"
                          onClick={() => onPropertyFilterClick(facet, value)}
                          title={`Nach ${value} filtern`}
                        >
                          {value}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <span>{String(prop.value ?? "") || "-"}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </section>
  );
}
