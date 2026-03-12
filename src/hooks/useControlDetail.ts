import { useCallback, useEffect, useState } from "react";
import type { AppRoute } from "../lib/routing";
import { defaultFilters } from "../lib/routing";
import type { SearchClient } from "../lib/searchClient";
import type { ControlDetail } from "../types";
import { getErrorMessage } from "./appFlowUtils";
import type { BootState } from "./useAppBoot";

interface UseControlDetailArgs {
  client: SearchClient;
  bootState: BootState;
  route: AppRoute;
}

export function useControlDetail({ client, bootState, route }: UseControlDetailArgs) {
  const [detail, setDetail] = useState<ControlDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const resolveTopGroupId = useCallback(
    async (controlId: string): Promise<string | null> => {
      const response = await client.search({
        text: controlId,
        sort: "relevance",
        filters: defaultFilters(),
        limit: 8,
        offset: 0
      });

      const exact = response.items.find((item) => item.id.toLowerCase() === controlId.toLowerCase());
      return exact?.topGroupId ?? response.items[0]?.topGroupId ?? null;
    },
    [client]
  );

  const loadControl = useCallback(
    async (controlId: string, topGroupId: string | null) => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const resolvedTopGroupId = topGroupId ?? (await resolveTopGroupId(controlId));
        if (!resolvedTopGroupId) {
          throw new Error(`Top-Gruppe für ${controlId} konnte nicht bestimmt werden.`);
        }

        const payload = await client.getControl(controlId, resolvedTopGroupId);
        setDetail(payload);
      } catch (error) {
        setDetail(null);
        setDetailError(getErrorMessage(error, "Control konnte nicht geladen werden."));
      } finally {
        setDetailLoading(false);
      }
    },
    [client, resolveTopGroupId]
  );

  const clearDetail = useCallback(() => {
    setDetail(null);
  }, []);

  useEffect(() => {
    if (bootState !== "ready" || route.view !== "control") {
      return;
    }
    void loadControl(route.controlId, route.topGroupId);
  }, [bootState, route, loadControl]);

  return {
    detail,
    detailLoading,
    detailError,
    resolveTopGroupId,
    loadControl,
    clearDetail
  };
}
