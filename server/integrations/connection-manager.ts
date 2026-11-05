import type {
  ConnectStartResult,
  ConnectionView,
  DisconnectResult,
  ProviderDetail,
  ProviderSummary,
} from "../../shared/api.js";
import type { CredentialVault } from "../credentials/vault.js";
import { newId, newStateToken, sha256Hex } from "../security/ids.js";
import type { Logger } from "../security/logger.js";
import type { AuditLog } from "../storage/audit-log.js";
import type { Collection } from "../storage/collection.js";
import type { ConnectionHandle, ProviderAdapter, RevokeResult } from "./adapter.js";
import { computeAvailability } from "./availability.js";
import { IntegrationError } from "./errors.js";
import type { ProviderRegistry } from "./registry.js";
import type { AuthorizationStateRecord, ConnectionRecord } from "./records.js";

const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface ConnectionManagerOptions {
  readonly registry: ProviderRegistry;
  readonly connections: Collection<ConnectionRecord>;
  readonly states: Collection<AuthorizationStateRecord>;
  readonly vault: CredentialVault;
  readonly audit: AuditLog;
  readonly logger: Logger;
  readonly publicUrl: URL;
  readonly stateTtlMs?: number;
  readonly now?: () => Date;
}

/** Wraps unexpected adapter failures so no raw provider detail reaches the client (BK-5). */
export function toIntegrationError(error: unknown, logger: Logger, context: string): IntegrationError {
  if (error instanceof IntegrationError) return error;
  logger.error(`${context} failed unexpectedly`, { errorName: error instanceof Error ? error.name : typeof error });
  return new IntegrationError("provider_error", "The provider request failed. Try again later.");
}

/**
 * Owns the connection lifecycle: start authorization, verify the callback, store
 * credentials in the vault, report status, disconnect and revoke (CR-5, IN-5, IN-8).
 */
export class ConnectionManager {
  readonly #options: ConnectionManagerOptions;
  readonly #stateTtlMs: number;
  readonly #now: () => Date;

  constructor(options: ConnectionManagerOptions) {
    this.#options = options;
    this.#stateTtlMs = options.stateTtlMs ?? 10 * 60 * 1000;
    this.#now = options.now ?? (() => new Date());
  }

  async listProviders(): Promise<ProviderSummary[]> {
    const connections = await this.#options.connections.list();
    return this.#options.registry.list().map((adapter) =>
      summary(adapter, connections.find((connection) => connection.providerId === adapter.metadata.id)),
    );
  }

  async getProvider(providerId: string): Promise<ProviderDetail> {
    const adapter = this.#adapter(providerId);
    const connection = await this.#connectionForProvider(providerId);
    const { metadata } = adapter;
    return {
      ...summary(adapter, connection),
      description: metadata.description,
      contextUse: metadata.contextUse,
      websiteUrl: metadata.websiteUrl,
      docsUrl: metadata.docsUrl,
      authorizationHosts: metadata.authorizationHosts,
      permissions: metadata.permissions,
      capabilities: metadata.capabilities,
      notes: metadata.notes,
      missingConfiguration: metadata.implementation === "planned" ? [] : adapter.configuration().missing,
      connection: connection ? toView(connection) : null,
    };
  }

  async listConnections(): Promise<ConnectionView[]> {
    return (await this.#options.connections.list()).map(toView);
  }

  async beginConnect(providerId: string): Promise<ConnectStartResult> {
    const adapter = this.#adapter(providerId);
    if (adapter.metadata.implementation === "planned") {
      throw new IntegrationError("not_available", `${adapter.metadata.name} is not available yet.`);
    }
    if (!adapter.configuration().configured) {
      throw new IntegrationError("not_configured", `${adapter.metadata.name} is not configured on this backend.`);
    }
    const existing = await this.#connectionForProvider(providerId);
    if (existing?.status === "connected") {
      throw new IntegrationError("conflict", `${adapter.metadata.name} is already connected. Disconnect it first.`);
    }

    await this.#pruneExpiredStates();
    const state = newStateToken();
    const now = this.#now();
    const expiresAt = new Date(now.getTime() + this.#stateTtlMs).toISOString();
    await this.#options.states.put({ id: sha256Hex(state), providerId, createdAt: now.toISOString(), expiresAt });

    let authorizationUrl: string;
    try {
      ({ authorizationUrl } = await adapter.beginConnect({ state, callbackUrl: this.callbackUrl(providerId) }));
    } catch (error) {
      await this.#options.states.delete(sha256Hex(state));
      throw toIntegrationError(error, this.#options.logger, "beginConnect");
    }
    assertAuthorizationUrl(authorizationUrl, adapter);
    await this.#options.audit.record({
      action: "connection.started",
      outcome: "success",
      providerId,
      message: `Authorization started for ${adapter.metadata.name}.`,
    });
    return { authorizationUrl, expiresAt };
  }

  /** Handles the provider redirect. The state is verified and consumed before anything else. */
  async completeCallback(providerId: string, query: URLSearchParams): Promise<ConnectionView> {
    const adapter = this.#adapter(providerId);
    const state = query.get("state") ?? "";
    const record = STATE_PATTERN.test(state) ? await this.#options.states.take(sha256Hex(state)) : undefined;
    if (!record || record.providerId !== providerId || Date.parse(record.expiresAt) <= this.#now().getTime()) {
      await this.#options.audit.record({
        action: "connection.failed",
        outcome: "denied",
        providerId,
        message: "Callback rejected: missing, expired or unknown authorization state.",
      });
      throw new IntegrationError("invalid_state", "This authorization link is invalid or has expired. Start again from VibeHeal.");
    }

    const params = new URLSearchParams(query);
    params.delete("state");
    let completed;
    try {
      completed = await adapter.completeConnect({ query: params, callbackUrl: this.callbackUrl(providerId) });
    } catch (error) {
      const failure = toIntegrationError(error, this.#options.logger, "completeConnect");
      await this.#options.audit.record({
        action: "connection.failed",
        outcome: "failure",
        providerId,
        message: `Connection failed: ${failure.message}`,
      });
      throw failure;
    }

    const previous = await this.#connectionForProvider(providerId);
    if (previous) await this.#removeLocal(previous);

    const credentialId = completed.credentials ? newId("cred") : null;
    if (credentialId && completed.credentials) {
      await this.#options.vault.put(credentialId, providerId, completed.credentials);
    }
    const now = this.#now().toISOString();
    const connection: ConnectionRecord = {
      id: newId("conn"),
      providerId,
      status: "connected",
      externalAccountId: completed.externalAccountId,
      accountLabel: completed.accountLabel,
      grantedPermissions: [...completed.grantedPermissions],
      credentialId,
      connectedAt: now,
      updatedAt: now,
      ...(completed.manageUrl ? { manageUrl: completed.manageUrl } : {}),
    };
    await this.#options.connections.put(connection);
    await this.#options.audit.record({
      action: "connection.completed",
      outcome: "success",
      providerId,
      connectionId: connection.id,
      message: `Connected ${adapter.metadata.name} (${completed.accountLabel}).`,
    });
    return toView(connection);
  }

  async disconnect(connectionId: string): Promise<DisconnectResult> {
    const connection = await this.#options.connections.get(connectionId);
    if (!connection) throw new IntegrationError("not_found", "Connection not found.");
    const adapter = this.#adapter(connection.providerId);

    let revocation: RevokeResult;
    try {
      revocation = await adapter.revoke(await this.loadHandle(connection));
    } catch (error) {
      const failure = toIntegrationError(error, this.#options.logger, "revoke");
      revocation = { outcome: "failed", message: `Provider-side revocation failed (${failure.message}). Remove access in the provider's settings.` };
    }

    // The local credential is always deleted, even if provider-side revocation failed (CR-5).
    await this.#removeLocal(connection);
    await this.#options.audit.record({
      action: "connection.disconnected",
      outcome: revocation.outcome === "failed" ? "failure" : "success",
      providerId: connection.providerId,
      connectionId,
      message: `Disconnected ${adapter.metadata.name}. ${revocation.message}`,
    });
    return { providerId: connection.providerId, revocation: revocation.outcome, message: revocation.message };
  }

  async getConnection(connectionId: string): Promise<ConnectionRecord | undefined> {
    return this.#options.connections.get(connectionId);
  }

  async loadHandle(connection: ConnectionRecord): Promise<ConnectionHandle> {
    const credentials = connection.credentialId
      ? await this.#options.vault.get(connection.credentialId, connection.providerId)
      : null;
    if (connection.credentialId && !credentials) {
      throw new IntegrationError("invalid_state", "The stored credential for this connection is missing. Reconnect the provider.");
    }
    return {
      id: connection.id,
      externalAccountId: connection.externalAccountId,
      grantedPermissions: connection.grantedPermissions,
      credentials,
    };
  }

  /** Marks a connection as failed, for example after the provider rejected its authorization. */
  async markError(connectionId: string, error: IntegrationError): Promise<void> {
    await this.#options.connections.update(connectionId, (current) => ({
      ...current,
      status: "error",
      lastError: error.toSafe(),
      updatedAt: this.#now().toISOString(),
    }));
  }

  callbackUrl(providerId: string): string {
    return new URL(`/v1/callback/${providerId}`, this.#options.publicUrl).toString();
  }

  #adapter(providerId: string): ProviderAdapter {
    const adapter = this.#options.registry.get(providerId);
    if (!adapter) throw new IntegrationError("not_found", "Provider not found.");
    return adapter;
  }

  async #connectionForProvider(providerId: string): Promise<ConnectionRecord | undefined> {
    return (await this.#options.connections.list()).find((connection) => connection.providerId === providerId);
  }

  async #removeLocal(connection: ConnectionRecord): Promise<void> {
    if (connection.credentialId) await this.#options.vault.delete(connection.credentialId);
    await this.#options.connections.delete(connection.id);
  }

  async #pruneExpiredStates(): Promise<void> {
    const now = this.#now().getTime();
    for (const state of await this.#options.states.list()) {
      if (Date.parse(state.expiresAt) <= now) await this.#options.states.delete(state.id);
    }
  }
}

function summary(adapter: ProviderAdapter, connection: ConnectionRecord | undefined): ProviderSummary {
  const { metadata } = adapter;
  return {
    id: metadata.id,
    name: metadata.name,
    category: metadata.category,
    summary: metadata.summary,
    implementation: metadata.implementation,
    roadmapMilestone: metadata.roadmapMilestone,
    availability: computeAvailability(adapter, connection),
  };
}

function toView(connection: ConnectionRecord): ConnectionView {
  return {
    id: connection.id,
    providerId: connection.providerId,
    status: connection.status,
    accountLabel: connection.accountLabel,
    grantedPermissions: connection.grantedPermissions,
    connectedAt: connection.connectedAt,
    ...(connection.manageUrl ? { manageUrl: connection.manageUrl } : {}),
    ...(connection.lastError ? { lastError: connection.lastError } : {}),
  };
}

/** Defence in depth: the backend also checks the URL the desktop app will open (IN-6). */
function assertAuthorizationUrl(value: string, adapter: ProviderAdapter): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IntegrationError("internal_error", "The provider returned an invalid authorization link.");
  }
  if (url.protocol !== "https:" || !adapter.metadata.authorizationHosts.includes(url.hostname) || url.username || url.password) {
    throw new IntegrationError("internal_error", "The provider returned an authorization link to an unexpected host.");
  }
}
