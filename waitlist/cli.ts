// Command-line entry point for the waitlist, the website preview and the private admin area.
//
//   serve          Serve website/, POST /api/waitlist and (if configured) /admin/ on 127.0.0.1:8790
//   report         Print and write an aggregate demand summary (no email addresses)
//   export         Write the private CSV export (contains email addresses; local only)
//   hash-password  Create an admin password hash for WAITLIST_ADMIN_PASSWORD_HASH (reads the password from stdin)
//
// Configuration (environment variables, all optional; npm scripts also read .env.waitlist if it exists):
//   WAITLIST_HOST                 default 127.0.0.1 (keep it on loopback unless the owner decides otherwise)
//   WAITLIST_PORT                 default 8790
//   WAITLIST_DATA_DIR             default ./waitlist-data (git-ignored)
//   WAITLIST_ALLOWED_ORIGINS      comma-separated origins allowed to call the signup API cross-site
//   WEBSITE_DIR                   default ./website
//   WAITLIST_ADMIN_USERNAME       admin username (admin is disabled unless this AND the hash are set)
//   WAITLIST_ADMIN_PASSWORD_HASH  output of `npm run waitlist:hash-password`
//   WAITLIST_COOKIE_SECURE        auto (default: Secure unless the host is loopback) | true | false
//   WAITLIST_ADMIN_UI_DIR         default ./waitlist/admin-ui

import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { openJsonFileStore } from "./store.js";
import { buildReport, renderCsv, renderMarkdown } from "./report.js";
import { createWaitlistHandler, type AdminHandler } from "./server.js";
import { MIN_PASSWORD_LENGTH, createAdminHandler, hashPassword, isValidUsername, parsePasswordHash } from "./admin.js";
import type { SignupStore } from "./store.js";

const command = process.argv[2];
const cwd = process.cwd();
const dataDir = path.resolve(process.env.WAITLIST_DATA_DIR ?? path.join(cwd, "waitlist-data"));
const signupsFile = path.join(dataDir, "signups.json");

function out(text: string) {
  process.stdout.write(`${text}\n`);
}

function fail(text: string): never {
  process.stderr.write(`${text}\n`);
  process.exit(1);
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost"]);

function adminFromEnv(store: SignupStore, host: string): AdminHandler | undefined {
  const username = process.env.WAITLIST_ADMIN_USERNAME?.trim() ?? "";
  const hash = process.env.WAITLIST_ADMIN_PASSWORD_HASH?.trim() ?? "";
  if (!username && !hash) return undefined;
  if (!username || !hash) {
    fail("Admin is half-configured: set both WAITLIST_ADMIN_USERNAME and WAITLIST_ADMIN_PASSWORD_HASH, or neither.");
  }
  if (!isValidUsername(username)) fail("WAITLIST_ADMIN_USERNAME must be 3-64 letters, digits, dots, dashes or underscores.");

  const secureSetting = (process.env.WAITLIST_COOKIE_SECURE ?? "auto").toLowerCase();
  if (!["auto", "true", "false"].includes(secureSetting)) fail("WAITLIST_COOKIE_SECURE must be auto, true or false.");
  const secureCookies = secureSetting === "auto" ? !LOOPBACK.has(host) : secureSetting === "true";
  if (!secureCookies && !LOOPBACK.has(host)) {
    fail("Refusing to serve the admin area on a non-loopback address without Secure cookies. Put it behind HTTPS.");
  }

  return createAdminHandler({
    store,
    username,
    passwordHash: parsePasswordHash(hash),
    uiDir: path.resolve(process.env.WAITLIST_ADMIN_UI_DIR ?? path.join(cwd, "waitlist", "admin-ui")),
    secureCookies,
  });
}

async function serve() {
  const host = process.env.WAITLIST_HOST ?? "127.0.0.1";
  const port = Number(process.env.WAITLIST_PORT ?? "8790");
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail("WAITLIST_PORT must be a port number.");
  const websiteDir = path.resolve(process.env.WEBSITE_DIR ?? path.join(cwd, "website"));
  const allowedOrigins = (process.env.WAITLIST_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const store = await openJsonFileStore(signupsFile);
  const admin = adminFromEnv(store, host);
  const handler = createWaitlistHandler({
    store,
    websiteDir,
    allowedOrigins,
    ...(admin ? { admin } : {}),
    logError: (message) => process.stderr.write(`${message}\n`),
  });

  const server = createServer((req, res) => {
    void handler(req, res);
  });
  server.listen(port, host, () => {
    out(`Website and waitlist preview: http://${host}:${port}/`);
    out(`Serving ${websiteDir}`);
    out(`Signups are stored in ${signupsFile}. Keep this file private.`);
    out(
      admin
        ? `Admin dashboard: http://${host}:${port}/admin/`
        : "Admin dashboard: disabled (set WAITLIST_ADMIN_USERNAME and WAITLIST_ADMIN_PASSWORD_HASH to enable it).",
    );
    out("Press Ctrl+C to stop.");
  });
}

async function report() {
  const store = await openJsonFileStore(signupsFile);
  const generatedAt = new Date();
  const summary = renderMarkdown(buildReport(store.list()), generatedAt);
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const target = path.join(dataDir, "demand-report.md");
  await writeFile(target, summary, { encoding: "utf8", mode: 0o600 });
  out(summary);
  out(`Written to ${target}`);
}

async function exportCsv() {
  const store = await openJsonFileStore(signupsFile);
  const entries = store.list();
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const target = path.join(dataDir, "waitlist-export.csv");
  await writeFile(target, renderCsv(entries), { encoding: "utf8", mode: 0o600 });
  out(`Exported ${entries.length} signup(s) to ${target}`);
  out("This file contains personal data. Keep it local and delete it when no longer needed.");
}

/** Reads one line without echoing it when stdin is a terminal; reads piped input otherwise. */
function readSecret(prompt: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    return new Promise((resolve, reject) => {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk: string) => (data += chunk));
      stdin.on("end", () => resolve(data.replace(/\r?\n$/, "")));
      stdin.on("error", reject);
    });
  }
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function hashPasswordCommand() {
  const password = await readSecret(`New admin password (at least ${MIN_PASSWORD_LENGTH} characters): `);
  if (process.stdin.isTTY) {
    const again = await readSecret("Repeat the password: ");
    if (again !== password) fail("The passwords do not match.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) fail(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  const hash = await hashPassword(password);
  out("");
  out("Add these lines to .env.waitlist (git-ignored). Do not commit them or share them:");
  out("");
  out("WAITLIST_ADMIN_USERNAME=choose-a-username");
  out(`WAITLIST_ADMIN_PASSWORD_HASH=${hash}`);
}

const commands: Record<string, () => Promise<void>> = {
  serve,
  report,
  export: exportCsv,
  "hash-password": hashPasswordCommand,
};

const run = commands[command ?? ""];
if (!run) {
  fail("Usage: node dist/waitlist/cli.js <serve|report|export|hash-password>");
}
run().catch((error: unknown) => {
  // Store and file-system messages name paths only, never signup contents.
  fail(`Command failed: ${error instanceof Error ? error.message : "unknown error"}`);
});
