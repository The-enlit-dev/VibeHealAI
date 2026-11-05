import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  createAdminHandler,
  hashPassword,
  isValidUsername,
  parsePasswordHash,
  parseSignupQuery,
  verifyPassword,
  type AdminOptions,
} from "./admin.js";
import { WindowCounter } from "./http-util.js";
import { createWaitlistHandler } from "./server.js";
import { openJsonFileStore, type SignupStore } from "./store.js";

const uiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "admin-ui");
const FAST = { N: 16384, r: 8, p: 1, keyLength: 64 };
const USERNAME = "site-admin";
const PASSWORD = "correct horse battery staple";
const encodedHash = await hashPassword(PASSWORD, FAST);

// ---------- password hashing ----------

describe("admin password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const parsed = parsePasswordHash(encodedHash);
    expect(await verifyPassword(PASSWORD, parsed)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", parsed)).toBe(false);
    expect(await verifyPassword("", parsed)).toBe(false);
  });

  it("uses a random salt, so the same password gives different hashes", async () => {
    expect(await hashPassword(PASSWORD, FAST)).not.toBe(encodedHash);
  });

  it("refuses short passwords and malformed or weak hashes", async () => {
    await expect(hashPassword("short", FAST)).rejects.toThrow(/at least 12/);
    for (const bad of ["", "plaintext-password", "scrypt:1024:8:1:AAAA:BBBB", encodedHash.replace("scrypt", "bcrypt"), "scrypt:16384:8:1::"]) {
      expect(() => parsePasswordHash(bad), bad).toThrow(/not a valid hash/);
    }
  });

  it("validates admin usernames", () => {
    expect(isValidUsername("site-admin")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("admin user")).toBe(false);
  });
});

describe("WindowCounter", () => {
  it("blocks after the limit and resets after the window", () => {
    const counter = new WindowCounter(2, 1000);
    expect(counter.hit("ip", 0)).toBe(false);
    expect(counter.hit("ip", 1)).toBe(false);
    expect(counter.blocked("ip", 2)).toBe(true);
    expect(counter.blocked("ip", 1001)).toBe(false);
    counter.hit("ip", 1002);
    counter.reset("ip");
    expect(counter.blocked("ip", 1003)).toBe(false);
  });
});

describe("parseSignupQuery", () => {
  it("accepts valid filters and applies defaults", () => {
    const parsed = parseSignupQuery(new URLSearchParams("q=test&aiTool=cursor&from=2026-11-01&to=2026-11-10"));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toMatchObject({ q: "test", aiTool: "cursor", sort: "newest", page: 1, pageSize: 25 });
  });

  it("rejects unknown keys, bad dates, bad enums and out-of-range paging", () => {
    const parsed = parseSignupQuery(
      new URLSearchParams("evil=1&aiTool=x&capability=y&from=2026-13-01&to=yesterday&sort=up&page=0&pageSize=1000&q=" + "x".repeat(201)),
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(Object.keys(parsed.errors).sort()).toEqual(["aiTool", "capability", "evil", "from", "page", "pageSize", "q", "sort", "to"]);
    }
    const reversed = parseSignupQuery(new URLSearchParams("from=2026-11-10&to=2026-11-01"));
    expect(!reversed.ok && reversed.errors.to).toBeTruthy();
  });
});

// ---------- HTTP harness ----------

const tempDirs: string[] = [];
let server: Server | undefined;

afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  }
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

interface Harness {
  base: string;
  store: SignupStore;
  clock: { now: Date };
}

async function start(adminOverrides: Partial<AdminOptions> | null = {}): Promise<Harness> {
  const dir = await mkdtemp(path.join(tmpdir(), "vibeheal-admin-"));
  tempDirs.push(dir);
  const websiteDir = path.join(dir, "site");
  await mkdir(websiteDir);
  await writeFile(path.join(websiteDir, "index.html"), "<!doctype html><title>Site</title>");
  const store = await openJsonFileStore(path.join(dir, "signups.json"));
  const clock = { now: new Date("2026-11-10T12:00:00.000Z") };
  const now = () => clock.now;
  const admin =
    adminOverrides === null
      ? undefined
      : createAdminHandler({
          store,
          username: USERNAME,
          passwordHash: parsePasswordHash(encodedHash),
          uiDir,
          secureCookies: false,
          now,
          ...adminOverrides,
        });
  const handler = createWaitlistHandler({ store, websiteDir, now, ...(admin ? { admin } : {}) });
  server = createServer((req, res) => {
    void handler(req, res);
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, store, clock };
}

function login(base: string, username = USERNAME, password = PASSWORD, headers: Record<string, string> = {}) {
  return fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ username, password }),
  });
}

async function signIn(base: string): Promise<string> {
  const response = await login(base);
  expect(response.status).toBe(200);
  const setCookie = response.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0] ?? "";
}

const get = (base: string, url: string, cookie?: string, headers: Record<string, string> = {}) =>
  fetch(`${base}${url}`, { headers: { ...(cookie ? { Cookie: cookie } : {}), ...headers }, redirect: "manual" });

async function seed(harness: Harness) {
  const day = 24 * 60 * 60 * 1000;
  const t = harness.clock.now.getTime();
  await harness.store.add(
    { email: "ada@example.com", name: "Ada", aiTool: "cursor", frustration: "It broke after an AI change", capabilities: ["explain-errors"] },
    new Date(t - day),
  );
  await harness.store.add(
    { email: "bob@example.com", name: "=HYPERLINK(\"http://x\")", aiTool: "claude-code", frustration: null, capabilities: ["automations", "music"] },
    new Date(t - 10 * day),
  );
  await harness.store.add(
    { email: "cy@example.com", name: null, aiTool: null, frustration: "Hard to undo changes", capabilities: [] },
    new Date(t - 40 * day),
  );
}

const PROTECTED = [
  "/api/admin/session",
  "/api/admin/overview",
  "/api/admin/signups",
  "/api/admin/signups/00000000-0000-4000-8000-000000000000",
  "/api/admin/export.csv",
  "/api/admin/anything-else",
];

// ---------- tests ----------

describe("admin disabled (not configured)", () => {
  it("returns 404 for every admin route", async () => {
    const { base } = await start(null);
    for (const url of ["/admin", "/admin/", "/admin/admin.js", ...PROTECTED]) {
      expect((await get(base, url)).status, url).toBe(404);
    }
    expect((await login(base)).status).toBe(404);
  });
});

describe("admin access control", () => {
  it("requires a valid session for every admin API endpoint", async () => {
    const { base } = await start();
    for (const url of PROTECTED) {
      const response = await get(base, url);
      expect(response.status, url).toBe(401);
      expect(response.headers.get("cache-control"), url).toBe("no-store");
      expect(response.headers.get("x-robots-tag"), url).toBe("noindex, nofollow");
    }
    const forged = `${SESSION_COOKIE}=${"A".repeat(43)}`;
    for (const url of PROTECTED) expect((await get(base, url, forged)).status, url).toBe(401);
  });

  it("serves the dashboard page without data, and only its own files", async () => {
    const { base } = await start();
    const redirect = await get(base, "/admin");
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get("location")).toBe("/admin/");
    const page = await get(base, "/admin/");
    expect(page.status).toBe(200);
    expect(page.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(page.headers.get("content-security-policy")).toContain("script-src 'self'");
    expect(await page.text()).not.toMatch(/@example\.com/);
    expect((await get(base, "/admin/admin.js")).status).toBe(200);
    for (const url of ["/admin/../server.ts", "/admin/admin.test.ts", "/admin/%2e%2e/store.ts", "/admin/register"]) {
      expect((await get(base, url)).status, url).toBe(404);
    }
  });

  it("has no registration or account-creation endpoint", async () => {
    const { base } = await start();
    for (const url of ["/api/admin/register", "/api/admin/signup", "/api/admin/users"]) {
      const response = await fetch(`${base}${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      expect(response.status, url).toBe(401);
    }
  });

  it("never exposes signups on public routes", async () => {
    const harness = await start();
    await seed(harness);
    expect((await get(harness.base, "/api/waitlist")).status).toBe(405);
    for (const url of ["/api/signups", "/signups.json", "/waitlist-data/signups.json", "/api/waitlist/export"]) {
      const response = await get(harness.base, url);
      expect(response.status, url).toBe(404);
      expect(await response.text(), url).not.toContain("@example.com");
    }
  });
});

describe("admin login", () => {
  it("rejects a wrong username or password with the same message", async () => {
    const { base } = await start();
    const wrongPassword = await login(base, USERNAME, "wrong password here");
    const wrongUser = await login(base, "someone-else", PASSWORD);
    expect(wrongPassword.status).toBe(401);
    expect(wrongUser.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await wrongUser.json());
    expect(wrongPassword.headers.get("set-cookie")).toBeNull();
  });

  it("validates the login request", async () => {
    const { base } = await start();
    const text = await fetch(`${base}/api/admin/login`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" });
    expect(text.status).toBe(415);
    const empty = await fetch(`${base}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(empty.status).toBe(400);
    const notJson = await fetch(`${base}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    expect(notJson.status).toBe(400);
    expect((await get(base, "/api/admin/login")).status).toBe(405);
  });

  it("sets an HttpOnly, SameSite=Strict session cookie (Secure when configured)", async () => {
    const { base } = await start();
    const response = await login(base);
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE}=[A-Za-z0-9_-]{43}; `));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Secure");
    const body = await response.json();
    expect(body).toMatchObject({ authenticated: true, username: USERNAME });
    expect(JSON.stringify(body)).not.toContain(PASSWORD);

    server?.closeAllConnections();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    const secure = await start({ secureCookies: true });
    expect((await login(secure.base)).headers.get("set-cookie")).toContain("Secure");
  });

  it("rate-limits failed logins per address, even for the right password, until the window passes", async () => {
    const harness = await start({ loginLimit: { perIp: 3, global: 100, windowMs: 60_000 } });
    for (let i = 0; i < 3; i += 1) expect((await login(harness.base, USERNAME, "wrong password!!")).status).toBe(401);
    const blocked = await login(harness.base);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    harness.clock.now = new Date(harness.clock.now.getTime() + 61_000);
    expect((await login(harness.base)).status).toBe(200);
  });

  it("applies a global failure limit across all addresses", async () => {
    const harness = await start({ loginLimit: { perIp: 100, global: 2, windowMs: 60_000 } });
    await login(harness.base, USERNAME, "wrong password!!");
    await login(harness.base, USERNAME, "wrong password!!");
    expect((await login(harness.base)).status).toBe(429);
  });

  it("refuses cross-site requests", async () => {
    const { base } = await start();
    expect((await login(base, USERNAME, PASSWORD, { Origin: "https://evil.example" })).status).toBe(403);
    const cookie = await signIn(base);
    expect((await get(base, "/api/admin/overview", cookie, { "Sec-Fetch-Site": "cross-site" })).status).toBe(403);
    expect((await get(base, "/api/admin/export.csv", cookie, { Origin: "https://evil.example" })).status).toBe(403);
    expect((await get(base, "/api/admin/overview", cookie, { "Sec-Fetch-Site": "same-origin" })).status).toBe(200);
  });

  it("ends the session on logout", async () => {
    const { base } = await start();
    const cookie = await signIn(base);
    expect((await get(base, "/api/admin/session", cookie)).status).toBe(200);
    const out = await fetch(`${base}/api/admin/logout`, { method: "POST", headers: { Cookie: cookie } });
    expect(out.status).toBe(200);
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await get(base, "/api/admin/session", cookie)).status).toBe(401);
  });

  it("expires idle sessions and enforces an absolute lifetime", async () => {
    const harness = await start({ idleTimeoutMs: 60_000, absoluteTimeoutMs: 150_000 });
    const idle = await signIn(harness.base);
    harness.clock.now = new Date(harness.clock.now.getTime() + 61_000);
    expect((await get(harness.base, "/api/admin/session", idle)).status).toBe(401);

    const active = await signIn(harness.base);
    for (let i = 0; i < 2; i += 1) {
      harness.clock.now = new Date(harness.clock.now.getTime() + 50_000);
      expect((await get(harness.base, "/api/admin/session", active)).status).toBe(200);
    }
    harness.clock.now = new Date(harness.clock.now.getTime() + 55_000);
    expect((await get(harness.base, "/api/admin/session", active)).status).toBe(401);
  });
});

describe("admin data", () => {
  it("summarises totals, recent signups and a 30-day trend", async () => {
    const harness = await start();
    await seed(harness);
    const cookie = await signIn(harness.base);
    const response = await get(harness.base, "/api/admin/overview", cookie);
    expect(response.status).toBe(200);
    const overview = await response.json();
    expect(overview).toMatchObject({ total: 3, last7Days: 1, last30Days: 2, generatedAt: "2026-11-10T12:00:00.000Z" });
    expect(overview.latestSignupAt).toBe("2026-11-09T12:00:00.000Z");
    expect(overview.dailyLast30).toHaveLength(30);
    expect(overview.dailyLast30.at(-1).date).toBe("2026-11-10");
    expect(overview.dailyLast30.reduce((s: number, d: { count: number }) => s + d.count, 0)).toBe(2);
    expect(overview.aiTools.find((t: { id: string }) => t.id === "cursor").count).toBe(1);
  });

  it("returns an honest empty overview when there are no signups", async () => {
    const { base } = await start();
    const cookie = await signIn(base);
    const overview = await (await get(base, "/api/admin/overview", cookie)).json();
    expect(overview).toMatchObject({ total: 0, last7Days: 0, latestSignupAt: null });
    const list = await (await get(base, "/api/admin/signups", cookie)).json();
    expect(list).toMatchObject({ total: 0, items: [] });
  });

  it("searches, filters, sorts and paginates signups", async () => {
    const harness = await start();
    await seed(harness);
    const cookie = await signIn(harness.base);
    const query = async (q: string) => (await get(harness.base, `/api/admin/signups?${q}`, cookie)).json();

    expect((await query("")).items.map((e: { email: string }) => e.email)).toEqual(["ada@example.com", "bob@example.com", "cy@example.com"]);
    expect((await query("sort=oldest")).items[0].email).toBe("cy@example.com");
    expect((await query("q=UNDO")).items.map((e: { email: string }) => e.email)).toEqual(["cy@example.com"]);
    expect((await query("aiTool=claude-code")).total).toBe(1);
    expect((await query("aiTool=not-answered")).items[0].email).toBe("cy@example.com");
    expect((await query("capability=music")).items[0].email).toBe("bob@example.com");
    expect((await query("from=2026-11-01&to=2026-11-09")).total).toBe(1);
    const page2 = await query("pageSize=2&page=2");
    expect(page2).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(page2.items).toHaveLength(1);
  });

  it("rejects invalid filters with field errors", async () => {
    const harness = await start();
    const cookie = await signIn(harness.base);
    const response = await get(harness.base, "/api/admin/signups?aiTool=%3Cscript%3E&page=-1", cookie);
    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).fields).sort()).toEqual(["aiTool", "page"]);
  });

  it("shows one signup in full, and handles bad or unknown ids", async () => {
    const harness = await start();
    await seed(harness);
    const cookie = await signIn(harness.base);
    const [first] = harness.store.list();
    const detail = await get(harness.base, `/api/admin/signups/${first?.id}`, cookie);
    expect(detail.status).toBe(200);
    expect((await detail.json()).entry).toEqual(first);
    expect((await get(harness.base, "/api/admin/signups/not-an-id", cookie)).status).toBe(400);
    expect((await get(harness.base, "/api/admin/signups/00000000-0000-4000-8000-000000000000", cookie)).status).toBe(404);
  });

  it("exports filtered signups as a CSV download, with formula injection neutralised", async () => {
    const harness = await start();
    await seed(harness);
    const cookie = await signIn(harness.base);
    const response = await get(harness.base, "/api/admin/export.csv", cookie);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="waitlist-export-2026-11-10.csv"');
    expect(response.headers.get("cache-control")).toBe("no-store");
    const lines = (await response.text()).trim().split("\n");
    expect(lines[0]).toBe("created_at,email,name,ai_tool,capabilities,frustration");
    expect(lines).toHaveLength(4);
    expect(lines.find((l) => l.includes("bob@example.com"))).toContain("\"'=HYPERLINK(");

    const filtered = await (await get(harness.base, "/api/admin/export.csv?aiTool=cursor", cookie)).text();
    expect(filtered.trim().split("\n")).toHaveLength(2);
    expect((await get(harness.base, "/api/admin/export.csv?aiTool=bad", cookie)).status).toBe(400);
  });

  it("only allows GET on data endpoints", async () => {
    const harness = await start();
    const cookie = await signIn(harness.base);
    const response = await fetch(`${harness.base}/api/admin/overview`, { method: "DELETE", headers: { Cookie: cookie } });
    expect(response.status).toBe(405);
  });
});
