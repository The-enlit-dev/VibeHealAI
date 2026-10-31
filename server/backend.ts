import { createServer, type Server } from "node:http";
import path from "node:path";
import type { ServerConfig } from "./config.js";
import { EncryptedFileVault } from "./credentials/encrypted-file-vault.js";
import type { CredentialVault } from "./credentials/vault.js";
import { createApp } from "./http/app.js";
import { ActionService } from "./integrations/action-service.js";
import { ConnectionManager } from "./integrations/connection-manager.js";
import type { ApprovalRecord, AuthorizationStateRecord, ConnectionRecord } from "./integrations/records.js";
import type { ProviderRegistry } from "./integrations/registry.js";
import type { FetchLike } from "./providers/github/client.js";
import { createProviderRegistry } from "./providers/index.js";
import type { Logger } from "./security/logger.js";
import { type AuditLog, JsonLinesAuditLog } from "./storage/audit-log.js";
import { type Collection, JsonFileCollection } from "./storage/collection.js";
import { ensurePrivateDir } from "./storage/json-file.js";

export interface BackendDependencies {
  readonly config: ServerConfig;
  readonly logger: Logger;
  readonly fetch?: FetchLike;
  readonly registry?: ProviderRegistry;
  readonly vault?: CredentialVault;
  readonly audit?: AuditLog;
  readonly connections?: Collection<ConnectionRecord>;
  readonly states?: Collection<AuthorizationStateRecord>;
  readonly approvals?: Collection<ApprovalRecord>;
  readonly now?: () => Date;
}

export interface Backend {
  readonly server: Server;
  readonly connections: ConnectionManager;
  readonly actions: ActionService;
  readonly registry: ProviderRegistry;
  readonly audit: AuditLog;
}

/** Composition root: wires storage, vault, registry and services into an HTTP server. */
export async function createBackend(deps: BackendDependencies): Promise<Backend> {
  const { config, logger } = deps;
  await ensurePrivateDir(config.dataDir);

  const registry = deps.registry ?? createProviderRegistry({ config: config.providers, fetch: deps.fetch ?? globalThis.fetch });
  const vault =
    deps.vault ??
    new EncryptedFileVault({
      file: path.join(config.dataDir, "credentials.json"),
      keys: new Map([[config.encryptionKeyId, config.encryptionKey]]),
      currentKeyId: config.encryptionKeyId,
    });
  const audit = deps.audit ?? new JsonLinesAuditLog(config.dataDir);
  const now = deps.now;

  const connections = new ConnectionManager({
    registry,
    connections: deps.connections ?? new JsonFileCollection<ConnectionRecord>(config.dataDir, "connections"),
    states: deps.states ?? new JsonFileCollection<AuthorizationStateRecord>(config.dataDir, "authorization-states"),
    vault,
    audit,
    logger,
    publicUrl: config.publicUrl,
    ...(now ? { now } : {}),
  });
  const actions = new ActionService({
    registry,
    connections,
    approvals: deps.approvals ?? new JsonFileCollection<ApprovalRecord>(config.dataDir, "approvals"),
    audit,
    logger,
    ...(now ? { now } : {}),
  });

  // Allowed Host headers are derived from the port actually bound, so port 0 works in tests (BK-3).
  const hostForHeader = config.host.includes(":") ? `[${config.host}]` : config.host;
  let server: Server | undefined = undefined;
  const allowedHosts = (): string[] => {
    const address = server?.address();
    const port = address && typeof address === "object" ? address.port : config.port;
    return [`${hostForHeader}:${port}`, `127.0.0.1:${port}`, `localhost:${port}`, config.publicUrl.host];
  };

  server = createServer(
    { requestTimeout: 30_000, headersTimeout: 15_000, maxHeaderSize: 16 * 1024 },
    createApp({ clientToken: config.clientToken, allowedHosts, connections, actions, audit, logger }),
  );
  return { server, connections, actions, registry, audit };
}
