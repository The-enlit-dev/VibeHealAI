import type { ServerResponse } from "node:http";
import type { ApiErrorBody, ErrorCode } from "../../shared/api.js";
import { HTTP_STATUS, IntegrationError } from "../integrations/errors.js";

// Security headers on every response (BK-6).
const BASE_HEADERS: Readonly<Record<string, string>> = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
};

const API_CSP = "default-src 'none'; frame-ancestors 'none'";

export function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    ...BASE_HEADERS,
    "Content-Security-Policy": API_CSP,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

export function sendError(response: ServerResponse, error: IntegrationError): void {
  if (error.retryAfterSeconds !== undefined) response.setHeader("Retry-After", String(error.retryAfterSeconds));
  const body: ApiErrorBody = { error: error.toSafe() };
  sendJson(response, HTTP_STATUS[error.code], body);
}

export function errorOf(code: ErrorCode, message: string): IntegrationError {
  return new IntegrationError(code, message);
}

/** Minimal static page for the provider callback. Echoes nothing from the request. */
export function sendCallbackPage(response: ServerResponse, status: number, title: string, message: string): void {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>BrixoAI</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#1f2328}h1{font-size:1.25rem}</style>
</head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`;
  response.writeHead(status, {
    ...BASE_HEADERS,
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'none'",
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  response.end(html);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}
