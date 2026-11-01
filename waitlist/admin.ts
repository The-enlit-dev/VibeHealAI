// Private admin area for the waitlist: login, dashboard data, search, detail view and CSV export.
//
// Security model (see docs/website/ADMIN.md):
// - Disabled unless WAITLIST_ADMIN_USERNAME and WAITLIST_ADMIN_PASSWORD_HASH are both set. No default password.
// - One admin account. The password is stored only as a scrypt hash; there is no registration endpoint.
// - Server-side sessions: a random 256-bit token in an HttpOnly, SameSite=Strict cookie. Only the token's
//   SHA-256 digest is kept in memory. Idle and absolute expiry. Sessions end when the process restarts.
// - Every /api/admin/* route checks the session on the server. The /admin/ page itself contains no data.
// - Cross-site requests are refused (Origin and Sec-Fetch-Site checks), on top of SameSite=Strict.
// - Failed logins are rate-limited per IP address and globally.
// - Responses are no-store and noindex. Nothing personal is logged.

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { buildReport, renderCsv } from "./report.js";
import type { SignupStore } from "./store.js";
import { AI_TOOLS, PLANNED_CAPABILITIES, type WaitlistEntry } from "./validation.js";
import { CONTENT_TYPES, SECURITY_HEADERS, WindowCounter, clientIp, parseCookies, readBody, writeJson } from "./http-util.js";

export const SESSION_COOKIE = "wl_admin";
const ADMIN_HEADERS = { "X-Robots-Tag": "noindex, nofollow" };
const UI_FILES = new Set(["index.html", "admin.css", "admin.js"]);

// ---------- password hashing (scrypt) ----------

export interface PasswordHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
}

const DEFAULT_SCRYPT = { N: 32768, r: 8, p: 1, keyLength: 64 };
const MAX_PASSWORD_LENGTH = 1024;
export const MIN_PASSWORD_LENGTH = 12;

function scryptAsync(password: string, salt: Buffer, keyLength: number, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N, r, p, maxmem: 256 * N * r * p + 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Format: scrypt:N:r:p:<salt base64url>:<key base64url>. No "$" characters, so it is safe in .env files. */
export async function hashPassword(password: string, params = DEFAULT_SCRYPT): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (password.length > MAX_PASSWORD_LENGTH) throw new Error("Password is too long.");
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, params.keyLength, params.N, params.r, params.p);
  return ["scrypt", params.N, params.r, params.p, salt.toString("base64url"), key.toString("base64url")].join(":");
}

export function parsePasswordHash(encoded: string): PasswordHash {
  const parts = encoded.trim().split(":");
  const invalid = new Error("WAITLIST_ADMIN_PASSWORD_HASH is not a valid hash. Create one with: npm run waitlist:hash-password");
  if (parts.length !== 6 || parts[0] !== "scrypt") throw invalid;
  const [N, r, p] = parts.slice(1, 4).map(Number) as [number, number, number];
  const salt = Buffer.from(parts[4] ?? "", "base64url");
  const key = Buffer.from(parts[5] ?? "", "base64url");
  const powerOfTwo = Number.isInteger(N) && N >= 2 ** 14 && N <= 2 ** 20 && (N & (N - 1)) === 0;
  if (!powerOfTwo || !Number.isInteger(r) || r < 1 || r > 32 || !Number.isInteger(p) || p < 1 || p > 16) throw invalid;
  if (salt.length < 16 || key.length < 32) throw invalid;
  return { N, r, p, salt, key };
}

export async function verifyPassword(password: string, hash: PasswordHash): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  const key = await scryptAsync(password, hash.salt, hash.key.length, hash.N, hash.r, hash.p);
  return timingSafeEqual(key, hash.key);
}

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,64}$/;
export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

// ---------- query validation ----------

export interface SignupQuery {
  q: string;
  aiTool: string | null;
  capability: string | null;
  from: string | null;
  to: string | null;
  sort: "newest" | "oldest";
  page: number;
  pageSize: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function parseSignupQuery(params: URLSearchParams):
  | { ok: true; value: SignupQuery }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const allowed = new Set(["q", "aiTool", "capability", "from", "to", "sort", "page", "pageSize"]);
  for (const key of params.keys()) if (!allowed.has(key)) errors[key] = "Unknown filter.";

  const q = (params.get("q") ?? "").trim();
  if (q.length > 200) errors.q = "Search must be 200 characters or fewer.";

  const aiTool = params.get("aiTool") || null;
  const toolIds = new Set<string>([...AI_TOOLS.map((t) => t.id), "not-answered"]);
  if (aiTool !== null && !toolIds.has(aiTool)) errors.aiTool = "Unknown AI tool.";

  const capability = params.get("capability") || null;
  if (capability !== null && !PLANNED_CAPABILITIES.some((c) => c.id === capability)) errors.capability = "Unknown capability.";

  const from = params.get("from") || null;
  if (from !== null && !validDate(from)) errors.from = "Use the format YYYY-MM-DD.";
  const to = params.get("to") || null;
  if (to !== null && !validDate(to)) errors.to = "Use the format YYYY-MM-DD.";
  if (from && to && !errors.from && !errors.to && from > to) errors.to = "The end date is before the start date.";

  const sortRaw = params.get("sort") ?? "newest";
  if (sortRaw !== "newest" && sortRaw !== "oldest") errors.sort = "Sort must be newest or oldest.";

  const page = Number(params.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > 100_000) errors.page = "Page must be a positive whole number.";
  const pageSize = Number(params.get("pageSize") ?? "25");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) errors.pageSize = "Page size must be between 1 and 100.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { q, aiTool, capability, from, to, sort: sortRaw === "oldest" ? "oldest" : "newest", page, pageSize },
  };
}

export function filterEntries(entries: readonly WaitlistEntry[], query: SignupQuery): WaitlistEntry[] {
  const needle = query.q.toLowerCase();
  const result = entries.filter((entry) => {
    if (needle) {
      const haystack = [entry.email, entry.name ?? "", entry.frustration ?? ""].join("\n").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (query.aiTool === "not-answered" ? entry.aiTool !== null : query.aiTool !== null && entry.aiTool !== query.aiTool) {
      return false;
    }
    if (query.capability && !entry.capabilities.includes(query.capability as WaitlistEntry["capabilities"][number])) return false;
    const day = entry.createdAt.slice(0, 10);
    if (query.from && day < query.from) return false;
    if (query.to && day > query.to) return false;
    return true;
  });
  result.sort((a, b) => (query.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  return result;
}

// ---------- overview ----------

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildOverview(entries: readonly WaitlistEntry[], now: Date) {
  const report = buildReport(entries);
  const nowMs = now.getTime();
  const countSince = (days: number) => entries.filter((e) => nowMs - Date.parse(e.createdAt) <= days * DAY_MS).length;
  const latest = entries.reduce<string | null>((max, e) => (max === null || e.createdAt > max ? e.createdAt : max), null);

  const byDay = new Map(report.signupsByDay.map((d) => [d.date, d.count]));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dailyLast30 = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today - (29 - index) * DAY_MS).toISOString().slice(0, 10);
    return { date, count: byDay.get(date) ?? 0 };
  });

  return {
    generatedAt: now.toISOString(),
    latestSignupAt: latest,
    total: report.totalSignups,
    last7Days: countSince(7),
    last30Days: countSince(30),
    dailyLast30,
    aiTools: report.aiTools,
    capabilities: report.capabilities,
    frustrationThemes: report.frustrationThemes,
    frustrationTexts: report.frustrationTexts,
    otherFrustrations: report.otherFrustrations,
  };
}

// ---------- handler ----------

export interface AdminOptions {
  store: SignupStore;
  username: string;
  passwordHash: PasswordHash;
  uiDir: string;
  secureCookies: boolean;
  now?: () => Date;
  idleTimeoutMs?: number;
  absoluteTimeoutMs?: number;
  loginLimit?: { perIp: number; global: number; windowMs: number };
}

interface Session {
  createdAt: number;
  lastSeen: number;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest();

export function createAdminHandler(options: AdminOptions) {
  const now = options.now ?? (() => new Date());
  const idleTimeoutMs = options.idleTimeoutMs ?? 2 * 60 * 60 * 1000;
  const absoluteTimeoutMs = options.absoluteTimeoutMs ?? 12 * 60 * 60 * 1000;
  const limits = options.loginLimit ?? { perIp: 5, global: 50, windowMs: 15 * 60 * 1000 };
  const ipFailures = new WindowCounter(limits.perIp, limits.windowMs);
  const globalFailures = new WindowCounter(limits.global, limits.windowMs);
  const sessions = new Map<string, Session>();
  const usernameDigest = sha256(options.username);
  const uiRoot = path.resolve(options.uiDir);

  function cookie(value: string, maxAgeSeconds: number): string {
    return [
      `${SESSION_COOKIE}=${value}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${maxAgeSeconds}`,
      ...(options.secureCookies ? ["Secure"] : []),
    ].join("; ");
  }

  function sessionKey(req: IncomingMessage): string | null {
    const token = parseCookies(req.headers.cookie).get(SESSION_COOKIE);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return sha256(token).toString("hex");
  }

  function currentSession(req: IncomingMessage): Session | null {
    const key = sessionKey(req);
    if (!key) return null;
    const session = sessions.get(key);
    if (!session) return null;
    const nowMs = now().getTime();
    if (nowMs - session.lastSeen > idleTimeoutMs || nowMs - session.createdAt > absoluteTimeoutMs) {
      sessions.delete(key);
      return null;
    }
    session.lastSeen = nowMs;
    return session;
  }

  function expiresAt(session: Session): string {
    return new Date(Math.min(session.lastSeen + idleTimeoutMs, session.createdAt + absoluteTimeoutMs)).toISOString();
  }

  function json(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
    writeJson(res, status, body, { ...ADMIN_HEADERS, ...extra });
  }

  /** Refuse requests that a browser marks as cross-site, or whose Origin is a different host. */
  function crossSite(req: IncomingMessage): boolean {
    if (req.headers["sec-fetch-site"] === "cross-site") return true;
    const origin = req.headers.origin;
    if (typeof origin !== "string") return false;
    try {
      return new URL(origin).host !== req.headers.host;
    } catch {
      return true;
    }
  }

  async function login(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." }, { Allow: "POST" });
    const ip = clientIp(req);
    const nowMs = now().getTime();
    const retryAfter = String(Math.ceil(limits.windowMs / 1000));
    if (ipFailures.blocked(ip, nowMs) || globalFailures.blocked("global", nowMs)) {
      return json(res, 429, { error: "Too many sign-in attempts. Please wait and try again." }, { "Retry-After": retryAfter });
    }
    if (!(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
      return json(res, 415, { error: "Send the sign-in form as JSON." });
    }
    const body = await readBody(req, 4096);
    if (body === "too-large") return json(res, 413, { error: "The request is too large." });
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return json(res, 400, { error: "Enter your username and password." });
    }
    const input = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;
    const username = typeof input.username === "string" ? input.username : "";
    const password = typeof input.password === "string" ? input.password : "";
    if (!username || username.length > 128 || !password || password.length > MAX_PASSWORD_LENGTH) {
      return json(res, 400, { error: "Enter your username and password." });
    }

    // Always run the password check, so a wrong username takes as long as a wrong password.
    const usernameOk = timingSafeEqual(sha256(username), usernameDigest);
    const passwordOk = await verifyPassword(password, options.passwordHash);
    if (!usernameOk || !passwordOk) {
      ipFailures.hit(ip, nowMs);
      globalFailures.hit("global", nowMs);
      return json(res, 401, { error: "Incorrect username or password." });
    }

    ipFailures.reset(ip);
    if (sessions.size >= 100) {
      const oldest = [...sessions.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0];
      if (oldest) sessions.delete(oldest[0]);
    }
    const token = randomBytes(32).toString("base64url");
    const session: Session = { createdAt: nowMs, lastSeen: nowMs };
    sessions.set(sha256(token).toString("hex"), session);
    return json(
      res,
      200,
      { authenticated: true, username: options.username, expiresAt: expiresAt(session) },
      { "Set-Cookie": cookie(token, Math.floor(absoluteTimeoutMs / 1000)) },
    );
  }

  function logout(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." }, { Allow: "POST" });
    const key = sessionKey(req);
    if (key) sessions.delete(key);
    return json(res, 200, { authenticated: false }, { "Set-Cookie": cookie("", 0) });
  }

  async function serveUi(req: IncomingMessage, res: ServerResponse, pathname: string) {
    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "Method not allowed." }, { Allow: "GET, HEAD" });
    const name = pathname === "/admin/" ? "index.html" : pathname.slice("/admin/".length);
    if (!UI_FILES.has(name)) return json(res, 404, { error: "Not found." });
    const file = path.join(uiRoot, name);
    let size: number;
    try {
      size = (await stat(file)).size;
    } catch {
      return json(res, 404, { error: "Not found." });
    }
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      ...ADMIN_HEADERS,
      "Content-Type": CONTENT_TYPES[path.extname(name)] ?? "application/octet-stream",
      "Content-Length": String(size),
      "Cache-Control": "no-store",
    });
    if (req.method === "HEAD") return res.end();
    const stream = createReadStream(file);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  }

  function withQuery(url: URL, res: ServerResponse): SignupQuery | null {
    const parsed = parseSignupQuery(url.searchParams);
    if (!parsed.ok) {
      json(res, 400, { error: "Check the filters.", fields: parsed.errors });
      return null;
    }
    return parsed.value;
  }

  /** Returns true when the request was an admin request and has been answered. */
  return async function handleAdmin(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
    const { pathname } = url;
    if (pathname === "/admin") {
      res.writeHead(301, { ...SECURITY_HEADERS, ...ADMIN_HEADERS, Location: "/admin/" });
      res.end();
      return true;
    }
    if (pathname.startsWith("/admin/")) {
      await serveUi(req, res, pathname);
      return true;
    }
    if (!pathname.startsWith("/api/admin/")) return false;

    if (crossSite(req)) {
      json(res, 403, { error: "Cross-site requests are not allowed." });
      return true;
    }
    if (pathname === "/api/admin/login") {
      await login(req, res);
      return true;
    }
    if (pathname === "/api/admin/logout") {
      logout(req, res);
      return true;
    }

    const session = currentSession(req);
    if (!session) {
      json(res, 401, { error: "Please sign in." });
      return true;
    }
    if (req.method !== "GET") {
      json(res, 405, { error: "Method not allowed." }, { Allow: "GET" });
      return true;
    }

    const entries = options.store.list();
    if (pathname === "/api/admin/session") {
      json(res, 200, { authenticated: true, username: options.username, expiresAt: expiresAt(session) });
    } else if (pathname === "/api/admin/overview") {
      json(res, 200, buildOverview(entries, now()));
    } else if (pathname === "/api/admin/signups") {
      const query = withQuery(url, res);
      if (!query) return true;
      const matches = filterEntries(entries, query);
      const start = (query.page - 1) * query.pageSize;
      json(res, 200, {
        generatedAt: now().toISOString(),
        total: matches.length,
        page: query.page,
        pageSize: query.pageSize,
        items: matches.slice(start, start + query.pageSize),
      });
    } else if (pathname.startsWith("/api/admin/signups/")) {
      const id = pathname.slice("/api/admin/signups/".length);
      if (!ID_PATTERN.test(id)) {
        json(res, 400, { error: "Invalid signup id." });
        return true;
      }
      const entry = entries.find((e) => e.id === id);
      if (entry) json(res, 200, { entry });
      else json(res, 404, { error: "Signup not found." });
    } else if (pathname === "/api/admin/export.csv") {
      const query = withQuery(url, res);
      if (!query) return true;
      const rows = filterEntries(entries, { ...query, page: 1, pageSize: 100 });
      const csv = renderCsv(rows);
      const day = now().toISOString().slice(0, 10);
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        ...ADMIN_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="waitlist-export-${day}.csv"`,
        "Cache-Control": "no-store",
      });
      res.end(csv);
    } else {
      json(res, 404, { error: "Not found." });
    }
    return true;
  };
}
