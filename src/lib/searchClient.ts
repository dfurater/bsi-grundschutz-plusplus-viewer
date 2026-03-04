import type { CatalogMeta, ControlDetail, RelationGraphPayload, SearchQuery, SearchResponse } from "../types";

type WorkerMessage = {
  type: "response";
  requestId: string;
  ok: boolean;
  data?: any;
  error?: string;
};

export class SearchClient {
  private worker: Worker;
  private activeSearchRequestId: string | null = null;
  private pending = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeoutId: number;
      type: string;
    }
  >();

  constructor() {
    this.worker = new Worker(new URL("../workers/searchWorker.ts", import.meta.url), {
      type: "module"
    });
    this.worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type !== "response") {
        return;
      }
      const pending = this.pending.get(message.requestId);
      if (!pending) {
        return;
      }
      this.pending.delete(message.requestId);
      if (this.activeSearchRequestId === message.requestId) {
        this.activeSearchRequestId = null;
      }
      window.clearTimeout(pending.timeoutId);
      if (!message.ok) {
        pending.reject(new Error(message.error || "Worker request failed"));
        return;
      }
      pending.resolve(message.data);
    });

    this.worker.addEventListener("error", (event) => {
      const message = event.message || "Worker konnte nicht geladen oder ausgefuehrt werden.";
      this.rejectAllPending(new Error(message));
    });

    this.worker.addEventListener("messageerror", () => {
      this.rejectAllPending(new Error("Ungueltige Worker-Nachricht erhalten."));
    });
  }

  private rejectAllPending(error: Error) {
    for (const [requestId, pending] of this.pending.entries()) {
      window.clearTimeout(pending.timeoutId);
      pending.reject(error);
      this.pending.delete(requestId);
    }
    this.activeSearchRequestId = null;
  }

  private request<T>(
    type: string,
    payload?: any,
    timeoutMs = 15000,
    options?: { cancelPreviousSearch?: boolean }
  ): Promise<T> {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return new Promise<T>((resolve, reject) => {
      if (type === "search" && options?.cancelPreviousSearch && this.activeSearchRequestId) {
        this.cancelRequest(this.activeSearchRequestId);
      }

      const timeoutId = window.setTimeout(() => {
        const stillPending = this.pending.get(requestId);
        if (!stillPending) {
          return;
        }
        this.pending.delete(requestId);
        if (this.activeSearchRequestId === requestId) {
          this.activeSearchRequestId = null;
        }
        stillPending.reject(new Error(`Worker-Timeout bei '${type}' nach ${timeoutMs}ms.`));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timeoutId, type });
      if (type === "search") {
        this.activeSearchRequestId = requestId;
      }
      try {
        this.worker.postMessage({ type, requestId, payload });
      } catch (error) {
        this.pending.delete(requestId);
        if (this.activeSearchRequestId === requestId) {
          this.activeSearchRequestId = null;
        }
        window.clearTimeout(timeoutId);
        reject(error instanceof Error ? error : new Error("Worker-Request konnte nicht gesendet werden."));
      }
    });
  }

  private cancelRequest(requestId: string) {
    const pending = this.pending.get(requestId);
    if (pending) {
      window.clearTimeout(pending.timeoutId);
      pending.reject(new Error("Vorherige Anfrage wurde abgebrochen."));
      this.pending.delete(requestId);
    }
    if (this.activeSearchRequestId === requestId) {
      this.activeSearchRequestId = null;
    }
    this.worker.postMessage({ type: "cancel", requestId });
  }

  init(indexUrl: string, detailBasePath: string) {
    return this.request<{ stats: CatalogMeta["stats"]; facetOptions: any }>(
      "init",
      {
        indexUrl,
        detailBasePath
      },
      30000
    );
  }

  search(query: SearchQuery) {
    return this.request<SearchResponse>("search", query, 10000, { cancelPreviousSearch: true });
  }

  getControl(id: string, topGroupId: string) {
    return this.request<ControlDetail>("get-control", { id, topGroupId }, 12000);
  }

  getNeighborhood(id: string, hops: 1 | 2) {
    return this.request<RelationGraphPayload>("get-neighborhood", { id, hops }, 15000);
  }

  loadUpload(rawText: string) {
    return this.request<{
      meta: Partial<CatalogMeta>;
      facetOptions: any;
      stats: CatalogMeta["stats"];
    }>("load-upload", { rawText }, 45000);
  }

  destroy() {
    this.rejectAllPending(new Error("Worker wurde beendet."));
    this.worker.terminate();
    this.pending.clear();
  }
}
