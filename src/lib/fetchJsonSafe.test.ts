import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fetchJsonWithValidation } from "./fetchJsonSafe";

const TEST_SCHEMA = z.object({
  ok: z.boolean()
});

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetchWithResponse(response: Response) {
  globalThis.fetch = vi.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

describe("fetchJsonWithValidation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("returns validated json for successful response", async () => {
    mockFetchWithResponse(
      new Response('{"ok":true}', {
        status: 200,
        headers: { "content-length": "11" }
      })
    );

    await expect(
      fetchJsonWithValidation({
        url: "/data/index.json",
        label: "Index",
        schema: TEST_SCHEMA,
        maxBytes: 100
      })
    ).resolves.toEqual({ ok: true });

    expect(globalThis.fetch).toHaveBeenCalledWith("/data/index.json");
  });

  it("fails closed on non-ok http status", async () => {
    mockFetchWithResponse(new Response("Service unavailable", { status: 503 }));

    await expect(
      fetchJsonWithValidation({
        url: "/data/index.json",
        label: "Index",
        schema: TEST_SCHEMA,
        maxBytes: 100
      })
    ).rejects.toThrowError(/Index konnte nicht geladen werden \(HTTP 503\)\. URL: \/data\/index\.json/);
  });

  it("rejects when content-length exceeds byte budget", async () => {
    mockFetchWithResponse(
      new Response('{"ok":true}', {
        status: 200,
        headers: { "content-length": "1000" }
      })
    );

    await expect(
      fetchJsonWithValidation({
        url: "/data/index.json",
        label: "Index",
        schema: TEST_SCHEMA,
        maxBytes: 100
      })
    ).rejects.toThrowError(/Index ist zu gross \(Content-Length 1000 > 100 Bytes\)\. URL: \/data\/index\.json/);
  });

  it("rejects invalid json payloads", async () => {
    mockFetchWithResponse(new Response("{ not-json", { status: 200 }));

    await expect(
      fetchJsonWithValidation({
        url: "/data/index.json",
        label: "Index",
        schema: TEST_SCHEMA,
        maxBytes: 100
      })
    ).rejects.toThrowError(/ist kein gueltiges JSON/);
  });

  it("rejects schema-invalid payloads", async () => {
    mockFetchWithResponse(new Response('{"ok":"yes"}', { status: 200 }));

    await expect(
      fetchJsonWithValidation({
        url: "/data/index.json",
        label: "Index",
        schema: TEST_SCHEMA,
        maxBytes: 100
      })
    ).rejects.toThrowError(/ist ungueltig/);
  });

  it("enforces byte budget even when content-length is missing", async () => {
    mockFetchWithResponse(new Response("0123456789ABCDEF", { status: 200 }));

    await expect(
      fetchJsonWithValidation({
        url: "/data/index.json",
        label: "Index",
        schema: TEST_SCHEMA,
        maxBytes: 8
      })
    ).rejects.toThrowError(/ueberschreitet Groessenbudget/);
  });
});
