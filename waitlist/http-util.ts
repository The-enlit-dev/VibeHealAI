// Small HTTP helpers shared by the public waitlist handler and the admin handler.

import type { IncomingMessage, ServerResponse } from "node:http";

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

export const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

export function writeJson(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}): void {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extra,
  });
  res.end(JSON.stringify(body));
}

/** Reads a request body up to maxBytes. Resolves "too-large" instead of buffering more. */
export function readBody(req: IncomingMessage, maxBytes: number): Promise<string | "too-large"> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk: Buffer) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > maxBytes) {
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

export function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unknown";
}

/** Parses the Cookie header without trusting it. Returns an empty map on anything odd. */
export function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header || header.length > 4096) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name && !cookies.has(name)) cookies.set(name, value);
  }
  return cookies;
}

/** Fixed-window counter keyed by a string (an IP address or "global"). */
export class WindowCounter {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Adds one and reports whether the key is now over the limit. */
  hit(key: string, nowMs: number): boolean {
    this.prune(nowMs);
    const current = this.entries.get(key);
    if (!current || current.resetAt <= nowMs) {
      this.entries.set(key, { count: 1, resetAt: nowMs + this.windowMs });
      return 1 > this.limit;
    }
    current.count += 1;
    return current.count > this.limit;
  }

  /** Reports whether the key is already at or over the limit, without counting. */
  blocked(key: string, nowMs: number): boolean {
    const current = this.entries.get(key);
    return Boolean(current && current.resetAt > nowMs && current.count >= this.limit);
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private prune(nowMs: number): void {
    if (this.entries.size < 10_000) return;
    for (const [key, value] of this.entries) if (value.resetAt <= nowMs) this.entries.delete(key);
  }
}
