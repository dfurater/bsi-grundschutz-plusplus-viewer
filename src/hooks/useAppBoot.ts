import { useEffect, useState } from "react";
import { CatalogMetaSchema } from "../lib/dataSchemas";
import { fetchJsonWithValidation } from "../lib/fetchJsonSafe";
import type { SearchClient } from "../lib/searchClient";
import { SECURITY_BUDGETS } from "../lib/securityBudgets";
import type { CatalogMeta } from "../types";
import { getErrorDetails, getErrorMessage } from "./appFlowUtils";

export type BootState = "loading" | "ready" | "error";

function assetUrl(relativePath: string) {
  const hrefWithoutHash = window.location.href.split("#")[0];
  return new URL(relativePath, hrefWithoutHash).toString();
}

function getCatalogAssetPaths() {
  return {
    metaUrl: assetUrl("./data/catalog-meta.json"),
    indexUrl: assetUrl("./data/catalog-index.json"),
    detailsUrl: assetUrl("./data/details")
  };
}

export function useAppBoot(client: SearchClient) {
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [bootState, setBootState] = useState<BootState>("loading");
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootErrorDetails, setBootErrorDetails] = useState<string | null>(null);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatusText, setBootStatusText] = useState("Index wird aufgebaut und geladen…");
  const [effortSortEnabled, setEffortSortEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function initializeDataset() {
      const paths = getCatalogAssetPaths();

      setBootState("loading");
      setBootError(null);
      setBootErrorDetails(null);
      setBootProgress(8);
      setBootStatusText("Katalog wird vorbereitet…");

      const initPromise = client.init(paths.indexUrl, paths.detailsUrl);
      setBootProgress(24);
      setBootStatusText("Suchindex wird geladen…");

      const metaPromise = fetchJsonWithValidation({
        url: paths.metaUrl,
        label: "Datensatz-Metadaten",
        schema: CatalogMetaSchema,
        maxBytes: SECURITY_BUDGETS.maxRemoteJsonBytes.catalogMeta
      });

      setBootProgress(52);
      setBootStatusText("Metadaten werden gelesen…");

      const [initPayload, metaPayload] = (await Promise.all([initPromise, metaPromise])) as [
        { facetOptions: { effortLevel?: unknown[] } },
        CatalogMeta
      ];
      if (cancelled) {
        return;
      }

      setBootProgress(76);
      setBootStatusText("Suche wird initialisiert…");
      setBootProgress(92);
      setBootStatusText("Oberfläche wird aufgebaut…");
      setMeta(metaPayload);
      setEffortSortEnabled(
        Array.isArray(initPayload?.facetOptions?.effortLevel) && initPayload.facetOptions.effortLevel.length > 0
      );
      setBootProgress(100);
      setBootStatusText("Fertig");
      setBootState("ready");
    }

    async function boot() {
      try {
        setBootState("loading");
        setBootError(null);
        setBootErrorDetails(null);
        setBootProgress(4);
        setBootStatusText("Katalogdaten werden geladen…");

        if (cancelled) {
          return;
        }

        await initializeDataset();
      } catch (error) {
        if (cancelled) {
          return;
        }
        setBootState("error");
        setBootError(getErrorMessage(error, "Initialisierung fehlgeschlagen."));
        setBootErrorDetails(getErrorDetails(error));
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [client]);

  return {
    meta,
    bootState,
    bootError,
    bootErrorDetails,
    bootProgress,
    bootStatusText,
    effortSortEnabled
  };
}
