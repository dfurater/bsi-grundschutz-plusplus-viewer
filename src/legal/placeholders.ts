export interface LegalPlaceholders {
  operatorName: string;
  operatorAddressLine1: string;
  operatorAddressLine2: string;
  operatorEmail: string;
}

const OPERATOR_NAME_PLACEHOLDER = "{{OPERATOR_NAME}}";
const OPERATOR_ADDRESS_LINE1_PLACEHOLDER = "{{OPERATOR_ADDRESS_LINE1}}";
const OPERATOR_ADDRESS_LINE2_PLACEHOLDER = "{{OPERATOR_ADDRESS_LINE2}}";
const OPERATOR_EMAIL_PLACEHOLDER = "{{OPERATOR_EMAIL}}";

type LegalEnvKey =
  | "VITE_OPERATOR_NAME"
  | "VITE_OPERATOR_ADDRESS_LINE1"
  | "VITE_OPERATOR_ADDRESS_LINE2"
  | "VITE_OPERATOR_EMAIL";

function readLegalEnv(key: LegalEnvKey, fallback: string): string {
  const value = import.meta.env[key];
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

export const LEGAL_PLACEHOLDERS: LegalPlaceholders = {
  operatorName: readLegalEnv("VITE_OPERATOR_NAME", OPERATOR_NAME_PLACEHOLDER),
  operatorAddressLine1: readLegalEnv("VITE_OPERATOR_ADDRESS_LINE1", OPERATOR_ADDRESS_LINE1_PLACEHOLDER),
  operatorAddressLine2: readLegalEnv("VITE_OPERATOR_ADDRESS_LINE2", OPERATOR_ADDRESS_LINE2_PLACEHOLDER),
  operatorEmail: readLegalEnv("VITE_OPERATOR_EMAIL", OPERATOR_EMAIL_PLACEHOLDER)
};

export function isPlaceholderValue(value: string): boolean {
  return value.includes("{{") && value.includes("}}");
}
