/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COACH_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
