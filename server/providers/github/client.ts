import { IntegrationError } from "../../integrations/errors.js";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const API_BASE = "https://api.github.com";
const WEB_BASE = "https://github.com";
const TIMEOUT_MS = 15_000;

export interface GitHubRequest {
  readonly method?: "GET" | "POST" | "DELETE";
  /** Path on api.github.com (or github.com when `web` is true), starting with "/". */
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | undefined>>;
  /** Full Authorization header value, for example "Bearer <token>". */
  readonly authorization?: string;
  readonly body?: unknown;
  readonly web?: boolean;
}

/**
 * Minimal GitHub HTTP client (BK-8):
 * - only the fixed GitHub hosts, over HTTPS;
 * - a timeout on every request, and redirects are not followed;
 * - error responses become safe IntegrationErrors, and response bodies are never
 *   copied into them, since they could contain tokens or untrusted text.
 */
export class GitHubClient {
  constructor(private readonly fetchImpl: FetchLike) {}

  async request<T>(request: GitHubRequest): Promise<T | undefined> {
    if (!request.path.startsWith("/") || request.path.includes("..") || request.path.includes("//")) {
      throw new Error("Invalid GitHub request path");
    }
    const url = new URL(request.path, request.web ? WEB_BASE : API_BASE);
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = {
      Accept: request.web ? "application/json" : "application/vnd.github+json",
      "User-Agent": "BrixoAI-backend",
    };
    if (!request.web) headers["X-GitHub-Api-Version"] = "2022-11-28";
    if (request.authorization) headers.Authorization = request.authorization;
    if (request.body !== undefined) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method: request.method ?? "GET",
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        ...(request.body !== undefined ? { body: JSON.stringify(request.body) } : {}),
      });
    } catch (error) {
      throw new IntegrationError("provider_error", "Could not reach GitHub. Check your connection and try again.", { cause: error });
    }

    if (response.status === 204) return undefined;
    if (!response.ok) throw mapError(response);
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new IntegrationError("provider_error", "GitHub returned an unreadable response.", { cause: error });
    }
  }
}

function mapError(response: Response): IntegrationError {
  const remaining = response.headers.get("x-ratelimit-remaining");
  const retryAfter = Number(response.headers.get("retry-after") ?? "");
  if (response.status === 429 || (response.status === 403 && (remaining === "0" || Number.isFinite(retryAfter) && retryAfter > 0))) {
    const reset = Number(response.headers.get("x-ratelimit-reset") ?? "");
    const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : Number.isFinite(reset) && reset > 0 ? Math.max(0, reset - Math.floor(Date.now() / 1000)) : 60;
    return new IntegrationError("rate_limited", "GitHub's rate limit was reached. Try again later.", { retryAfterSeconds: seconds });
  }
  if (response.status === 401) {
    return new IntegrationError("provider_unauthorized", "GitHub rejected BrixoAI's authorization. Reconnect GitHub.");
  }
  if (response.status === 403) {
    return new IntegrationError("forbidden", "GitHub denied access. The app may not have permission for this repository.");
  }
  if (response.status === 404) {
    return new IntegrationError("not_found", "Not found on GitHub, or not shared with the BrixoAI app.");
  }
  if (response.status === 422) return new IntegrationError("bad_request", "GitHub rejected the request.");
  return new IntegrationError("provider_error", `GitHub returned an error (HTTP ${response.status}).`);
}
