import { useEffect, useMemo, useState } from "react";
import { CONTROL_EXPORT_COLUMNS, extractControlExportRow } from "../lib/controlExport";
import { downloadBlob, toCsv } from "../lib/csv";
import { defaultFilters, type AppRoute } from "../lib/routing";
import { sanitizeSearchText } from "../lib/searchSafety";
import type { SearchClient } from "../lib/searchClient";
import { SECURITY_BUDGETS } from "../lib/securityBudgets";
import type { CatalogMeta, SearchQuery, SearchResultItem } from "../types";
import { getErrorMessage, mapRouteFilters } from "./appFlowUtils";
import type { BootState } from "./useAppBoot";

interface UseCsvExportArgs {
  client: SearchClient;
  meta: CatalogMeta | null;
  bootState: BootState;
  route: AppRoute;
  resolveTopGroupId: (controlId: string) => Promise<string | null>;
}

type SelectAllScope = "home" | "group" | "search" | null;

export function useCsvExport({ client, meta, bootState, route, resolveTopGroupId }: UseCsvExportArgs) {
  const [selectedControlTopGroups, setSelectedControlTopGroups] = useState<Record<string, string>>({});
  const [exportCsvMessage, setExportCsvMessage] = useState<string | null>(null);
  const [exportCsvRunning, setExportCsvRunning] = useState(false);
  const [selectAllRunningScope, setSelectAllRunningScope] = useState<SelectAllScope>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"info" | "success" | "error">("info");

  const selectedControlIds = useMemo(() => new Set(Object.keys(selectedControlTopGroups)), [selectedControlTopGroups]);
  const selectedControlCount = selectedControlIds.size;

  function handleToggleControlSelection(item: SearchResultItem, selected: boolean) {
    setSelectedControlTopGroups((prev) => {
      if (selected) {
        if (prev[item.id] === item.topGroupId) {
          return prev;
        }
        return {
          ...prev,
          [item.id]: item.topGroupId
        };
      }

      if (!prev[item.id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  }

  async function fetchAllMatchingControls(baseQuery: Omit<SearchQuery, "limit" | "offset">): Promise<SearchResultItem[]> {
    const limit = 1200;
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    const byId = new Map<string, SearchResultItem>();

    while (offset < total && offset < SECURITY_BUDGETS.maxControlCount) {
      const response = await client.search({
        ...baseQuery,
        limit,
        offset
      });

      total = response.total;
      for (const item of response.items) {
        byId.set(item.id, item);
      }

      if (!response.items.length) {
        break;
      }
      offset += response.items.length;
    }

    return Array.from(byId.values());
  }

  function toggleSelectionForItems(items: SearchResultItem[]): "selected" | "deselected" | "none" {
    if (!items.length) {
      return "none";
    }

    const allAlreadySelected = items.every((item) => selectedControlIds.has(item.id));
    setSelectedControlTopGroups((prev) => {
      const next = { ...prev };
      if (allAlreadySelected) {
        for (const item of items) {
          delete next[item.id];
        }
        return next;
      }

      for (const item of items) {
        next[item.id] = item.topGroupId;
      }
      return next;
    });

    return allAlreadySelected ? "deselected" : "selected";
  }

  async function handleSelectAllHomeControls() {
    if (selectAllRunningScope || bootState !== "ready") {
      return;
    }
    setSelectAllRunningScope("home");
    try {
      const items = await fetchAllMatchingControls({
        text: "",
        sort: "id-asc",
        filters: defaultFilters()
      });
      const action = toggleSelectionForItems(items);
      if (action === "none") {
        setExportCsvMessage("Keine Controls gefunden.");
      } else if (action === "selected") {
        setExportCsvMessage(`${items.length} Controls zur CSV-Auswahl hinzugefuegt.`);
      } else {
        setExportCsvMessage(`${items.length} Controls aus der CSV-Auswahl entfernt.`);
      }
    } catch (error) {
      setExportCsvMessage(getErrorMessage(error, "Alles auswählen fehlgeschlagen."));
    } finally {
      setSelectAllRunningScope(null);
    }
  }

  async function handleSelectAllGroupControls() {
    if (selectAllRunningScope || route.view !== "group" || !meta) {
      return;
    }

    const group = meta.groups.find((item) => item.id === route.groupId);
    if (!group) {
      return;
    }

    const queryFilters = defaultFilters();
    queryFilters.topGroupId = [group.topGroupId];
    if (group.depth > 1) {
      queryFilters.groupId = [group.id];
    }

    setSelectAllRunningScope("group");
    try {
      const items = await fetchAllMatchingControls({
        text: "",
        sort: "id-asc",
        filters: queryFilters
      });
      const action = toggleSelectionForItems(items);
      if (action === "none") {
        setExportCsvMessage("Keine Gruppen-Controls gefunden.");
      } else if (action === "selected") {
        setExportCsvMessage(`${items.length} Gruppen-Controls zur CSV-Auswahl hinzugefuegt.`);
      } else {
        setExportCsvMessage(`${items.length} Gruppen-Controls aus der CSV-Auswahl entfernt.`);
      }
    } catch (error) {
      setExportCsvMessage(getErrorMessage(error, "Alles auswählen in Gruppe fehlgeschlagen."));
    } finally {
      setSelectAllRunningScope(null);
    }
  }

  async function handleSelectAllSearchControls() {
    if (selectAllRunningScope || route.view !== "search") {
      return;
    }

    setSelectAllRunningScope("search");
    try {
      const items = await fetchAllMatchingControls({
        text: sanitizeSearchText(route.query),
        sort: route.sort,
        filters: mapRouteFilters(route.filters)
      });
      const action = toggleSelectionForItems(items);
      if (action === "none") {
        setExportCsvMessage("Keine Suchtreffer gefunden.");
      } else if (action === "selected") {
        setExportCsvMessage(`${items.length} Suchtreffer zur CSV-Auswahl hinzugefuegt.`);
      } else {
        setExportCsvMessage(`${items.length} Suchtreffer aus der CSV-Auswahl entfernt.`);
      }
    } catch (error) {
      setExportCsvMessage(getErrorMessage(error, "Alles auswählen in Suche fehlgeschlagen."));
    } finally {
      setSelectAllRunningScope(null);
    }
  }

  async function handleExportCsv() {
    if (!meta || exportCsvRunning) {
      return;
    }
    const selectedEntries = Object.entries(selectedControlTopGroups);
    if (selectedEntries.length === 0) {
      return;
    }

    setExportCsvRunning(true);
    setExportCsvMessage(null);
    try {
      const rows = [];
      for (let index = 0; index < selectedEntries.length; index += 1) {
        const [controlId, knownTopGroupId] = selectedEntries[index];
        const resolvedTopGroupId = knownTopGroupId || (await resolveTopGroupId(controlId));
        if (!resolvedTopGroupId) {
          throw new Error(`Top-Gruppe für ${controlId} konnte nicht aufgelöst werden.`);
        }

        const detailPayload = await client.getControl(controlId, resolvedTopGroupId);
        rows.push(
          extractControlExportRow(detailPayload, {
            sourceVersion: meta.version,
            sourceLastModified: meta.lastModified
          })
        );

        if (index > 0 && index % 25 === 0) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
          });
        }
      }

      const csvText = toCsv(rows, CONTROL_EXPORT_COLUMNS, {
        delimiter: ";",
        lineEnding: "\r\n",
        withBom: true
      });
      const now = new Date().toISOString().slice(0, 10);
      const filename = `grundschutz-controls_${now}_${rows.length}.csv`;
      const csvBlob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      downloadBlob(filename, csvBlob);
      setSelectedControlTopGroups({});
      setExportCsvMessage(`CSV erfolgreich exportiert (${rows.length} Controls).`);
      setToastTone("success");
      setToastMessage(`CSV erfolgreich exportiert (${rows.length}).`);
    } catch (error) {
      setExportCsvMessage(getErrorMessage(error, "CSV-Export fehlgeschlagen."));
      setToastTone("error");
      setToastMessage("CSV-Export fehlgeschlagen.");
    } finally {
      setExportCsvRunning(false);
    }
  }

  useEffect(() => {
    if (!exportCsvMessage) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setExportCsvMessage(null);
    }, 4800);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [exportCsvMessage]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [toastMessage]);

  return {
    selectedControlIds,
    selectedControlCount,
    exportCsvMessage,
    exportCsvRunning,
    selectAllRunningScope,
    toastMessage,
    toastTone,
    handleToggleControlSelection,
    handleSelectAllHomeControls,
    handleSelectAllGroupControls,
    handleSelectAllSearchControls,
    handleExportCsv
  };
}
