import { useEffect, useMemo, useRef, useState } from "react";
import type { RelationGraphEdge, RelationGraphPayload } from "../types";

interface RelationGraphLiteProps {
  controlId: string;
  graph: RelationGraphPayload | null;
  relFilter: "all" | "required" | "related";
  onNodeClick: (controlId: string) => void;
}

type Side = "incoming" | "outgoing" | "both";

const WIDTH = 980;
const HEIGHT = 460;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

function toRadians(angle: number) {
  return (angle * Math.PI) / 180;
}

function ellipsePoint(angle: number, radiusX: number, radiusY: number) {
  return {
    x: CENTER_X + Math.cos(toRadians(angle)) * radiusX,
    y: CENTER_Y + Math.sin(toRadians(angle)) * radiusY
  };
}

function withAngles(ids: string[], angleStart: number, angleEnd: number) {
  if (ids.length === 0) {
    return [] as Array<{ id: string; angle: number }>;
  }
  if (ids.length === 1) {
    return [{ id: ids[0], angle: (angleStart + angleEnd) / 2 }];
  }
  const step = (angleEnd - angleStart) / (ids.length - 1);
  return ids.map((id, index) => ({ id, angle: angleStart + index * step }));
}

function edgeColor(edge: RelationGraphEdge) {
  return edge.relType === "required" ? "#b45309" : "#0b7285";
}

function nodeStrokeColor(relTypes: Set<string>) {
  if (relTypes.has("required") && relTypes.has("related")) {
    return "#0f766e";
  }
  if (relTypes.has("required")) {
    return "#b45309";
  }
  return "#0b7285";
}

export function RelationGraphLite({ controlId, graph, relFilter, onNodeClick }: RelationGraphLiteProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [controlId, graph?.hops]);

  const filteredGraph = useMemo(() => {
    if (!graph) {
      return null;
    }

    const edges = graph.edges.filter((edge) => relFilter === "all" || edge.relType === relFilter);
    const connectedNodeIds = new Set<string>([controlId]);
    for (const edge of edges) {
      connectedNodeIds.add(edge.sourceControlId);
      connectedNodeIds.add(edge.targetControlId);
    }

    const nodes = graph.nodes.filter((node) => connectedNodeIds.has(node.id));
    return { nodes, edges };
  }, [graph, relFilter, controlId]);

  const layout = useMemo(() => {
    if (!filteredGraph) {
      return null;
    }

    const sideById = new Map<string, Side>();
    sideById.set(controlId, "both");

    for (const edge of filteredGraph.edges) {
      if (edge.sourceControlId === controlId) {
        sideById.set(edge.targetControlId, "outgoing");
      }
      if (edge.targetControlId === controlId) {
        sideById.set(edge.sourceControlId, "incoming");
      }
    }

    for (let pass = 0; pass < 3; pass += 1) {
      for (const edge of filteredGraph.edges) {
        const sourceSide = sideById.get(edge.sourceControlId);
        const targetSide = sideById.get(edge.targetControlId);

        if (sourceSide && !targetSide) {
          sideById.set(edge.targetControlId, sourceSide);
        }
        if (!sourceSide && targetSide) {
          sideById.set(edge.sourceControlId, targetSide);
        }
      }
    }

    for (const node of filteredGraph.nodes) {
      if (!sideById.has(node.id)) {
        sideById.set(node.id, "both");
      }
    }

    const bucket = {
      d1Incoming: [] as string[],
      d1Outgoing: [] as string[],
      d1Both: [] as string[],
      d2Incoming: [] as string[],
      d2Outgoing: [] as string[],
      d2Both: [] as string[]
    };

    for (const node of filteredGraph.nodes) {
      if (node.id === controlId) {
        continue;
      }
      const side = sideById.get(node.id) ?? "both";
      if (node.depth <= 1) {
        if (side === "incoming") bucket.d1Incoming.push(node.id);
        else if (side === "outgoing") bucket.d1Outgoing.push(node.id);
        else bucket.d1Both.push(node.id);
      } else {
        if (side === "incoming") bucket.d2Incoming.push(node.id);
        else if (side === "outgoing") bucket.d2Outgoing.push(node.id);
        else bucket.d2Both.push(node.id);
      }
    }

    const nodePos = new Map<string, { x: number; y: number }>();
    nodePos.set(controlId, { x: CENTER_X, y: CENTER_Y });

    for (const { id, angle } of withAngles(bucket.d1Incoming, 140, 220)) {
      nodePos.set(id, ellipsePoint(angle, 300, 145));
    }
    for (const { id, angle } of withAngles(bucket.d1Outgoing, -40, 40)) {
      nodePos.set(id, ellipsePoint(angle, 300, 145));
    }
    for (const { id, angle } of withAngles(bucket.d1Both, 230, 310)) {
      nodePos.set(id, ellipsePoint(angle, 250, 170));
    }

    for (const { id, angle } of withAngles(bucket.d2Incoming, 120, 240)) {
      nodePos.set(id, ellipsePoint(angle, 410, 185));
    }
    for (const { id, angle } of withAngles(bucket.d2Outgoing, -60, 60)) {
      nodePos.set(id, ellipsePoint(angle, 410, 185));
    }
    for (const { id, angle } of withAngles(bucket.d2Both, 250, 330)) {
      nodePos.set(id, ellipsePoint(angle, 380, 200));
    }

    const relTypeByNode = new Map<string, Set<string>>();
    for (const edge of filteredGraph.edges) {
      if (!relTypeByNode.has(edge.sourceControlId)) relTypeByNode.set(edge.sourceControlId, new Set());
      if (!relTypeByNode.has(edge.targetControlId)) relTypeByNode.set(edge.targetControlId, new Set());
      relTypeByNode.get(edge.sourceControlId)!.add(edge.relType);
      relTypeByNode.get(edge.targetControlId)!.add(edge.relType);
    }

    return {
      nodePos,
      relTypeByNode,
      nodesById: new Map(filteredGraph.nodes.map((node) => [node.id, node])),
      edges: filteredGraph.edges
    };
  }, [filteredGraph, controlId]);

  const minZoom = 0.7;
  const maxZoom = 2.6;

  function zoomStep(delta: number) {
    setZoom((prev) => Math.max(minZoom, Math.min(maxZoom, Number((prev + delta).toFixed(2)))));
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const next = event.deltaY < 0 ? 0.12 : -0.12;
    zoomStep(next);
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    dragRef.current = { ...dragRef.current, x: event.clientX, y: event.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (!graph) {
    return <p className="relation-empty">Keine Graphdaten verfügbar.</p>;
  }

  if (!filteredGraph || filteredGraph.edges.length === 0) {
    return <p className="relation-empty">Keine Relationen für den gewählten Filter.</p>;
  }

  return (
    <figure className="relation-graph" aria-label="Relationsgraph">
      <div className="relation-graph-toolbar">
        <span>
          {filteredGraph.nodes.length} Knoten / {filteredGraph.edges.length} Kanten
        </span>
        <div className="relation-graph-zoom-controls">
          <button type="button" className="secondary" onClick={() => zoomStep(-0.12)}>
            -
          </button>
          <button type="button" className="secondary" onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="secondary" onClick={() => zoomStep(0.12)}>
            +
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }}
          >
            Reset View
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Relationen von ${controlId}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <marker id="arrow-related" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <polygon points="0,0 8,4 0,8" fill="#0b7285" />
          </marker>
          <marker id="arrow-required" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <polygon points="0,0 8,4 0,8" fill="#b45309" />
          </marker>
        </defs>

        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />

        <g transform={`translate(${CENTER_X + pan.x} ${CENTER_Y + pan.y}) scale(${zoom}) translate(${-CENTER_X} ${-CENTER_Y})`}>
          {layout?.edges.map((edge, index) => {
            const source = layout.nodePos.get(edge.sourceControlId);
            const target = layout.nodePos.get(edge.targetControlId);
            if (!source || !target) {
              return null;
            }

            const markerId = edge.relType === "required" ? "arrow-required" : "arrow-related";
            return (
              <line
                key={`${edge.sourceControlId}-${edge.targetControlId}-${edge.relType}-${index}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={edgeColor(edge)}
                strokeWidth={edge.depth === 1 ? 2.6 : 1.9}
                strokeDasharray={edge.direction === "incoming" ? "6 4" : "0"}
                markerEnd={`url(#${markerId})`}
                opacity={edge.depth === 1 ? 0.95 : 0.7}
              />
            );
          })}

          <circle cx={CENTER_X} cy={CENTER_Y} r="41" fill="#0f172a" />
          <text x={CENTER_X} y={CENTER_Y - 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">
            {controlId}
          </text>
          <text x={CENTER_X} y={CENTER_Y + 14} textAnchor="middle" fill="#cbd5e1" fontSize="10">
            Fokus
          </text>

          {layout
            ? Array.from(layout.nodePos.entries())
                .filter(([id]) => id !== controlId)
                .map(([id, pos]) => {
                  const relTypes = layout.relTypeByNode.get(id) ?? new Set<string>();
                  const node = layout.nodesById.get(id);
                  const depth = node?.depth ?? 1;
                  const radius = depth === 1 ? 24 : 20;

                  return (
                    <g key={`node-${id}`} className="graph-node" onClick={() => onNodeClick(id)}>
                      <circle cx={pos.x} cy={pos.y} r={radius} fill="#ffffff" stroke={nodeStrokeColor(relTypes)} strokeWidth="2.2" />
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize={depth === 1 ? "10.4" : "9.4"}
                        fontWeight="600"
                      >
                        {id}
                      </text>
                    </g>
                  );
                })
            : null}
        </g>
      </svg>

      <figcaption>
        <span>
          <strong>Legende:</strong> Durchgezogen = ausgehend, gestrichelt = eingehend, dick = 1-Hop, dünn = 2-Hop.
        </span>
      </figcaption>
    </figure>
  );
}
