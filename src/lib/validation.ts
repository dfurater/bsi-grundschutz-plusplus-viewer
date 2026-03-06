import { type ZodType, z } from "zod";

function describePath(path: ReadonlyArray<PropertyKey>): string {
  if (!path.length) {
    return "<root>";
  }
  return path
    .map((segment) => {
      if (typeof segment === "number") {
        return `[${segment}]`;
      }
      if (typeof segment === "symbol") {
        return segment.description ? `[symbol:${segment.description}]` : "[symbol]";
      }
      return segment;
    })
    .join(".")
    .replace(/\.\[/g, "[");
}

function summarizeIssues(error: z.ZodError): string {
  const issuePreview = error.issues.slice(0, 5).map((issue) => `${describePath(issue.path)}: ${issue.message}`);
  const suffix = error.issues.length > 5 ? ` (+${error.issues.length - 5} weitere)` : "";
  return `${issuePreview.join("; ")}${suffix}`;
}

export function validateOrThrow<T>(payload: unknown, schema: ZodType<T>, context: string): T {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  throw new Error(`${context} ist ungueltig: ${summarizeIssues(result.error)}`);
}

export function parseJsonOrThrow(text: string, context: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 140).replace(/\s+/g, " ");
    throw new Error(`${context} ist kein gueltiges JSON. Antwortbeginn: ${snippet}`);
  }
}

export function assertByteBudget(text: string, maxBytes: number, context: string) {
  const size = new TextEncoder().encode(text).byteLength;
  if (size > maxBytes) {
    throw new Error(`${context} ueberschreitet Groessenbudget (${size} > ${maxBytes} Bytes).`);
  }
}
