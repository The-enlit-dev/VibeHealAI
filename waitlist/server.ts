// HTTP handler for the public waitlist, the static website and (when configured) the private admin area.
// Built on node:http only (no framework), like the existing backend.
//
// Public routes:
//   POST /api/waitlist   JSON signup (validated, rate-limited, de-duplicated)
//   GET  /...            static files from the website/ folder only
// Admin routes (only when an admin account is configured, see admin.ts):
//   /admin/              dashboard page (contains no data itself)
//   /api/admin/*         session-protected JSON and CSV endpoints
// There is no other way to read signups over HTTP.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { validateSignup } from "./validation.js";
import type { SignupStore } from "./store.js";
import { CONTENT_TYPES, SECURITY_HEADERS, WindowCounter, clientIp, readBody, writeJson } from "./http-util.js";

export const SUCCESS_MESSAGE =
  "Thanks! You're on the early-access list. We'll only contact you about early access to this project.";

export type AdminHandler = (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean>;

export interface WaitlistAppOptions {
  store: SignupStore;
  /** Folder with the static site. Omit to serve the API only. */
  websiteDir?: string;
  /** Origins allowed to call the signup API from another site. Empty means same-origin only. */
  allowedOrigins?: readonly string[];
  /** Private admin area. Omit to disable it (its routes then return 404). */
  admin?: AdminHandler;
  now?: () => Date;
  rateLimit?: { maxRequests: number; windowMs: number };
  maxBodyBytes?: number;
  logError?: (message: string) => void;
}

async function fileSize(file: string): Promise<number | null> {
  try {
    const info = await stat(file);
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
}

async function isDirectory(dir: string): Promise<boolean> {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

export { SECURITY_HEADERS };

export function createWaitlistHandler(options: WaitlistAppOptions) {
  const now = options.now ?? (() => new Date());
  const maxBodyBytes = options.maxBodyBytes ?? 16 * 1024;
  const rateLimit = options.rateLimit ?? { maxRequests: 5, windowMs: 10 * 60 * 1000 };
  const signupAttempts = new WindowCounter(rateLimit.maxRequests, rateLimit.windowMs);
  const allowedOrigins = new Set(options.allowedOrigins ?? []);
  const logError = options.logError ?? (() => undefined);

  function applyCors(req: IncomingMessage, res: ServerResponse) {
    const origin = req.headers.origin;
    if (typeof origin === "string" && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
  }

  function sendJson(req: IncomingMessage, res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
    applyCors(req, res);
    writeJson(res, status, body, extra);
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

    if (signupAttempts.hit(clientIp(req), now().getTime())) {
      sendJson(req, res, 429, { error: "Too many attempts. Please try again in a few minutes." }, { "Retry-After": "600" });
      return;
    }

    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      sendJson(req, res, 415, { error: "Please send the form as JSON." });
      return;
    }

    const body = await readBody(req, maxBodyBytes);
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

  async function sendFile(req: IncomingMessage, res: ServerResponse, file: string, size: number, status = 200) {
    const contentType = CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(status, {
      ...SECURITY_HEADERS,
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(file);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  }

  async function notFound(req: IncomingMessage, res: ServerResponse, root: string | null) {
    if (root) {
      const page = path.join(root, "404.html");
      const size = await fileSize(page);
      if (size !== null) {
        await sendFile(req, res, page, size, 404);
        return;
      }
    }
    sendJson(req, res, 404, { error: "Not found." });
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
    const relative = decoded.replace(/^\/+/, "") + (decoded.endsWith("/") ? "index.html" : "");
    const target = path.resolve(root, relative);
    // Path-traversal guard: the resolved file must stay inside the website folder.
    if (target !== root && !target.startsWith(root + path.sep)) {
      await notFound(req, res, root);
      return;
    }

    const extension = path.extname(target).toLowerCase();
    if (!extension) {
      // "/faq" -> "/faq/" when that folder has an index page, matching Netlify's pretty URLs.
      if ((await isDirectory(target)) && (await fileSize(path.join(target, "index.html"))) !== null) {
        res.writeHead(301, { ...SECURITY_HEADERS, Location: `${pathname}/` });
        res.end();
        return;
      }
      await notFound(req, res, root);
      return;
    }
    if (!CONTENT_TYPES[extension]) {
      await notFound(req, res, root);
      return;
    }
    const size = await fileSize(target);
    if (size === null) {
      await notFound(req, res, root);
      return;
    }
    await sendFile(req, res, target, size);
  }

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/api/waitlist") {
        await handleSignup(req, res);
        return;
      }
      if (options.admin && (await options.admin(req, res, url))) return;
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
      if (!res.headersSent) writeJson(res, 500, { error: "Something went wrong." });
      else res.destroy();
    }
  };
}
