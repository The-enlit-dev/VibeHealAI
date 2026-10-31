import type { GitHubAppConfig, ProviderConfigs } from "../../config.js";
import type {
  BeginConnectInput,
  Capability,
  CompleteConnectInput,
  CompletedConnection,
  ConnectionHandle,
  ConfigurationStatus,
  ProviderAdapter,
  RevokeResult,
} from "../../integrations/adapter.js";
import { IntegrationError } from "../../integrations/errors.js";
import { Secret } from "../../security/secret.js";
import { createAppJwt } from "./app-jwt.js";
import { createGitHubCapabilities } from "./capabilities.js";
import { type FetchLike, GitHubClient } from "./client.js";
import { GITHUB_APP_PERMISSION_MAP, GITHUB_METADATA } from "./metadata.js";

// GitHub App connection flow (IM2). Facts about GitHub's flow that could not be
// re-checked against docs.github.com on 2026-10-31 are marked [U14].
//
// 1. beginConnect sends the user to https://github.com/apps/<slug>/installations/new?state=…
// 2. The App is registered with "Request user authorization (OAuth) during installation",
//    so GitHub redirects to the callback with installation_id, setup_action, code and state [U14].
// 3. completeConnect does not trust installation_id on its own (IN-10). It:
//    a. exchanges `code` for a short-lived user token;
//    b. checks the installation appears in GET /user/installations for that user;
//    c. revokes the user token, which is not needed after this check;
//    d. reads the installation with the App JWT and refuses any non-read permission.
// 4. API calls use 1-hour installation tokens minted on demand and cached in memory only.

const INSTALLATION_ID = /^\d{1,15}$/;
const OAUTH_CODE = /^[A-Za-z0-9_-]{8,128}$/;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface InstallationResponse {
  readonly id: number;
  readonly account?: { readonly login?: string } | null;
  readonly permissions?: Readonly<Record<string, string>>;
  readonly html_url?: string;
  readonly suspended_at?: string | null;
}

interface CachedToken {
  readonly token: Secret;
  readonly expiresAt: number;
}

export interface GitHubAdapterOptions {
  readonly config: ProviderConfigs["github"];
  readonly fetch: FetchLike;
  readonly now?: () => Date;
}

export class GitHubAdapter implements ProviderAdapter {
  readonly metadata = GITHUB_METADATA;
  readonly capabilities: readonly Capability[];
  readonly #config: GitHubAppConfig | undefined;
  readonly #missing: readonly string[];
  readonly #client: GitHubClient;
  readonly #now: () => Date;
  readonly #tokens = new Map<string, CachedToken>();

  constructor(options: GitHubAdapterOptions) {
    this.#config = "appId" in options.config ? options.config : undefined;
    this.#missing = "missing" in options.config ? options.config.missing : [];
    this.#client = new GitHubClient(options.fetch);
    this.#now = options.now ?? (() => new Date());
    this.capabilities = createGitHubCapabilities({
      client: this.#client,
      authorization: (handle) => this.#installationAuthorization(handle.externalAccountId),
    });
  }

  configuration(): ConfigurationStatus {
    return { configured: this.#config !== undefined, missing: this.#missing };
  }

  async beginConnect(input: BeginConnectInput): Promise<{ authorizationUrl: string }> {
    const config = this.#requireConfig();
    const url = new URL(`https://github.com/apps/${encodeURIComponent(config.slug)}/installations/new`);
    url.searchParams.set("state", input.state);
    return { authorizationUrl: url.toString() };
  }

  async completeConnect(input: CompleteConnectInput): Promise<CompletedConnection> {
    const config = this.#requireConfig();
    const installationId = input.query.get("installation_id") ?? "";
    const setupAction = input.query.get("setup_action") ?? "";
    const code = input.query.get("code") ?? "";

    if (setupAction === "request") {
      throw new IntegrationError("invalid_state", "An organisation owner must approve the BrixoAI app before it can be connected.");
    }
    if (!INSTALLATION_ID.test(installationId)) {
      throw new IntegrationError("bad_request", "GitHub did not return a valid installation.");
    }
    if (!OAUTH_CODE.test(code)) {
      throw new IntegrationError(
        "bad_request",
        "GitHub did not return a user authorization code. Enable \"Request user authorization (OAuth) during installation\" in the GitHub App settings.",
      );
    }

    const userToken = await this.#exchangeCode(config, code, input.callbackUrl);
    try {
      await this.#assertUserCanAccess(userToken, installationId);
    } finally {
      await this.#revokeUserToken(config, userToken);
    }

    const installation = await this.#client.request<InstallationResponse>({
      path: `/app/installations/${installationId}`,
      authorization: `Bearer ${createAppJwt(config.clientId, config.privateKey, this.#now())}`,
    });
    if (!installation || String(installation.id) !== installationId) {
      throw new IntegrationError("provider_error", "GitHub returned unexpected installation details.");
    }
    if (installation.suspended_at) throw new IntegrationError("invalid_state", "This GitHub App installation is suspended.");

    return {
      externalAccountId: installationId,
      accountLabel: sanitizeLabel(installation.account?.login) ?? `Installation ${installationId}`,
      grantedPermissions: mapPermissions(installation.permissions ?? {}),
      credentials: null,
      ...(isGitHubWebUrl(installation.html_url) ? { manageUrl: installation.html_url } : {}),
    };
  }

  async revoke(connection: ConnectionHandle): Promise<RevokeResult> {
    const cached = this.#tokens.get(connection.externalAccountId);
    this.#tokens.delete(connection.externalAccountId);
    if (cached && cached.expiresAt > this.#now().getTime()) {
      try {
        await this.#client.request({ method: "DELETE", path: "/installation/token", authorization: `Bearer ${cached.token.reveal()}` });
      } catch {
        // The token expires within an hour anyway. Removal from GitHub settings is still needed.
      }
    }
    return {
      outcome: "manual_required",
      message: "BrixoAI has forgotten this installation and revoked its current token. To remove the app completely, uninstall it in your GitHub settings.",
    };
  }

  #requireConfig(): GitHubAppConfig {
    if (!this.#config) throw new IntegrationError("not_configured", "GitHub is not configured on this backend.");
    return this.#config;
  }

  async #exchangeCode(config: GitHubAppConfig, code: string, callbackUrl: string): Promise<Secret> {
    const response = await this.#client.request<{ access_token?: unknown; error?: unknown }>({
      method: "POST",
      web: true,
      path: "/login/oauth/access_token",
      body: { client_id: config.clientId, client_secret: config.clientSecret.reveal(), code, redirect_uri: callbackUrl },
    });
    if (!response || typeof response.access_token !== "string" || response.access_token.length === 0) {
      throw new IntegrationError("provider_unauthorized", "GitHub did not accept the authorization. Start the connection again.");
    }
    return new Secret(response.access_token);
  }

  async #assertUserCanAccess(userToken: Secret, installationId: string): Promise<void> {
    for (let page = 1; page <= 10; page += 1) {
      const response = await this.#client.request<{ installations?: readonly { id: number }[] }>({
        path: "/user/installations",
        query: { per_page: 100, page },
        authorization: `Bearer ${userToken.reveal()}`,
      });
      const installations = response?.installations ?? [];
      if (installations.some((item) => String(item.id) === installationId)) return;
      if (installations.length < 100) break;
    }
    throw new IntegrationError("forbidden", "Your GitHub account cannot access this installation.");
  }

  async #revokeUserToken(config: GitHubAppConfig, userToken: Secret): Promise<void> {
    const basic = Buffer.from(`${config.clientId}:${config.clientSecret.reveal()}`, "utf8").toString("base64");
    try {
      await this.#client.request({
        method: "DELETE",
        path: `/applications/${encodeURIComponent(config.clientId)}/token`,
        authorization: `Basic ${basic}`,
        body: { access_token: userToken.reveal() },
      });
    } catch {
      // Best effort. GitHub user tokens from Apps also expire on their own.
    }
  }

  async #installationAuthorization(installationId: string): Promise<string> {
    const config = this.#requireConfig();
    const cached = this.#tokens.get(installationId);
    if (cached && cached.expiresAt - TOKEN_REFRESH_MARGIN_MS > this.#now().getTime()) return `Bearer ${cached.token.reveal()}`;

    const response = await this.#client.request<{ token?: unknown; expires_at?: unknown }>({
      method: "POST",
      path: `/app/installations/${installationId}/access_tokens`,
      authorization: `Bearer ${createAppJwt(config.clientId, config.privateKey, this.#now())}`,
    });
    if (!response || typeof response.token !== "string" || typeof response.expires_at !== "string") {
      throw new IntegrationError("provider_error", "GitHub did not issue an access token.");
    }
    const token = new Secret(response.token);
    this.#tokens.set(installationId, { token, expiresAt: Date.parse(response.expires_at) });
    return `Bearer ${token.reveal()}`;
  }
}

/**
 * Maps the installation's permissions to BrixoAI permission ids. Refuses anything above
 * read access: the BrixoAI GitHub App must be read-only (IN-2, DEC-21).
 */
export function mapPermissions(permissions: Readonly<Record<string, string>>): string[] {
  const granted: string[] = [];
  for (const [name, level] of Object.entries(permissions)) {
    if (level !== "read") {
      throw new IntegrationError(
        "forbidden",
        "The BrixoAI GitHub App has more than read-only permissions. Change it to read-only before connecting.",
      );
    }
    const mapped = GITHUB_APP_PERMISSION_MAP[name];
    if (mapped) granted.push(mapped);
  }
  return granted;
}

export function isGitHubWebUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function sanitizeLabel(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9-]{1,39}$/.test(value) ? value : undefined;
}
