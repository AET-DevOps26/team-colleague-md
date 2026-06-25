/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Enables the demo display layer (ADR-0011). Auth stays real; only data-sparse reads are mocked. */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
