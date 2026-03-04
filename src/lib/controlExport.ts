import { safeExternalUrl } from "./urlSafety";
import type { ControlDetail } from "../types";

export interface ControlExportRow {
  control_id: string;
  control_title: string;
  group_path: string;
  class: string;
  sec_level: string;
  effort_level: string;
  modalverb: string;
  handlungsworte: string;
  tags: string;
  statement: string;
  guidance: string;
  params: string;
  links: string;
  source_version: string;
  source_last_modified: string;
}

export interface ControlExportContext {
  sourceVersion: string | null;
  sourceLastModified: string | null;
}

export const CONTROL_EXPORT_COLUMNS: Array<{ key: keyof ControlExportRow; header: string }> = [
  { key: "control_id", header: "control_id" },
  { key: "control_title", header: "control_title" },
  { key: "group_path", header: "group_path" },
  { key: "class", header: "class" },
  { key: "sec_level", header: "sec_level" },
  { key: "effort_level", header: "effort_level" },
  { key: "modalverb", header: "modalverb" },
  { key: "handlungsworte", header: "handlungsworte" },
  { key: "tags", header: "tags" },
  { key: "statement", header: "statement" },
  { key: "guidance", header: "guidance" },
  { key: "params", header: "params" },
  { key: "links", header: "links" },
  { key: "source_version", header: "source_version" },
  { key: "source_last_modified", header: "source_last_modified" }
];

function cleanText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function propValues(detail: ControlDetail, keys: string[]): string[] {
  const values = keys.flatMap((key) => detail.propsMap[key] ?? []);
  return values.map((value) => cleanText(value)).filter(Boolean);
}

function joinUnique(values: string[]): string {
  return Array.from(new Set(values.filter(Boolean))).join("; ");
}

function mapParams(detail: ControlDetail): string {
  const parts = detail.params
    .map((param) => {
      const id = cleanText(param.id);
      const label = cleanText(param.label);
      const values = param.values.map((value) => cleanText(value)).filter(Boolean).join("|");
      const idAndLabel = [id, label].filter(Boolean).join(":");
      if (!idAndLabel && !values) {
        return "";
      }
      return values ? `${idAndLabel}=${values}` : idAndLabel;
    })
    .filter(Boolean);

  return parts.join("; ");
}

function mapLinks(detail: ControlDetail): string {
  return joinUnique(
    detail.links
      .map((link) => safeExternalUrl(link.href))
      .filter((value): value is string => Boolean(value))
  );
}

export function extractControlExportRow(control: ControlDetail, context: ControlExportContext): ControlExportRow {
  const modalverbs = control.modalverbs.map((value) => cleanText(value)).filter(Boolean);
  const handlungsworteFromProps = propValues(control, ["handlungsworte", "handlungswort", "handlungswoerter"]);

  return {
    control_id: control.id,
    control_title: cleanText(control.title),
    group_path: control.groupPathTitles.map((value) => cleanText(value)).filter(Boolean).join(" > "),
    class: cleanText(control.class),
    sec_level: cleanText(control.secLevel),
    effort_level: cleanText(control.effortLevel),
    modalverb: joinUnique(modalverbs),
    handlungsworte: joinUnique(handlungsworteFromProps.length ? handlungsworteFromProps : modalverbs),
    tags: joinUnique(control.tags.map((value) => cleanText(value))),
    statement: cleanText(control.statementText),
    guidance: cleanText(control.guidanceText),
    params: mapParams(control),
    links: mapLinks(control),
    source_version: cleanText(context.sourceVersion),
    source_last_modified: cleanText(context.sourceLastModified)
  };
}
