import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchClient } from "./searchClient";
import { defaultFilters } from "./routing";
import type { SearchResponse } from "../types";

type WorkerEventType = "message" | "error" | "messageerror";

class MockWorker {
  static instances: MockWorker[] = [];

  messages: Array<{ type: string; requestId: string; payload?: unknown }> = [];
  terminated = false;
  throwOnPostMessage: Error | null = null;

  private listeners: Record<WorkerEventType, Array<(event: any) => void>> = {
    message: [],
    error: [],
    messageerror: []
  };

  constructor(_scriptUrl: URL, _options?: WorkerOptions) {
    MockWorker.instances.push(this);
  }

  addEventListener(type: WorkerEventType, listener: (event: any) => void) {
    this.listeners[type].push(listener);
  }

  removeEventListener(type: WorkerEventType, listener: (event: any) => void) {
    this.listeners[type] = this.listeners[type].filter((current) => current !== listener);
  }

  postMessage(message: { type: string; requestId: string; payload?: unknown }) {
    if (this.throwOnPostMessage) {
      throw this.throwOnPostMessage;
    }
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emitResponse(data: { requestId: string; ok: boolean; data?: unknown; error?: string }) {
    for (const listener of this.listeners.message) {
      listener({
        data: {
          type: "response",
          ...data
        }
      });
    }
  }

  emitRawMessage(data: unknown) {
    for (const listener of this.listeners.message) {
      listener({ data });
    }
  }

  emitMessageError() {
    for (const listener of this.listeners.messageerror) {
      listener({});
    }
  }

  emitError(message: string) {
    for (const listener of this.listeners.error) {
      listener({ message });
    }
  }
}

function createSearchResponse(total = 1): SearchResponse {
  return {
    total,
    items: [
      {
        id: `APP.${total}`,
        title: "Test Control",
        score: 1,
        topGroupId: "APP",
        groupId: "APP.1",
        class: null,
        secLevel: "hoch",
        effortLevel: "2",
        modalverbs: ["SOLL"],
        targetObjects: [],
        tags: ["netzwerk"],
        snippet: "Test Control",
        breadcrumbs: ["APP", "APP.1"]
      }
    ],
    facets: {
      topGroupId: [{ value: "APP", count: total }],
      secLevel: [{ value: "hoch", count: total }],
      effortLevel: [{ value: "2", count: total }],
      class: [],
      modalverbs: [{ value: "SOLL", count: total }],
      targetObjects: [],
      tags: [{ value: "netzwerk", count: total }],
      relationTypes: []
    },
    elapsedMs: 4
  };
}

function getWorkerInstance(): MockWorker {
  const instance = MockWorker.instances[0];
  if (!instance) {
    throw new Error("MockWorker instance missing.");
  }
  return instance;
}

const originalWindow = globalThis.window;
const originalWorker = globalThis.Worker;

beforeEach(() => {
  MockWorker.instances = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: globalThis
  });
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    writable: true,
    value: MockWorker
  });
});

afterEach(() => {
  vi.useRealTimers();
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: originalWindow
    });
  }
  if (originalWorker === undefined) {
    Reflect.deleteProperty(globalThis, "Worker");
  } else {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      writable: true,
      value: originalWorker
    });
  }
});

describe("SearchClient", () => {
  it("resolves successful search responses from worker messages", async () => {
    const client = new SearchClient();
    const promise = client.search({
      text: "APP",
      sort: "relevance",
      filters: defaultFilters()
    });

    const worker = getWorkerInstance();
    const searchMessage = worker.messages.find((message) => message.type === "search");
    expect(searchMessage).toBeDefined();
    if (!searchMessage) {
      throw new Error("Expected search message to be sent.");
    }

    const payload = createSearchResponse(1);
    worker.emitResponse({
      requestId: searchMessage.requestId,
      ok: true,
      data: payload
    });

    await expect(promise).resolves.toEqual(payload);
    client.destroy();
  });

  it("cancels the previous search when a new search starts", async () => {
    const client = new SearchClient();
    const firstPromise = client
      .search({
        text: "erste suche",
        sort: "relevance",
        filters: defaultFilters()
      })
      .catch((error) => error as Error);

    const worker = getWorkerInstance();
    const firstSearchMessage = worker.messages.find((message) => message.type === "search");
    expect(firstSearchMessage).toBeDefined();
    if (!firstSearchMessage) {
      throw new Error("Expected first search message.");
    }

    const secondPromise = client.search({
      text: "zweite suche",
      sort: "id-asc",
      filters: defaultFilters()
    });

    const cancelMessage = worker.messages.find((message) => message.type === "cancel");
    expect(cancelMessage).toEqual({
      type: "cancel",
      requestId: firstSearchMessage.requestId
    });

    const firstError = await firstPromise;
    expect(firstError).toBeInstanceOf(Error);
    if (!(firstError instanceof Error)) {
      throw new Error("Expected cancelled search to reject with Error.");
    }
    expect(firstError.message).toBe("Vorherige Anfrage wurde abgebrochen.");

    const searchMessages = worker.messages.filter((message) => message.type === "search");
    const secondSearchMessage = searchMessages[1];
    expect(secondSearchMessage).toBeDefined();
    if (!secondSearchMessage) {
      throw new Error("Expected second search message.");
    }

    const secondPayload = createSearchResponse(2);
    worker.emitResponse({
      requestId: secondSearchMessage.requestId,
      ok: true,
      data: secondPayload
    });

    await expect(secondPromise).resolves.toEqual(secondPayload);
    client.destroy();
  });

  it("rejects pending requests on worker messageerror", async () => {
    const client = new SearchClient();
    const promise = client.getControl("APP.1", "APP");
    const worker = getWorkerInstance();
    worker.emitMessageError();

    await expect(promise).rejects.toThrow("Ungueltige Worker-Nachricht erhalten.");
    client.destroy();
  });

  it("rejects pending requests on worker runtime error", async () => {
    const client = new SearchClient();
    const promise = client.init("./data/catalog-index.json", "./data/details");
    const worker = getWorkerInstance();
    worker.emitError("worker crashed");

    await expect(promise).rejects.toThrow("worker crashed");
    client.destroy();
  });

  it("rejects requests when worker returns an explicit error response", async () => {
    const client = new SearchClient();
    const promise = client.getControl("APP.1", "APP");
    const worker = getWorkerInstance();
    const request = worker.messages.find((message) => message.type === "get-control");
    expect(request).toBeDefined();
    if (!request) {
      throw new Error("Expected get-control request.");
    }

    worker.emitResponse({
      requestId: request.requestId,
      ok: false,
      error: "Control konnte nicht geladen werden."
    });

    await expect(promise).rejects.toThrow("Control konnte nicht geladen werden.");
    client.destroy();
  });

  it("ignores non-response worker messages and resolves on the matching response", async () => {
    const client = new SearchClient();
    const promise = client.search({
      text: "APP",
      sort: "relevance",
      filters: defaultFilters()
    });
    const worker = getWorkerInstance();
    const request = worker.messages.find((message) => message.type === "search");
    expect(request).toBeDefined();
    if (!request) {
      throw new Error("Expected search request.");
    }

    worker.emitRawMessage({
      type: "progress",
      requestId: request.requestId,
      percent: 50
    });
    worker.emitResponse({
      requestId: request.requestId,
      ok: true,
      data: createSearchResponse(3)
    });

    await expect(promise).resolves.toEqual(createSearchResponse(3));
    client.destroy();
  });

  it("rejects timed out worker requests", async () => {
    vi.useFakeTimers();

    const client = new SearchClient();
    const promise = client.getNeighborhood("APP.1", 1).catch((error) => error as Error);
    await vi.advanceTimersByTimeAsync(15000);

    const timeoutError = await promise;
    expect(timeoutError).toBeInstanceOf(Error);
    if (!(timeoutError instanceof Error)) {
      throw new Error("Expected timeout to reject with Error.");
    }
    expect(timeoutError.message).toBe("Worker-Timeout bei 'get-neighborhood' nach 15000ms.");
    client.destroy();
  });

  it("rejects when worker postMessage throws synchronously", async () => {
    const client = new SearchClient();
    const worker = getWorkerInstance();
    worker.throwOnPostMessage = new Error("post failed");

    await expect(
      client.search({
        text: "APP",
        sort: "relevance",
        filters: defaultFilters()
      })
    ).rejects.toThrow("post failed");

    client.destroy();
  });

  it("rejects pending requests and terminates worker on destroy", async () => {
    const client = new SearchClient();
    const promise = client.search({
      text: "offen",
      sort: "relevance",
      filters: defaultFilters()
    });

    const worker = getWorkerInstance();
    client.destroy();

    await expect(promise).rejects.toThrow("Worker wurde beendet.");
    expect(worker.terminated).toBe(true);
  });
});
