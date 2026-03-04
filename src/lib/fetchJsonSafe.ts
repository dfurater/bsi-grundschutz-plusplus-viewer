import type { ZodType } from "zod";
import { assertByteBudget, parseJsonOrThrow, validateOrThrow } from "./validation";

interface FetchJsonOptions<T> {
  url: string;
  label: string;
  schema: ZodType<T>;
  maxBytes: number;
}

export async function fetchJsonWithValidation<T>({ url, label, schema, maxBytes }: FetchJsonOptions<T>): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label} konnte nicht geladen werden (HTTP ${response.status}). URL: ${url}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 0 && contentLength > maxBytes) {
    throw new Error(`${label} ist zu gross (Content-Length ${contentLength} > ${maxBytes} Bytes). URL: ${url}`);
  }

  const text = await response.text();
  assertByteBudget(text, maxBytes, `${label} (${url})`);
  const parsed = parseJsonOrThrow(text, `${label} (${url})`);
  return validateOrThrow(parsed, schema, `${label} (${url})`);
}
