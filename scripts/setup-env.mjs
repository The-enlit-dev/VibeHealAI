#!/usr/bin/env node
// Creates local, git-ignored configuration files with freshly generated secrets:
//   .env          backend settings (encryption key, access token, optional provider config)
//   .env.desktop  desktop settings (backend URL and the same access token only)
// Existing files are never overwritten. Secrets are generated locally and not printed.

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendFile = path.join(root, ".env");
const desktopFile = path.join(root, ".env.desktop");

if (existsSync(backendFile) || existsSync(desktopFile)) {
  console.error("Refusing to overwrite: .env or .env.desktop already exists. Delete them first if you want new secrets.");
  console.error("Note: a new VIBEHEAL_ENCRYPTION_KEY makes previously stored credentials unreadable; reconnect providers afterwards.");
  process.exit(1);
}

const token = randomBytes(32).toString("base64url");
const key = randomBytes(32).toString("base64");

const template = readFileSync(path.join(root, ".env.example"), "utf8");
const backend = template
  .replace(/^VIBEHEAL_CLIENT_TOKEN=.*$/m, `VIBEHEAL_CLIENT_TOKEN=${token}`)
  .replace(/^VIBEHEAL_ENCRYPTION_KEY=.*$/m, `VIBEHEAL_ENCRYPTION_KEY=${key}`);
if (!backend.includes(token) || !backend.includes(key)) {
  console.error(".env.example is missing VIBEHEAL_CLIENT_TOKEN or VIBEHEAL_ENCRYPTION_KEY lines.");
  process.exit(1);
}

const desktop = readFileSync(path.join(root, ".env.desktop.example"), "utf8").replace(/^VIBEHEAL_CLIENT_TOKEN=.*$/m, `VIBEHEAL_CLIENT_TOKEN=${token}`);

writeFileSync(backendFile, backend, { mode: 0o600, flag: "wx" });
writeFileSync(desktopFile, desktop, { mode: 0o600, flag: "wx" });
console.log("Created .env and .env.desktop with new local secrets (not shown). Both files are git-ignored.");
console.log("GitHub stays 'Not configured' until you add GitHub App settings to .env (docs/integrations/GITHUB_APP_SETUP.md).");
