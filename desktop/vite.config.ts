import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

// Builds only the renderer. JSX is compiled by Vite's built-in esbuild transform,
// so no extra React plugin is needed. Relative base: the app loads from file://.
export default defineConfig({
  root: path.join(here, "renderer"),
  base: "./",
  envPrefix: "BRIXO_PUBLIC_",
  esbuild: { jsx: "automatic" },
  build: {
    outDir: path.join(here, "..", "dist", "desktop", "renderer"),
    emptyOutDir: true,
    sourcemap: false,
    target: "chrome130",
    modulePreload: { polyfill: false },
  },
});
