import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// The desktop app reads only its own small config file (.env.desktop): the backend URL
// and the local access token. It never reads the backend's .env, which holds the
// encryption key and provider secrets (CR-1).

export interface DesktopConfig {
  readonly backendUrl: URL;
  /** null when the desktop app has not been set up yet (shown as a setup error). */
  readonly clientToken: string | null;
}

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function parseDesktopConfig(values: Readonly<Record<string, string | undefined>>): DesktopConfig {
  const rawUrl = values.BRIXO_BACKEND_URL?.trim() || "http://127.0.0.1:8787";
  const backendUrl = new URL(rawUrl);
  if (backendUrl.protocol !== "https:" && !(backendUrl.protocol === "http:" && LOOPBACK.has(backendUrl.hostname))) {
    throw new Error("BRIXO_BACKEND_URL must use https, or http on a loopback address.");
  }
  if (backendUrl.username || backendUrl.password || backendUrl.search || backendUrl.hash) {
    throw new Error("BRIXO_BACKEND_URL must not contain credentials, a query or a fragment.");
  }
  const token = values.BRIXO_CLIENT_TOKEN?.trim();
  return { backendUrl, clientToken: token && /^[A-Za-z0-9_-]{43,256}$/.test(token) ? token : null };
}

/** Reads .env.desktop if present; otherwise falls back to two process variables only. */
export function loadDesktopConfig(file: string): DesktopConfig {
  let values: Record<string, string | undefined>;
  try {
    values = parseEnv(readFileSync(file, "utf8"));
  } catch {
    values = { BRIXO_BACKEND_URL: process.env.BRIXO_BACKEND_URL, BRIXO_CLIENT_TOKEN: process.env.BRIXO_CLIENT_TOKEN };
  }
  return parseDesktopConfig({ BRIXO_BACKEND_URL: values.BRIXO_BACKEND_URL, BRIXO_CLIENT_TOKEN: values.BRIXO_CLIENT_TOKEN });
}
