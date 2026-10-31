import type { RevocationOutcome } from "../../shared/api.js";
import type { CapabilityDescriptor, ProviderMetadata } from "../../shared/providers.js";
import type { Validator } from "../../shared/validation.js";
import type { CredentialMaterial } from "../credentials/vault.js";

// The common contract every provider adapter implements. The marketplace, connection
// manager and action service only ever talk to this interface, so adding a provider
// never requires changes to them (DEC-17).

export interface ConfigurationStatus {
  readonly configured: boolean;
  /** Names of missing backend settings. Never values. */
  readonly missing: readonly string[];
}

export interface BeginConnectInput {
  /** Single-use state value the provider must return to the callback (IN-5). */
  readonly state: string;
  readonly callbackUrl: string;
}

export interface CompleteConnectInput {
  /** Callback query parameters, with `state` already verified and consumed. */
  readonly query: URLSearchParams;
  readonly callbackUrl: string;
}

export interface CompletedConnection {
  /** Provider-side identifier, such as a GitHub installation id. Not a secret. */
  readonly externalAccountId: string;
  readonly accountLabel: string;
  readonly grantedPermissions: readonly string[];
  /** Long-lived secrets to store in the vault, or null when none are needed. */
  readonly credentials: CredentialMaterial | null;
  readonly manageUrl?: string;
}

/** What an adapter receives when acting on a stored connection. */
export interface ConnectionHandle {
  readonly id: string;
  readonly externalAccountId: string;
  readonly grantedPermissions: readonly string[];
  readonly credentials: CredentialMaterial | null;
}

export interface RevokeResult {
  readonly outcome: RevocationOutcome;
  readonly message: string;
}

export interface Capability<Input = unknown, Output = unknown> {
  readonly descriptor: CapabilityDescriptor;
  readonly validateInput: Validator<Input>;
  /** Must return only whitelisted, non-secret fields (IN-7). */
  execute(connection: ConnectionHandle, input: Input): Promise<Output>;
}

export interface ProviderAdapter {
  readonly metadata: ProviderMetadata;
  configuration(): ConfigurationStatus;
  beginConnect(input: BeginConnectInput): Promise<{ readonly authorizationUrl: string }>;
  completeConnect(input: CompleteConnectInput): Promise<CompletedConnection>;
  revoke(connection: ConnectionHandle): Promise<RevokeResult>;
  readonly capabilities: readonly Capability[];
}

/** Helper that keeps capability input types while storing them in a heterogeneous list. */
export function defineCapability<Input, Output>(capability: Capability<Input, Output>): Capability {
  return capability as unknown as Capability;
}
