import type { ActionResult, ApprovalView } from "../../shared/api.js";
import { ValidationError, validate } from "../../shared/validation.js";
import { canonicalJson, newId, sha256Hex } from "../security/ids.js";
import type { Logger } from "../security/logger.js";
import type { AuditLog } from "../storage/audit-log.js";
import type { Collection } from "../storage/collection.js";
import type { Capability } from "./adapter.js";
import { type ConnectionManager, toIntegrationError } from "./connection-manager.js";
import { IntegrationError } from "./errors.js";
import { missingPermissions, requiresApproval } from "./permission-manager.js";
import type { ProviderRegistry } from "./registry.js";
import type { ApprovalRecord, ConnectionRecord } from "./records.js";

export interface ActionServiceOptions {
  readonly registry: ProviderRegistry;
  readonly connections: ConnectionManager;
  readonly approvals: Collection<ApprovalRecord>;
  readonly audit: AuditLog;
  readonly logger: Logger;
  readonly approvalTtlMs?: number;
  readonly now?: () => Date;
}

/**
 * Runs provider capabilities with per-action authorization (IN-3) and the explicit
 * approval gate for anything that is not a pure read (IN-4). Every decision is audited.
 */
export class ActionService {
  readonly #options: ActionServiceOptions;
  readonly #approvalTtlMs: number;
  readonly #now: () => Date;

  constructor(options: ActionServiceOptions) {
    this.#options = options;
    this.#approvalTtlMs = options.approvalTtlMs ?? 5 * 60 * 1000;
    this.#now = options.now ?? (() => new Date());
  }

  async execute(connectionId: string, capabilityId: string, rawInput: unknown, approvalId?: string): Promise<ActionResult> {
    const { connection, capability } = await this.#resolve(connectionId, capabilityId);
    const audit = { providerId: connection.providerId, connectionId, capabilityId };

    const missing = missingPermissions(connection.grantedPermissions, capability.descriptor);
    if (missing.length > 0) {
      await this.#options.audit.record({ ...audit, action: "capability.denied", outcome: "denied", message: `Denied: permission not granted (${missing.join(", ")}).` });
      throw new IntegrationError("forbidden", "This connection was not granted the permission this action needs.");
    }

    const input = this.#validateInput(capability, rawInput);

    if (requiresApproval(capability.descriptor.access)) {
      const approved = approvalId ? await this.#consumeApproval(approvalId, connectionId, capabilityId, input) : false;
      if (!approved) {
        await this.#options.audit.record({ ...audit, action: "capability.denied", outcome: "denied", message: "Denied: explicit approval is required for this action." });
        throw new IntegrationError("approval_required", "This action changes data and needs your explicit approval first.");
      }
    }

    await this.#options.audit.record({ ...audit, action: "capability.allowed", outcome: "success", message: `Ran ${capability.descriptor.title}.` });
    try {
      const handle = await this.#options.connections.loadHandle(connection);
      return { capabilityId, data: await capability.execute(handle, input) };
    } catch (error) {
      const failure = toIntegrationError(error, this.#options.logger, capabilityId);
      if (failure.code === "provider_unauthorized") await this.#options.connections.markError(connectionId, failure);
      await this.#options.audit.record({ ...audit, action: "capability.failed", outcome: "failure", message: `${capability.descriptor.title} failed: ${failure.message}` });
      throw failure;
    }
  }

  /** Creates a pending approval bound to this exact connection, capability and input. */
  async createApproval(connectionId: string, capabilityId: string, rawInput: unknown): Promise<ApprovalView> {
    const { connection, capability } = await this.#resolve(connectionId, capabilityId);
    if (!requiresApproval(capability.descriptor.access)) {
      throw new IntegrationError("bad_request", "Read-only actions do not need approval.");
    }
    const input = this.#validateInput(capability, rawInput);
    const now = this.#now();
    const record: ApprovalRecord = {
      id: newId("appr"),
      connectionId,
      capabilityId,
      access: capability.descriptor.access,
      inputDigest: sha256Hex(canonicalJson(input)),
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.#approvalTtlMs).toISOString(),
    };
    await this.#options.approvals.put(record);
    await this.#options.audit.record({
      action: "approval.created",
      outcome: "success",
      providerId: connection.providerId,
      connectionId,
      capabilityId,
      message: `Approval requested for ${capability.descriptor.title}.`,
    });
    return toView(record, now);
  }

  async approve(approvalId: string): Promise<ApprovalView> {
    const now = this.#now();
    const current = await this.#options.approvals.get(approvalId);
    if (!current) throw new IntegrationError("not_found", "Approval not found.");
    if (current.status !== "pending" || Date.parse(current.expiresAt) <= now.getTime()) {
      throw new IntegrationError("invalid_state", "This approval is no longer pending.");
    }
    const updated = await this.#options.approvals.update(approvalId, (record) =>
      record.status === "pending" ? { ...record, status: "approved", approvedAt: now.toISOString() } : undefined,
    );
    if (!updated || updated.status !== "approved") throw new IntegrationError("invalid_state", "This approval is no longer pending.");
    await this.#options.audit.record({
      action: "approval.approved",
      outcome: "success",
      connectionId: updated.connectionId,
      capabilityId: updated.capabilityId,
      message: "Approval granted by the user.",
    });
    return toView(updated, now);
  }

  async #consumeApproval(approvalId: string, connectionId: string, capabilityId: string, input: unknown): Promise<boolean> {
    // take() removes the approval, so it can never be used twice.
    const record = await this.#options.approvals.take(approvalId);
    return (
      record !== undefined &&
      record.status === "approved" &&
      record.connectionId === connectionId &&
      record.capabilityId === capabilityId &&
      record.inputDigest === sha256Hex(canonicalJson(input)) &&
      Date.parse(record.expiresAt) > this.#now().getTime()
    );
  }

  async #resolve(connectionId: string, capabilityId: string): Promise<{ connection: ConnectionRecord; capability: Capability }> {
    const connection = await this.#options.connections.getConnection(connectionId);
    if (!connection) throw new IntegrationError("not_found", "Connection not found.");
    const capability = this.#options.registry.capability(connection.providerId, capabilityId);
    if (!capability) throw new IntegrationError("not_found", "This provider has no such action.");
    if (connection.status !== "connected") {
      throw new IntegrationError("invalid_state", "This connection is in an error state. Reconnect the provider.");
    }
    return { connection, capability };
  }

  #validateInput(capability: Capability, rawInput: unknown): unknown {
    try {
      return validate(capability.validateInput, rawInput ?? {});
    } catch (error) {
      if (error instanceof ValidationError) throw new IntegrationError("bad_request", `Invalid input: ${error.message}`);
      throw error;
    }
  }
}

function toView(record: ApprovalRecord, now: Date): ApprovalView {
  const expired = Date.parse(record.expiresAt) <= now.getTime();
  return {
    id: record.id,
    connectionId: record.connectionId,
    capabilityId: record.capabilityId,
    access: record.access,
    status: expired ? "expired" : record.status,
    expiresAt: record.expiresAt,
  };
}
