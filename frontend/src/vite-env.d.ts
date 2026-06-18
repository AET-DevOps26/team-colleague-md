/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_USER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
