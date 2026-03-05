/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPERATOR_NAME?: string;
  readonly VITE_OPERATOR_ADDRESS_LINE1?: string;
  readonly VITE_OPERATOR_ADDRESS_LINE2?: string;
  readonly VITE_OPERATOR_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
