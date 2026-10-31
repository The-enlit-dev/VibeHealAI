// Command-line entry point for the waitlist and the marketing site preview.
//
//   serve   Serve website/ and POST /api/waitlist on 127.0.0.1:8790 (local preview)
//   report  Print and write an aggregate demand summary (no email addresses)
//   export  Write the private CSV export (contains email addresses; local only)
//
// Configuration (environment variables, all optional):
//   WAITLIST_HOST             default 127.0.0.1 (keep it on loopback unless the owner decides otherwise)
//   WAITLIST_PORT             default 8790
//   WAITLIST_DATA_DIR         default ./waitlist-data (git-ignored)
//   WAITLIST_ALLOWED_ORIGINS  comma-separated origins allowed to call the API cross-site
//   WEBSITE_DIR               default ./website

import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { openJsonFileStore } from "./store.js";
import { buildReport, renderCsv, renderMarkdown } from "./report.js";
import { createWaitlistHandler } from "./server.js";

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
  const handler = createWaitlistHandler({
    store,
    websiteDir,
    allowedOrigins,
    logError: (message) => process.stderr.write(`${message}\n`),
  });

  const server = createServer((req, res) => {
    void handler(req, res);
  });
  server.listen(port, host, () => {
    out(`BrixoAI site and waitlist preview: http://${host}:${port}/`);
    out(`Serving ${websiteDir}`);
    out(`Signups are stored in ${signupsFile}. Keep this file private.`);
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

const commands: Record<string, () => Promise<void>> = {
  serve,
  report,
  export: exportCsv,
};

const run = commands[command ?? ""];
if (!run) {
  fail("Usage: node dist/waitlist/cli.js <serve|report|export>");
}
run().catch((error: unknown) => {
  // Store and file-system messages name paths only, never signup contents.
  fail(`Command failed: ${error instanceof Error ? error.message : "unknown error"}`);
});
