export interface LegalPlaceholders {
  operatorName: string;
  operatorAddressLine1: string;
  operatorAddressLine2: string;
  operatorEmail: string;
}

export const LEGAL_PLACEHOLDERS: LegalPlaceholders = {
  operatorName: "Deniz Furater",
  operatorAddressLine1: "Wiesenstraße 55, Haus 2",
  operatorAddressLine2: "13357 Berlin",
  operatorEmail: "fischotter-gebuesch.0y@icloud.com"
};

export function isPlaceholderValue(value: string): boolean {
  return value.includes("{{") && value.includes("}}");
}
