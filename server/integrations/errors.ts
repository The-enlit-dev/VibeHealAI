import type { ErrorCode, SafeError } from "../../shared/api.js";

/**
 * The only error type that may cross the API boundary. `message` must be safe to show
 * to the user: no tokens, provider response bodies or internal paths (BK-5).
 * Low-level causes are kept on `cause` for server-side debugging only.
 */
export class IntegrationError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    options?: { cause?: unknown; retryAfterSeconds?: number },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "IntegrationError";
    if (options?.retryAfterSeconds !== undefined) this.retryAfterSeconds = options.retryAfterSeconds;
  }

  retryAfterSeconds?: number;

  toSafe(): SafeError {
    return { code: this.code, message: this.message };
  }
}

export const HTTP_STATUS: Readonly<Record<ErrorCode, number>> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  not_configured: 409,
  not_available: 409,
  approval_required: 403,
  invalid_state: 400,
  provider_error: 502,
  provider_unauthorized: 502,
  rate_limited: 429,
  backend_unreachable: 503,
  internal_error: 500,
};
