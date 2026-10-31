import type { AccessLevel } from "../../shared/providers.js";
import type { ConnectionStatus, SafeError } from "../../shared/api.js";

/** Persistent connection record. Holds a vault reference, never credential values. */
export interface ConnectionRecord {
  readonly id: string;
  readonly providerId: string;
  readonly status: ConnectionStatus;
  readonly externalAccountId: string;
  readonly accountLabel: string;
  readonly grantedPermissions: readonly string[];
  readonly credentialId: string | null;
  readonly connectedAt: string;
  readonly updatedAt: string;
  readonly manageUrl?: string;
  readonly lastError?: SafeError;
}

/** Pending authorization. Keyed by the SHA-256 of the state value, so the raw state is never stored. */
export interface AuthorizationStateRecord {
  readonly id: string;
  readonly providerId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface ApprovalRecord {
  readonly id: string;
  readonly connectionId: string;
  readonly capabilityId: string;
  readonly access: AccessLevel;
  readonly inputDigest: string;
  readonly status: "pending" | "approved";
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly approvedAt?: string;
}
