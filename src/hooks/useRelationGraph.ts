import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchClient } from "../lib/searchClient";
import type { RelationGraphPayload } from "../types";
import { getErrorMessage } from "./appFlowUtils";

interface UseRelationGraphArgs {
  client: SearchClient;
  detailId: string | null;
}

export function useRelationGraph({ client, detailId }: UseRelationGraphArgs) {
  const [graphData, setGraphData] = useState<RelationGraphPayload | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [graphHops, setGraphHops] = useState<1 | 2>(1);
  const [graphFilter, setGraphFilter] = useState<"all" | "required" | "related">("all");

  const graphRequestCounter = useRef(0);

  const loadGraph = useCallback(
    async (controlId: string, hops: 1 | 2) => {
      const current = ++graphRequestCounter.current;
      setGraphLoading(true);
      setGraphError(null);

      try {
        const payload = await client.getNeighborhood(controlId, hops);
        if (current !== graphRequestCounter.current) {
          return;
        }
        setGraphData(payload);
      } catch (error) {
        if (current !== graphRequestCounter.current) {
          return;
        }
        setGraphData(null);
        setGraphError(getErrorMessage(error, "Graph konnte nicht geladen werden."));
      } finally {
        if (current === graphRequestCounter.current) {
          setGraphLoading(false);
        }
      }
    },
    [client]
  );

  const clearGraph = useCallback(() => {
    setGraphData(null);
  }, []);

  useEffect(() => {
    if (!detailId) {
      setGraphData(null);
      return;
    }
    void loadGraph(detailId, graphHops);
  }, [detailId, graphHops, loadGraph]);

  return {
    graphData,
    graphLoading,
    graphError,
    graphHops,
    graphFilter,
    setGraphHops,
    setGraphFilter,
    clearGraph
  };
}
