import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openJsonFileStore, type SignupStore } from "./store.js";
import { buildReport, csvCell, renderCsv, renderMarkdown } from "./report.js";
import { createWaitlistHandler, SUCCESS_MESSAGE, type WaitlistAppOptions } from "./server.js";
import { validateSignup, type WaitlistEntry } from "./validation.js";

const validBody = {
  email: "  Builder@Example.COM ",
  name: "  Ada   Lovelace ",
  aiTool: "claude-code",
  frustration: "The app breaks after AI changes and I can't find the error.",
  capabilities: ["explain-errors", "backups-undo", "explain-errors"],
  consent: true,
  company: "",
};

// ---------- validation ----------

describe("validateSignup", () => {
  it("accepts a valid signup and normalises it", () => {
    const outcome = validateSignup(validBody);
    expect(outcome.kind).toBe("valid");
    if (outcome.kind !== "valid") return;
    expect(outcome.value).toEqual({
      email: "builder@example.com",
      name: "Ada Lovelace",
      aiTool: "claude-code",
      frustration: "The app breaks after AI changes and I can't find the error.",
      capabilities: ["explain-errors", "backups-undo"],
    });
  });

  it("requires only an email and consent", () => {
    const outcome = validateSignup({ email: "a@b.co", consent: true });
    expect(outcome.kind).toBe("valid");
    if (outcome.kind !== "valid") return;
    expect(outcome.value.name).toBeNull();
    expect(outcome.value.aiTool).toBeNull();
    expect(outcome.value.frustration).toBeNull();
    expect(outcome.value.capabilities).toEqual([]);
  });

  it("rejects missing, malformed and overlong emails", () => {
    for (const email of ["", "   ", "no-at-sign", "a@b", "a b@c.com", `${"a".repeat(250)}@b.co`]) {
      const outcome = validateSignup({ ...validBody, email });
      expect(outcome.kind).toBe("invalid");
      if (outcome.kind === "invalid") expect(outcome.errors.email).toBeTruthy();
    }
  });

  it("requires consent", () => {
    const outcome = validateSignup({ ...validBody, consent: false });
    expect(outcome.kind === "invalid" && outcome.errors.consent).toBeTruthy();
  });

  it("rejects unknown AI tools and capabilities", () => {
    const tool = validateSignup({ ...validBody, aiTool: "<script>" });
    expect(tool.kind === "invalid" && tool.errors.aiTool).toBeTruthy();
    const capability = validateSignup({ ...validBody, capabilities: ["make-me-rich"] });
    expect(capability.kind === "invalid" && capability.errors.capabilities).toBeTruthy();
    const notArray = validateSignup({ ...validBody, capabilities: "explain-errors" });
    expect(notArray.kind === "invalid" && notArray.errors.capabilities).toBeTruthy();
  });

  it("limits free text and rejects control characters", () => {
    const longName = validateSignup({ ...validBody, name: "x".repeat(81) });
    expect(longName.kind === "invalid" && longName.errors.name).toBeTruthy();
    const longFrustration = validateSignup({ ...validBody, frustration: "x".repeat(501) });
    expect(longFrustration.kind === "invalid" && longFrustration.errors.frustration).toBeTruthy();
    const control = validateSignup({ ...validBody, name: "Ada\u0007" });
    expect(control.kind === "invalid" && control.errors.name).toBeTruthy();
  });

  it("flags a filled honeypot without reporting errors", () => {
    expect(validateSignup({ ...validBody, company: "Bot Inc" }).kind).toBe("honeypot");
  });

  it("rejects non-object bodies", () => {
    expect(validateSignup("hello").kind).toBe("invalid");
    expect(validateSignup(null).kind).toBe("invalid");
    expect(validateSignup([]).kind).toBe("invalid");
  });
});

// ---------- store ----------

const tempDirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "vibeheal-waitlist-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const newEntry = {
  email: "a@example.com",
  name: null,
  aiTool: null,
  frustration: null,
  capabilities: [] as WaitlistEntry["capabilities"],
};

describe("openJsonFileStore", () => {
  it("persists entries and reloads them", async () => {
    const file = path.join(await tempDir(), "signups.json");
    const store = await openJsonFileStore(file);
    await store.add(newEntry, new Date("2026-11-02T10:00:00Z"));
    const reopened = await openJsonFileStore(file);
    expect(reopened.list()).toHaveLength(1);
    expect(reopened.list()[0]?.email).toBe("a@example.com");
    expect(reopened.list()[0]?.createdAt).toBe("2026-11-02T10:00:00.000Z");
  });

  it("does not create duplicate emails, even under concurrent requests", async () => {
    const store = await openJsonFileStore(path.join(await tempDir(), "signups.json"));
    const results = await Promise.all(Array.from({ length: 8 }, () => store.add(newEntry, new Date())));
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(store.list()).toHaveLength(1);
  });

  it("refuses to open a corrupt file and does not echo its contents", async () => {
    const dir = await tempDir();
    const file = path.join(dir, "signups.json");
    await writeFile(file, '{"version":1,"entries":[{"email":"secret-person@example.com"');
    const error = await openJsonFileStore(file).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).not.toContain("secret-person");
  });

  it("writes the data file with owner-only permissions on POSIX systems", async () => {
    if (process.platform === "win32") return;
    const { stat } = await import("node:fs/promises");
    const file = path.join(await tempDir(), "signups.json");
    const store = await openJsonFileStore(file);
    await store.add(newEntry, new Date());
    const info = await stat(file);
    expect(info.mode & 0o077).toBe(0);
  });
});

// ---------- HTTP service ----------

interface Harness {
  base: string;
  store: SignupStore;
  close: () => Promise<void>;
}

async function startService(overrides: Partial<WaitlistAppOptions> = {}): Promise<Harness> {
  const dir = await tempDir();
  const websiteDir = path.join(dir, "site");
  await mkdir(websiteDir);
  await writeFile(path.join(websiteDir, "index.html"), "<!doctype html><title>VibeHeal</title>");
  await writeFile(path.join(websiteDir, "app.js"), "console.log('ok');");
  await writeFile(path.join(websiteDir, "config.env"), "SECRET=1");
  const store = await openJsonFileStore(path.join(dir, "signups.json"));
  const handler = createWaitlistHandler({
    store,
    websiteDir,
    rateLimit: { maxRequests: 100, windowMs: 60_000 },
    ...overrides,
  });
  const server: Server = createServer((req, res) => {
    void handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    store,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

function post(base: string, body: unknown, headers: Record<string, string> = { "Content-Type": "application/json" }) {
  return fetch(`${base}/api/waitlist`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/waitlist", () => {
  let harness: Harness | undefined;
  afterEach(async () => {
    await harness?.close();
    harness = undefined;
  });

  it("stores a valid signup and returns the success message", async () => {
    harness = await startService();
    const response = await post(harness.base, validBody);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", message: SUCCESS_MESSAGE });
    expect(harness.store.list()).toHaveLength(1);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("answers duplicates with the same success message and stores nothing new", async () => {
    harness = await startService();
    await post(harness.base, validBody);
    const again = await post(harness.base, { email: "BUILDER@example.com", consent: true });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ status: "ok", message: SUCCESS_MESSAGE });
    expect(harness.store.list()).toHaveLength(1);
  });

  it("returns field errors for invalid input", async () => {
    harness = await startService();
    const response = await post(harness.base, { email: "nope", consent: false });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(body.fields.email).toBeTruthy();
    expect(body.fields.consent).toBeTruthy();
    expect(harness.store.list()).toHaveLength(0);
  });

  it("pretends success for a filled honeypot but stores nothing", async () => {
    harness = await startService();
    const response = await post(harness.base, { ...validBody, company: "spam" });
    expect(response.status).toBe(200);
    expect(harness.store.list()).toHaveLength(0);
  });

  it("rejects non-JSON content types, bad JSON and oversized bodies", async () => {
    harness = await startService({ maxBodyBytes: 200 });
    const wrongType = await post(harness.base, validBody, { "Content-Type": "text/plain" });
    expect(wrongType.status).toBe(415);
    const badJson = await post(harness.base, "{not json");
    expect(badJson.status).toBe(400);
    const tooLarge = await post(harness.base, { ...validBody, frustration: "x".repeat(400) });
    expect(tooLarge.status).toBe(413);
    expect(harness.store.list()).toHaveLength(0);
  });

  it("rate-limits repeated attempts from one address", async () => {
    harness = await startService({ rateLimit: { maxRequests: 2, windowMs: 60_000 } });
    expect((await post(harness.base, validBody)).status).toBe(200);
    expect((await post(harness.base, validBody)).status).toBe(200);
    const limited = await post(harness.base, validBody);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("600");
  });

  it("only allows GET and HEAD for the static site and POST for the API", async () => {
    harness = await startService();
    const get = await fetch(`${harness.base}/api/waitlist`);
    expect(get.status).toBe(405);
    expect(get.headers.get("allow")).toBe("POST, OPTIONS");
    const put = await fetch(`${harness.base}/`, { method: "PUT" });
    expect(put.status).toBe(405);
  });

  it("answers CORS preflight only for allowed origins", async () => {
    harness = await startService({ allowedOrigins: ["https://vibeheal.example"] });
    const allowed = await fetch(`${harness.base}/api/waitlist`, {
      method: "OPTIONS",
      headers: { Origin: "https://vibeheal.example" },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://vibeheal.example");
    const other = await fetch(`${harness.base}/api/waitlist`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example" },
    });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("static site serving", () => {
  let harness: Harness | undefined;
  afterEach(async () => {
    await harness?.close();
    harness = undefined;
  });

  it("serves index.html at the root with security headers", async () => {
    harness = await startService();
    const response = await fetch(`${harness.base}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(await response.text()).toContain("VibeHeal");
  });

  it("serves allowed asset types only", async () => {
    harness = await startService();
    expect((await fetch(`${harness.base}/app.js`)).status).toBe(200);
    expect((await fetch(`${harness.base}/config.env`)).status).toBe(404);
  });

  it("blocks path traversal, encoded traversal and unknown API paths", async () => {
    harness = await startService();
    expect((await fetch(`${harness.base}/%2e%2e/%2e%2e/etc/passwd`)).status).toBe(404);
    expect((await fetch(`${harness.base}/..%2fsignups.json`)).status).toBe(404);
    expect((await fetch(`${harness.base}/%00`)).status).toBe(400);
    expect((await fetch(`${harness.base}/api/admin/export`)).status).toBe(404);
  });

  it("returns 404 for missing files and for the API when no site folder is configured", async () => {
    harness = await startService();
    expect((await fetch(`${harness.base}/missing.html`)).status).toBe(404);
  });
});

// ---------- report and export ----------

function entry(overrides: Partial<WaitlistEntry>): WaitlistEntry {
  return {
    id: "id",
    email: "x@example.com",
    name: null,
    aiTool: null,
    frustration: null,
    capabilities: [],
    createdAt: "2026-11-02T10:00:00.000Z",
    source: "website",
    ...overrides,
  };
}

describe("demand report", () => {
  it("counts signups, tools, capabilities and frustration themes", () => {
    const entries = [
      entry({ aiTool: "cursor", capabilities: ["explain-errors", "backups-undo"], frustration: "I can't understand what the AI changed" }),
      entry({ aiTool: "cursor", createdAt: "2026-11-03T09:00:00.000Z", frustration: "My project broke and I got an error" }),
      entry({ aiTool: null, frustration: "Restoring an older version is hard", capabilities: ["explain-errors"] }),
      entry({ aiTool: "none", frustration: "Something else entirely" }),
    ];
    const report = buildReport(entries);
    expect(report.totalSignups).toBe(4);
    expect(report.signupsByDay).toEqual([
      { date: "2026-11-02", count: 3 },
      { date: "2026-11-03", count: 1 },
    ]);
    expect(report.aiTools.find((t) => t.id === "cursor")?.count).toBe(2);
    expect(report.aiTools.find((t) => t.id === "not-answered")?.count).toBe(1);
    expect(report.capabilities.find((c) => c.id === "explain-errors")?.count).toBe(2);
    expect(report.frustrationTexts).toBe(4);
    expect(report.otherFrustrations).toBe(1);
    expect(report.frustrationThemes.find((t) => t.id === "understand")?.count).toBe(1);
    expect(report.frustrationThemes.find((t) => t.id === "restore")?.count).toBe(1);
  });

  it("never prints email addresses or free text in the markdown summary", () => {
    const markdown = renderMarkdown(
      buildReport([entry({ email: "private.person@example.com", frustration: "private detail about my app" })]),
      new Date("2026-11-02T12:00:00Z"),
    );
    expect(markdown).not.toContain("private.person@example.com");
    expect(markdown).not.toContain("private detail");
    expect(markdown).toContain("Total valid signups: 1");
  });

  it("says plainly when there are no signups instead of inventing numbers", () => {
    const markdown = renderMarkdown(buildReport([]), new Date("2026-11-02T12:00:00Z"));
    expect(markdown).toContain("Total valid signups: 0");
    expect(markdown).toContain("No signups recorded yet");
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formula injection and escapes quotes", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+1")).toBe("\"'+1\"");
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('""');
  });

  it("writes a header and one row per entry", () => {
    const csv = renderCsv([entry({ email: "a@example.com", capabilities: ["explain-errors", "backups-undo"] })]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("created_at,email,name,ai_tool,capabilities,frustration");
    expect(lines[1]).toContain('"a@example.com"');
    expect(lines[1]).toContain('"explain-errors;backups-undo"');
    expect(renderCsv([]).trim()).toBe("created_at,email,name,ai_tool,capabilities,frustration");
  });

  it("can be read back from the stored file without changing it", async () => {
    const file = path.join(await tempDir(), "signups.json");
    const store = await openJsonFileStore(file);
    await store.add(newEntry, new Date("2026-11-02T10:00:00Z"));
    const raw = await readFile(file, "utf8");
    expect(JSON.parse(raw).version).toBe(1);
  });
});
