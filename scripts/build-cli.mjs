#!/usr/bin/env node
import { build } from "esbuild";
import { mkdir, chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outFile = resolve(root, "dist-cli/openready.mjs");

await mkdir(dirname(outFile), { recursive: true });

await build({
  entryPoints: [resolve(root, "src/cli/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: outFile,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Mark the Tauri integration as external — the CLI runs outside the Tauri
  // runtime and the dynamic import is gated by `isTauriRuntime()`.
  external: ["@tauri-apps/api/core"],
  alias: {
    "@": resolve(root, "src"),
  },
  legalComments: "none",
  sourcemap: false,
  logLevel: "info",
});

await chmod(outFile, 0o755);
console.log(`built ${outFile}`);
