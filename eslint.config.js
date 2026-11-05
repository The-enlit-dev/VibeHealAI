// ESLint flat config. Import restrictions enforce the architecture boundaries
// described in docs/planning/ARCHITECTURE.md: the renderer can never import
// backend or main-process code, so backend secrets cannot reach the bundle.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

const noServer = { group: ["**/server/**", "**/server"], message: "Backend code must not be imported here (CR-1, CR-6)." };
const noDesktop = { group: ["**/desktop/**"], message: "Desktop code must not be imported here." };
const noMain = { group: ["**/main/**"], message: "The renderer must not import main-process code (WN-3)." };

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**", ".vibeheal-data/**", ".brixo-data/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "error",
      eqeqeq: "error",
    },
  },
  {
    files: ["shared/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [noServer, noDesktop] }] },
  },
  {
    files: ["server/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [noDesktop] }] },
  },
  {
    files: ["desktop/**/*.{ts,tsx,cts}"],
    rules: { "no-restricted-imports": ["error", { patterns: [noServer] }] },
  },
  {
    files: ["desktop/renderer/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    rules: { "no-restricted-imports": ["error", { patterns: [noServer, noMain] }] },
  },
  {
    // The sandboxed preload is CommonJS; `import x = require()` is the correct form there.
    files: ["desktop/preload/**/*.cts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
);
