export interface LegalPlaceholders {
  operatorName: string;
  operatorAddressLine1: string;
  operatorAddressLine2: string;
  operatorEmail: string;
  hostingProviderName: string;
  hostingProviderContact: string;
  projectRepoUrl: string;
  lastUpdatedDate: string;
}

export const LEGAL_PLACEHOLDERS: LegalPlaceholders = {
  operatorName: "{{OPERATOR_NAME}}",
  operatorAddressLine1: "{{OPERATOR_ADDRESS_LINE1}}",
  operatorAddressLine2: "{{OPERATOR_ADDRESS_LINE2}}",
  operatorEmail: "{{OPERATOR_EMAIL}}",
  hostingProviderName: "{{HOSTING_PROVIDER_NAME}}",
  hostingProviderContact: "{{HOSTING_PROVIDER_CONTACT}}",
  projectRepoUrl: "{{PROJECT_REPO_URL}}",
  lastUpdatedDate: "{{LAST_UPDATED_DATE}}"
};

export function isPlaceholderValue(value: string): boolean {
  return value.includes("{{") && value.includes("}}");
}
