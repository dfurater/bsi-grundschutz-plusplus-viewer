import { useEffect, useMemo, useRef, useState } from "react";
import { defaultFilters, type AppRoute } from "../lib/routing";
import type { SearchClient } from "../lib/searchClient";
import type { CatalogMeta, SearchResultItem } from "../types";
import type { BootState } from "./useAppBoot";

interface UseGroupPageArgs {
  client: SearchClient;
  bootState: BootState;
  route: AppRoute;
  meta: CatalogMeta | null;
}

export function useGroupPage({ client, bootState, route, meta }: UseGroupPageArgs) {
  const [groupControls, setGroupControls] = useState<SearchResultItem[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);

  const groupRequestCounter = useRef(0);
  const routeGroupId = route.view === "group" ? route.groupId : null;

  useEffect(() => {
    if (bootState !== "ready") {
      groupRequestCounter.current += 1;
      setGroupLoading(false);
      return;
    }

    if (!routeGroupId || !meta) {
      groupRequestCounter.current += 1;
      setGroupLoading(false);
      return;
    }

    const group = meta.groups.find((item) => item.id === routeGroupId);
    if (!group) {
      groupRequestCounter.current += 1;
      setGroupControls([]);
      setGroupLoading(false);
      return;
    }

    const current = ++groupRequestCounter.current;
    const queryFilters = defaultFilters();
    queryFilters.topGroupId = [group.topGroupId];
    if (group.depth > 1) {
      queryFilters.groupId = [group.id];
    }

    setGroupLoading(true);
    client
      .search({
        text: "",
        sort: "id-asc",
        filters: queryFilters,
        limit: 1200,
        offset: 0
      })
      .then((response) => {
        if (current !== groupRequestCounter.current) {
          return;
        }
        setGroupControls(response.items);
      })
      .catch(() => {
        if (current !== groupRequestCounter.current) {
          return;
        }
        setGroupControls([]);
      })
      .finally(() => {
        if (current === groupRequestCounter.current) {
          setGroupLoading(false);
        }
      });
  }, [bootState, client, routeGroupId, meta]);

  const currentGroup =
    routeGroupId && meta ? meta.groups.find((group) => group.id === routeGroupId) ?? null : null;

  const currentSubgroups = useMemo(() => {
    if (route.view !== "group" || !meta || !currentGroup) {
      return [];
    }
    return meta.groups.filter((group) => group.parentGroupId === currentGroup.id);
  }, [route.view, meta, currentGroup]);

  return {
    groupControls,
    groupLoading,
    currentGroup,
    currentSubgroups
  };
}
