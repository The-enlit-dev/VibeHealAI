#!/usr/bin/env node
// Build-time check (CR-6): fails if the renderer bundle contains backend-only setting
// names or anything that looks like a secret. Run automatically by `npm run build`.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleDir = path.join(root, "dist", "desktop", "renderer");

const FORBIDDEN = [
  /VIBEHEAL_ENCRYPTION_KEY/,
  /VIBEHEAL_CLIENT_TOKEN/,
  /GITHUB_APP_CLIENT_SECRET/,
  /GITHUB_APP_PRIVATE_KEY/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/,
];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

let bundle;
try {
  bundle = files(bundleDir);
} catch {
  console.error(`Renderer bundle not found at ${path.relative(root, bundleDir)}. Run the build first.`);
  process.exit(1);
}

const problems = [];
for (const file of bundle) {
  const text = readFileSync(file, "utf8");
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) problems.push(`${path.relative(root, file)} matches ${pattern}`);
  }
}

if (problems.length > 0) {
  console.error("Renderer bundle check FAILED (CR-6):");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Renderer bundle check passed: ${bundle.length} files, no secret-like content or backend-only setting names.`);
