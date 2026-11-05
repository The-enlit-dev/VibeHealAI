import type { ApiErrorBody, SafeError } from "../../shared/api.js";
import { ERROR_CODES } from "../../shared/api.js";
import type { BridgeResult } from "../../shared/ipc.js";
import type { DesktopConfig } from "./desktop-config.js";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Calls the VibeHeal backend from the main process. The access token stays here; the
 * renderer only ever receives plain results (CR-1). Errors are reduced to safe codes.
 */
export class BackendClient {
  constructor(
    private readonly config: DesktopConfig,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
  ) {}

  get backendUrl(): string {
    return this.config.backendUrl.origin;
  }

  get configured(): boolean {
    return this.config.clientToken !== null;
  }

  async request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<BridgeResult<T>> {
    if (!this.config.clientToken) {
      return fail("unauthorized", "The desktop app is not set up yet. Run `npm run setup:env`, then restart VibeHeal.");
    }
    let response: Response;
    try {
      response = await this.fetchImpl(new URL(path, this.config.backendUrl).toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.config.clientToken}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      return fail("backend_unreachable", `The VibeHeal backend is not reachable at ${this.backendUrl}. Start it with \`npm run dev:server\`.`);
    }
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return fail("internal_error", "The backend returned an unreadable response.");
    }
    if (!response.ok) return { ok: false, error: safeError(parsed) };
    return { ok: true, data: parsed as T };
  }

  async health(): Promise<boolean> {
    try {
      const response = await this.fetchImpl(new URL("/v1/health", this.config.backendUrl).toString(), {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

function fail<T>(code: SafeError["code"], message: string): BridgeResult<T> {
  return { ok: false, error: { code, message } };
}

function safeError(body: unknown): SafeError {
  const error = (body as Partial<ApiErrorBody> | null)?.error;
  if (error && typeof error.message === "string" && (ERROR_CODES as readonly string[]).includes(error.code)) {
    return { code: error.code, message: error.message.slice(0, 500) };
  }
  return { code: "internal_error", message: "The backend returned an error." };
}
