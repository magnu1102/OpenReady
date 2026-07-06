/// <reference types="vite/client" />

// Injected at build time from package.json#version via `define` in
// vite.config.ts (the vitest config shares the same define).
declare const __APP_VERSION__: string;
