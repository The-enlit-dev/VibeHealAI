#!/usr/bin/env node
// Builds the browser copy of the error explainer (shared/explainer/*.ts) into website/fix-core/*.js.
// No dependencies: Node's built-in stripTypeScriptTypes removes the types and keeps the code as written,
// so the page runs exactly the code that the unit tests exercise. Imports already use ".js" specifiers.
//
// Usage:
//   node scripts/build-fix-core.mjs           write website/fix-core/
//   node scripts/build-fix-core.mjs --check   fail if the committed files are out of date

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "shared", "explainer");
const outDir = path.join(root, "website", "fix-core");

const HEADER = "// Generated from shared/explainer/ by scripts/build-fix-core.mjs. Do not edit by hand.\n";

export function buildFixCore() {
  const files = new Map();
  for (const name of readdirSync(sourceDir).sort()) {
    if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
    const source = readFileSync(path.join(sourceDir, name), "utf8");
    const code = stripTypeScriptTypes(source, { mode: "strip" });
    files.set(name.replace(/\.ts$/, ".js"), HEADER + code);
  }
  return files;
}

function main() {
  const files = buildFixCore();
  if (process.argv.includes("--check")) {
    const stale = [...files].filter(([name, text]) => {
      const file = path.join(outDir, name);
      return !existsSync(file) || readFileSync(file, "utf8") !== text;
    });
    if (stale.length) {
      console.error(`Generated files are out of date: ${stale.map(([n]) => n).join(", ")}. Run: npm run build:fix`);
      process.exit(1);
    }
    console.log(`Generated explainer files are up to date (${files.size} files).`);
    return;
  }
  mkdirSync(outDir, { recursive: true });
  for (const [name, text] of files) writeFileSync(path.join(outDir, name), text);
  console.log(`Wrote ${files.size} files to website/fix-core/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
