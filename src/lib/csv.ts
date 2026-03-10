export interface CsvColumn<T> {
  key: keyof T;
  header: string;
}

export interface CsvOptions {
  delimiter?: string;
  lineEnding?: "\n" | "\r\n";
  withBom?: boolean;
}

const DANGEROUS_FORMULA_PREFIXES = new Set(["=", "+", "-", "@", "|"]);
const LEADING_IGNORED_CHARACTERS =
  /^[\u0000-\u001F\u007F\uFEFF\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]*/u;

function normalizeCell(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function neutralizeSpreadsheetFormula(value: string): string {
  if (!value) {
    return value;
  }

  // SEC-FIX: FINDING-001 — Neutralize spreadsheet formulas with leading whitespace/control chars and Unicode variants.
  if (value.startsWith("\t") || value.startsWith("\r")) {
    return `'${value}`;
  }

  const leadingStripped = value.replace(LEADING_IGNORED_CHARACTERS, "");
  if (!leadingStripped) {
    return value;
  }

  const normalized = leadingStripped.normalize("NFKC");
  if (normalized.startsWith("'")) {
    return value;
  }

  return DANGEROUS_FORMULA_PREFIXES.has(normalized[0]) ? `'${value}` : value;
}

function escapeCsvCell(value: string, delimiter: string): string {
  if (!value) {
    return "";
  }

  const needsQuotes = value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r");
  if (!needsQuotes) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<CsvColumn<T>>,
  options: CsvOptions = {}
): string {
  const delimiter = options.delimiter ?? ",";
  const lineEnding = options.lineEnding ?? "\r\n";
  const withBom = options.withBom ?? true;

  const headerRow = columns.map((column) => escapeCsvCell(column.header, delimiter)).join(delimiter);
  const dataRows = rows.map((row) =>
    columns
      .map((column) => {
        const rawValue = neutralizeSpreadsheetFormula(normalizeCell(row[column.key]));
        return escapeCsvCell(rawValue, delimiter);
      })
      .join(delimiter)
  );

  const csvText = [headerRow, ...dataRows].join(lineEnding);
  return withBom ? `\uFEFF${csvText}` : csvText;
}

export function downloadBlob(filename: string, blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
