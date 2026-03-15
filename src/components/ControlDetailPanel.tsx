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

const DEFAULT_SECTIONS = {
  guidance: true,
  params: false,
  relations: false,
  properties: false
};

const EXPANDED_SECTIONS = {
  guidance: true,
  params: true,
  relations: true,
  properties: true
};

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

function modalverbBadgeClass(modalverb: string) {
  const normalized = modalverb.toLowerCase();
  if (normalized.includes("muss")) {
    return "badge-success";
  }
  if (normalized.includes("sollte")) {
    return "badge-error";
  }
  if (normalized.includes("kann")) {
    return "badge-default";
  }
  return "badge-default";
}

function securityBadgeClass(value: string | null) {
  const normalized = String(value ?? "").toLowerCase();
  if (!normalized) {
    return "badge-default";
  }
  if (normalized.includes("basis")) {
    return "badge-accent";
  }
  if (normalized.includes("standard")) {
    return "badge-default";
  }
  return "badge-amber";
}

function relationHeading(relation: RelationEdge, direction: "incoming" | "outgoing") {
  return direction === "incoming" ? relation.sourceControlId : relation.targetControlId;
}

function renderRelationCard(
  relation: RelationEdge,
  direction: "incoming" | "outgoing",
  onRelationClick: (controlId: string) => void
) {
  const targetId = relationHeading(relation, direction);
  return (
    <li key={`${direction}-${relation.sourceControlId}-${relation.targetControlId}-${relation.relType}`}>
      <button type="button" className="relation-link-card" onClick={() => onRelationClick(targetId)}>
        <div className="relation-link-card-head">
          <span className="id-label">{targetId}</span>
          <span className={`badge ${relation.relType === "required" ? "badge-accent" : "badge-default"}`}>{relation.relType}</span>
        </div>
        <div className="relation-link-card-meta">{direction === "incoming" ? "Verweist auf diese Control" : "Abhängige Anforderung"}</div>
      </button>
    </li>
  );
}

function renderDetailSkeleton() {
  return (
    <div className="detail-loading-shell">
      <div className="c-skeleton-card detail-skeleton-head">
        <div className="skeleton result-skeleton-id" />
        <div className="skeleton detail-skeleton-title" />
        <div className="skeleton result-skeleton-line" />
      </div>
      <div className="c-skeleton-card detail-skeleton-body">
        <div className="skeleton result-skeleton-line" />
        <div className="skeleton result-skeleton-line" />
        <div className="skeleton result-skeleton-line short" />
      </div>
    </div>
  );
}

/**
 * Detail panel with identity head, reading zones, and relation workspace.
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
  const [sections, setSections] = useState(() => (expandAllByDefault ? EXPANDED_SECTIONS : DEFAULT_SECTIONS));

  useEffect(() => {
    if (!detail?.id) {
      return;
    }
    setSections(expandAllByDefault ? EXPANDED_SECTIONS : DEFAULT_SECTIONS);
  }, [detail?.id, expandAllByDefault]);

  function toggleSection(key: keyof typeof sections) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <section className="detail-panel c-detail-panel detail-panel-state" aria-busy="true" aria-live="polite">
        {renderDetailSkeleton()}
      </section>
    );
  }

  if (error) {
    return (
      <section className="detail-panel c-detail-panel detail-panel-state" role="alert">
        <div className="c-empty-state empty-state-error">
          <div className="c-empty-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="11" cy="15.5" r=".9" fill="currentColor" />
            </svg>
          </div>
          <div className="c-empty-title">Detailansicht nicht verfügbar</div>
          <div className="c-empty-desc">{error}</div>
        </div>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="detail-panel c-detail-panel detail-panel-state">
        <div className="c-empty-state detail-empty-state">
          <div className="c-empty-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="2" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 7h8M7 11h5M7 15h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="c-empty-title">Control auswählen</div>
          <div className="c-empty-desc">Wählen Sie eine Anforderung aus der Ergebnisliste aus, um die Detailansicht zu öffnen.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="detail-panel c-detail-panel" aria-live="polite">
      <div className="c-detail-head">
        {onBackToResults ? (
          <button type="button" className="btn btn-ghost btn-sm detail-back-link" onClick={onBackToResults}>
            Zur Ergebnisliste
          </button>
        ) : null}

        <nav aria-label="Breadcrumb" className="c-detail-group-path detail-breadcrumb">
          {detail.groupPathTitles.map((title, index) => {
            const groupId = detail.groupPathIds[index];
            const isLast = index === detail.groupPathTitles.length - 1 && detail.controlPathTitles.length === 0;
            return (
              <span key={`group-${groupId || index}`} className="detail-breadcrumb-item">
                <button
                  type="button"
                  className={`detail-breadcrumb-link ${isLast ? "current" : ""}`}
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
                  <span className="c-detail-group-path-sep" aria-hidden="true">
                    ›
                  </span>
                ) : null}
              </span>
            );
          })}

          {detail.controlPathTitles.map((title, index) => {
            const controlId = detail.controlPathIds[index];
            const isLast = index === detail.controlPathTitles.length - 1;
            return (
              <span key={`control-${controlId || index}`} className="detail-breadcrumb-item">
                {isLast ? (
                  <span className="detail-breadcrumb-link current" aria-current="page">
                    {title}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="detail-breadcrumb-link"
                    onClick={() => {
                      if (controlId) {
                        onBreadcrumbControlClick(controlId);
                      }
                    }}
                  >
                    {title}
                  </button>
                )}
                {!isLast ? <span className="c-detail-group-path-sep">›</span> : null}
              </span>
            );
          })}
        </nav>

        <div className="c-detail-identity">
          <span className="id-label id-label-lg">{detail.id}</span>
          <div className="detail-badge-row">
            {detail.secLevel ? <span className={`badge ${securityBadgeClass(detail.secLevel)}`}>{detail.secLevel}</span> : null}
            {detail.modalverbs[0] ? <span className={`badge ${modalverbBadgeClass(detail.modalverbs[0])}`}>{detail.modalverbs[0]}</span> : null}
            {detail.class ? <span className="badge badge-default">{detail.class}</span> : null}
          </div>
        </div>

        <h2 className="c-detail-title">{detail.title}</h2>

        <div className="c-detail-tags">
          {detail.tags.map((tag) => (
            <button key={`${detail.id}-${tag}`} type="button" className="chip chip-default" onClick={() => onPropertyFilterClick("tags", tag)}>
              {tag}
            </button>
          ))}
          {detail.effortLevel ? (
            <button type="button" className="chip chip-default" onClick={() => onPropertyFilterClick("effortLevel", detail.effortLevel as string)}>
              Aufwand {detail.effortLevel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="c-detail-body">
        <div className="c-detail-zone">
          <div className="c-detail-zone-label">Statement</div>
          <div className="c-detail-text">{renderTextWithParams(detail.statementText, detail.params) || "Kein Statement vorhanden."}</div>
        </div>

        <section className={`c-accordion-item ${sections.guidance ? "open" : ""}`}>
          <button
            type="button"
            className="c-accordion-head"
            aria-expanded={sections.guidance}
            onClick={() => toggleSection("guidance")}
          >
            <div className="c-accordion-head-left">
              <span className="c-accordion-toggle" aria-hidden="true">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 1l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="c-accordion-title">Umsetzungshinweis</span>
            </div>
            <span className="badge badge-default">Guidance</span>
          </button>
          <div className="c-accordion-body">
            <div className="c-detail-text">{renderTextWithParams(detail.guidanceText, detail.params) || "Keine Guidance vorhanden."}</div>
          </div>
        </section>

        <section className={`c-accordion-item ${sections.params ? "open" : ""}`}>
          <button
            type="button"
            className="c-accordion-head"
            aria-expanded={sections.params}
            onClick={() => toggleSection("params")}
          >
            <div className="c-accordion-head-left">
              <span className="c-accordion-toggle" aria-hidden="true">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 1l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="c-accordion-title">Parameter</span>
            </div>
            <span className="badge badge-default">{detail.params.length}</span>
          </button>
          <div className="c-accordion-body">
            {detail.params.length > 0 ? (
              <ul className="detail-parameter-list">
                {detail.params.map((param) => (
                  <li key={param.id ?? `${detail.id}-param`} className="detail-parameter-item">
                    <div className="detail-parameter-id">{param.id || "Parameter"}</div>
                    <div className="detail-parameter-value">{(param.values || []).join(", ") || param.label || "-"}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="c-detail-text">Keine Parameter vorhanden.</div>
            )}
          </div>
        </section>

        <section className={`c-accordion-item ${sections.relations ? "open" : ""}`}>
          <button
            type="button"
            className="c-accordion-head"
            aria-expanded={sections.relations}
            onClick={() => toggleSection("relations")}
          >
            <div className="c-accordion-head-left">
              <span className="c-accordion-toggle" aria-hidden="true">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 1l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="c-accordion-title">Relationen</span>
            </div>
            <span className="badge badge-default">{detail.relationsIncoming.length + detail.relationsOutgoing.length}</span>
          </button>
          <div className="c-accordion-body">
            <div className="relation-controls-panel">
              <label>
                Hops
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
                Typ
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

            {graphLoading ? <div className="relation-inline-status">Graph wird geladen...</div> : null}
            {graphError ? <div className="relation-inline-status error-state">{graphError}</div> : null}

            <RelationGraphLite controlId={detail.id} graph={graphData} relFilter={graphFilter} onNodeClick={onRelationClick} />

            <div className="relation-columns">
              <div>
                <div className="c-detail-zone-label">Required / Related nach</div>
                <ul className="relation-link-list">{detail.relationsOutgoing.map((item) => renderRelationCard(item, "outgoing", onRelationClick))}</ul>
              </div>
              <div>
                <div className="c-detail-zone-label">Verweist auf diese Control</div>
                <ul className="relation-link-list">{detail.relationsIncoming.map((item) => renderRelationCard(item, "incoming", onRelationClick))}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className={`c-accordion-item ${sections.properties ? "open" : ""}`}>
          <button
            type="button"
            className="c-accordion-head"
            aria-expanded={sections.properties}
            onClick={() => toggleSection("properties")}
          >
            <div className="c-accordion-head-left">
              <span className="c-accordion-toggle" aria-hidden="true">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 1l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="c-accordion-title">Eigenschaften</span>
            </div>
            <span className="badge badge-default">{detail.props.length}</span>
          </button>
          <div className="c-accordion-body">
            {detail.props.length > 0 ? (
              <ul className="detail-property-list">
                {detail.props.map((prop, index) => {
                  const facet = resolveFilterFacet(prop.name);
                  const values = facet ? splitPropertyValues(facet, prop.value) : [];

                  return (
                    <li key={`${detail.id}-prop-${index}`} className="detail-property-item">
                      <div className="detail-property-name">{prop.name || "Eigenschaft"}</div>
                      {facet && values.length > 0 ? (
                        <div className="property-chip-row">
                          {values.map((value) => (
                            <button
                              key={`${detail.id}-prop-${index}-${value}`}
                              type="button"
                              className="chip chip-default"
                              onClick={() => onPropertyFilterClick(facet, value)}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="detail-property-value">{String(prop.value ?? "") || "-"}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="c-detail-text">Keine Eigenschaften vorhanden.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
