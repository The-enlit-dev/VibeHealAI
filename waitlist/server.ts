// HTTP handler for the public waitlist and the static marketing site.
// Built on node:http only (no framework), like the existing backend.
//
// Routes:
//   POST /api/waitlist   JSON signup (validated, rate-limited, de-duplicated)
//   GET  /...            static files from the website/ folder only
//
// The admin report and CSV export are NOT routes. They are CLI commands (see cli.ts),
// so nothing personal is reachable over HTTP.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { validateSignup } from "./validation.js";
import type { SignupStore } from "./store.js";

export const SUCCESS_MESSAGE =
  "Thanks! You're on the early-access list. We'll only contact you about BrixoAI early access.";

export interface WaitlistAppOptions {
  store: SignupStore;
  /** Folder with the static site. Omit to serve the API only. */
  websiteDir?: string;
  /** Origins allowed to call the API from another site. Empty means same-origin only. */
  allowedOrigins?: readonly string[];
  now?: () => Date;
  rateLimit?: { maxRequests: number; windowMs: number };
  maxBodyBytes?: number;
  logError?: (message: string) => void;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

export function createWaitlistHandler(options: WaitlistAppOptions) {
  const now = options.now ?? (() => new Date());
  const maxBodyBytes = options.maxBodyBytes ?? 16 * 1024;
  const rateLimit = options.rateLimit ?? { maxRequests: 5, windowMs: 10 * 60 * 1000 };
  const allowedOrigins = new Set(options.allowedOrigins ?? []);
  const attempts = new Map<string, { count: number; resetAt: number }>();
  const logError = options.logError ?? (() => undefined);

  function rateLimited(ip: string, nowMs: number): boolean {
    // Prune expired windows so the map cannot grow without bound.
    if (attempts.size > 10_000) {
      for (const [key, value] of attempts) if (value.resetAt <= nowMs) attempts.delete(key);
    }
    const current = attempts.get(ip);
    if (!current || current.resetAt <= nowMs) {
      attempts.set(ip, { count: 1, resetAt: nowMs + rateLimit.windowMs });
      return false;
    }
    current.count += 1;
    return current.count > rateLimit.maxRequests;
  }

  function sendJson(req: IncomingMessage, res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
    const headers: Record<string, string> = {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    };
    applyCors(req, res);
    res.writeHead(status, headers);
    res.end(JSON.stringify(body));
  }

  function applyCors(req: IncomingMessage, res: ServerResponse) {
    const origin = req.headers.origin;
    if (typeof origin === "string" && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
  }

  function readBody(req: IncomingMessage): Promise<string | "too-large"> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let tooLarge = false;
      req.on("data", (chunk: Buffer) => {
        if (tooLarge) return;
        size += chunk.length;
        if (size > maxBodyBytes) {
          tooLarge = true;
          resolve("too-large");
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        if (!tooLarge) resolve(Buffer.concat(chunks).toString("utf8"));
      });
      req.on("error", reject);
    });
  }

  async function handleSignup(req: IncomingMessage, res: ServerResponse) {
    if (req.method === "OPTIONS") {
      applyCors(req, res);
      res.writeHead(204, SECURITY_HEADERS);
      res.end();
      return;
    }
    if (req.method !== "POST") {
      sendJson(req, res, 405, { error: "Method not allowed." }, { Allow: "POST, OPTIONS" });
      return;
    }

    const ip = req.socket.remoteAddress ?? "unknown";
    if (rateLimited(ip, now().getTime())) {
      sendJson(req, res, 429, { error: "Too many attempts. Please try again in a few minutes." }, { "Retry-After": "600" });
      return;
    }

    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      sendJson(req, res, 415, { error: "Please send the form as JSON." });
      return;
    }

    const body = await readBody(req);
    if (body === "too-large") {
      sendJson(req, res, 413, { error: "The form data is too large." });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      sendJson(req, res, 400, { error: "Please send the form again." });
      return;
    }

    const outcome = validateSignup(parsed);
    if (outcome.kind === "invalid") {
      sendJson(req, res, 400, { error: "Please fix the highlighted fields.", fields: outcome.errors });
      return;
    }
    if (outcome.kind === "honeypot") {
      // Bots get the same answer as people, but nothing is stored.
      sendJson(req, res, 200, { status: "ok", message: SUCCESS_MESSAGE });
      return;
    }

    try {
      // Duplicates return the same success message, so the form does not reveal who is on the list.
      await options.store.add(outcome.value, now());
      sendJson(req, res, 200, { status: "ok", message: SUCCESS_MESSAGE });
    } catch (error) {
      logError(`waitlist store error: ${(error as Error).name}`);
      sendJson(req, res, 500, { error: "Something went wrong. Please try again in a moment." });
    }
  }

  async function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string) {
    if (!options.websiteDir) {
      sendJson(req, res, 404, { error: "Not found." });
      return;
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      sendJson(req, res, 400, { error: "Bad request." });
      return;
    }
    if (decoded.includes("\0")) {
      sendJson(req, res, 400, { error: "Bad request." });
      return;
    }

    const root = path.resolve(options.websiteDir);
    const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
    const target = path.resolve(root, relative);
    // Path-traversal guard: the resolved file must stay inside the website folder.
    if (target !== root && !target.startsWith(root + path.sep)) {
      sendJson(req, res, 404, { error: "Not found." });
      return;
    }
    const extension = path.extname(target).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) {
      sendJson(req, res, 404, { error: "Not found." });
      return;
    }

    let info;
    try {
      info = await stat(target);
    } catch {
      sendJson(req, res, 404, { error: "Not found." });
      return;
    }
    if (!info.isFile()) {
      sendJson(req, res, 404, { error: "Not found." });
      return;
    }

    res.writeHead(200, {
      ...SECURITY_HEADERS,
      "Content-Type": contentType,
      "Content-Length": String(info.size),
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(target);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  }

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/api/waitlist") {
        await handleSignup(req, res);
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        sendJson(req, res, 404, { error: "Not found." });
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        sendJson(req, res, 405, { error: "Method not allowed." }, { Allow: "GET, HEAD" });
        return;
      }
      await serveStatic(req, res, url.pathname);
    } catch (error) {
      logError(`request error: ${(error as Error).name}`);
      if (!res.headersSent) sendJson(req, res, 500, { error: "Something went wrong." });
      else res.destroy();
    }
  };
}
