import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { CAPABILITY_ID_PATTERN, PROVIDER_ID_PATTERN, RESOURCE_ID_PATTERN, ValidationError, integer, object, optional, string, validate } from "../../shared/validation.js";
import type { ActionService } from "../integrations/action-service.js";
import type { ConnectionManager } from "../integrations/connection-manager.js";
import { IntegrationError } from "../integrations/errors.js";
import { constantTimeEqual } from "../security/ids.js";
import type { Logger } from "../security/logger.js";
import type { Secret } from "../security/secret.js";
import type { AuditLog } from "../storage/audit-log.js";
import { errorOf, sendCallbackPage, sendError, sendJson } from "./respond.js";

const MAX_BODY_BYTES = 64 * 1024;

export interface AppOptions {
  readonly clientToken: Secret;
  /** Accepted Host header values, for example "127.0.0.1:8787" (BK-3). */
  readonly allowedHosts: () => readonly string[];
  readonly connections: ConnectionManager;
  readonly actions: ActionService;
  readonly audit: AuditLog;
  readonly logger: Logger;
}

interface Context {
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
  readonly params: Readonly<Record<string, string>>;
  readonly url: URL;
}

interface Route {
  readonly method: "GET" | "POST" | "DELETE";
  readonly pattern: RegExp;
  readonly auth: boolean;
  readonly handle: (context: Context) => Promise<void>;
}

const P = PROVIDER_ID_PATTERN.source.slice(1, -1);
const R = RESOURCE_ID_PATTERN.source.slice(1, -1);
const C = CAPABILITY_ID_PATTERN.source.slice(1, -1);

const actionBody = object({
  input: optional((value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ValidationError(path, "must be an object");
    return value as Record<string, unknown>;
  }),
  approvalId: optional(string({ max: 80, pattern: RESOURCE_ID_PATTERN })),
});

const approvalBody = object({
  connectionId: string({ max: 80, pattern: RESOURCE_ID_PATTERN }),
  capabilityId: string({ max: 140, pattern: CAPABILITY_ID_PATTERN }),
  input: optional((value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ValidationError(path, "must be an object");
    return value as Record<string, unknown>;
  }),
});

const activityLimit = optional(integer({ min: 1, max: 200 }));

/** Builds the /v1 request handler. Uses only Node's http module (no framework). */
export function createApp(options: AppOptions): RequestListener {
  const routes: Route[] = [
    {
      method: "GET",
      pattern: /^\/v1\/health$/,
      auth: false,
      handle: async ({ response }) => sendJson(response, 200, { status: "ok" }),
    },
    {
      method: "GET",
      pattern: /^\/v1\/providers$/,
      auth: true,
      handle: async ({ response }) => sendJson(response, 200, { providers: await options.connections.listProviders() }),
    },
    {
      method: "GET",
      pattern: new RegExp(`^/v1/providers/(?<providerId>${P})$`),
      auth: true,
      handle: async ({ response, params }) =>
        sendJson(response, 200, { provider: await options.connections.getProvider(params.providerId as string) }),
    },
    {
      method: "POST",
      pattern: new RegExp(`^/v1/providers/(?<providerId>${P})/connect$`),
      auth: true,
      handle: async ({ request, response, params }) => {
        await readJsonBody(request, true);
        sendJson(response, 200, await options.connections.beginConnect(params.providerId as string));
      },
    },
    {
      method: "GET",
      pattern: new RegExp(`^/v1/callback/(?<providerId>${P})$`),
      auth: false,
      handle: async ({ response, params, url }) => {
        try {
          const connection = await options.connections.completeCallback(params.providerId as string, url.searchParams);
          sendCallbackPage(response, 200, "Connected", `VibeHeal is now connected (${connection.accountLabel}). You can close this window and return to VibeHeal.`);
        } catch (error) {
          const failure = error instanceof IntegrationError ? error : errorOf("internal_error", "Something went wrong.");
          sendCallbackPage(response, 400, "Connection not completed", `${failure.message} You can close this window.`);
        }
      },
    },
    {
      method: "GET",
      pattern: /^\/v1\/connections$/,
      auth: true,
      handle: async ({ response }) => sendJson(response, 200, { connections: await options.connections.listConnections() }),
    },
    {
      method: "DELETE",
      pattern: new RegExp(`^/v1/connections/(?<connectionId>${R})$`),
      auth: true,
      handle: async ({ response, params }) => sendJson(response, 200, await options.connections.disconnect(params.connectionId as string)),
    },
    {
      method: "POST",
      pattern: new RegExp(`^/v1/connections/(?<connectionId>${R})/actions/(?<capabilityId>${C})$`),
      auth: true,
      handle: async ({ request, response, params }) => {
        const body = parse(actionBody, (await readJsonBody(request, true)) ?? {});
        sendJson(
          response,
          200,
          await options.actions.execute(params.connectionId as string, params.capabilityId as string, body.input ?? {}, body.approvalId),
        );
      },
    },
    {
      method: "POST",
      pattern: /^\/v1\/approvals$/,
      auth: true,
      handle: async ({ request, response }) => {
        const body = parse(approvalBody, await readJsonBody(request, false));
        sendJson(response, 201, { approval: await options.actions.createApproval(body.connectionId, body.capabilityId, body.input ?? {}) });
      },
    },
    {
      method: "POST",
      pattern: new RegExp(`^/v1/approvals/(?<approvalId>${R})/approve$`),
      auth: true,
      handle: async ({ request, response, params }) => {
        await readJsonBody(request, true);
        sendJson(response, 200, { approval: await options.actions.approve(params.approvalId as string) });
      },
    },
    {
      method: "GET",
      pattern: /^\/v1\/activity$/,
      auth: true,
      handle: async ({ response, url }) => {
        const raw = url.searchParams.get("limit");
        const limit = parse(activityLimit, raw === null ? undefined : Number(raw)) ?? 50;
        sendJson(response, 200, { activity: await options.audit.list(limit) });
      },
    },
  ];

  return (request, response) => {
    handleRequest(request, response, routes, options).catch((error: unknown) => {
      options.logger.error("Unhandled request error", { errorName: error instanceof Error ? error.name : typeof error });
      if (!response.headersSent) sendError(response, errorOf("internal_error", "Internal error."));
      else response.destroy();
    });
  };
}

async function handleRequest(request: IncomingMessage, response: ServerResponse, routes: Route[], options: AppOptions): Promise<void> {
  try {
    // DNS-rebinding protection: only our own Host values are accepted (BK-3).
    if (!options.allowedHosts().includes(request.headers.host ?? "")) {
      throw errorOf("forbidden", "Unexpected host.");
    }
    const url = new URL(request.url ?? "/", "http://backend.invalid");
    const candidates = routes.filter((route) => route.pattern.test(url.pathname));
    if (candidates.length === 0) throw errorOf("not_found", "Not found.");
    const route = candidates.find((candidate) => candidate.method === request.method);
    if (!route) {
      response.setHeader("Allow", candidates.map((candidate) => candidate.method).join(", "));
      sendJson(response, 405, { error: { code: "bad_request", message: "Method not allowed." } });
      return;
    }
    if (route.auth) authenticate(request, options.clientToken);
    const params = (route.pattern.exec(url.pathname)?.groups ?? {}) as Record<string, string>;
    await route.handle({ request, response, params, url });
  } catch (error) {
    if (error instanceof IntegrationError) {
      sendError(response, error);
      return;
    }
    throw error;
  }
}

/** Bearer-token check for the local owner (BK-2). Browsers are rejected (BK-3). */
function authenticate(request: IncomingMessage, token: Secret): void {
  if (request.headers.origin !== undefined || request.headers["sec-fetch-site"] !== undefined) {
    throw errorOf("forbidden", "Browser requests are not accepted.");
  }
  const header = request.headers.authorization ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{1,256})$/.exec(header);
  if (!match || !constantTimeEqual(match[1] as string, token.reveal())) {
    throw errorOf("unauthorized", "Missing or invalid access token.");
  }
}

/** Reads a JSON body with a size cap and content-type check (BK-4). */
async function readJsonBody(request: IncomingMessage, allowEmpty: boolean): Promise<unknown> {
  const declared = Number(request.headers["content-length"] ?? "0");
  if (declared > MAX_BODY_BYTES) throw errorOf("payload_too_large", "Request body is too large.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw errorOf("payload_too_large", "Request body is too large.");
    chunks.push(chunk as Buffer);
  }
  if (size === 0) {
    if (allowEmpty) return undefined;
    throw errorOf("bad_request", "A JSON body is required.");
  }
  const type = request.headers["content-type"] ?? "";
  if (!/^application\/json(;\s*charset=utf-8)?$/i.test(type)) {
    throw errorOf("unsupported_media_type", "Content-Type must be application/json.");
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw errorOf("bad_request", "The request body is not valid JSON.");
  }
}

function parse<T>(validator: (value: unknown, path: string) => T, value: unknown): T {
  try {
    return validate(validator, value);
  } catch (error) {
    if (error instanceof ValidationError) throw errorOf("bad_request", `Invalid request: ${error.message}`);
    throw error;
  }
}
