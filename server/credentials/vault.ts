import type { Secret } from "../security/secret.js";

/** Named secret values for one connection, for example { accessToken, refreshToken }. */
export type CredentialMaterial = Readonly<Record<string, Secret>>;

/**
 * Storage abstraction for provider credentials (CR-1, CR-2). Only the backend uses it.
 * Local development uses EncryptedFileVault; a hosted backend would add an
 * implementation backed by a database and a key-management service (P-12).
 */
export interface CredentialVault {
  put(id: string, providerId: string, material: CredentialMaterial): Promise<void>;
  /** Returns null when absent. Throws VaultIntegrityError when a record fails authentication. */
  get(id: string, providerId: string): Promise<CredentialMaterial | null>;
  delete(id: string): Promise<boolean>;
}

export class VaultIntegrityError extends Error {
  constructor() {
    super("Stored credential failed integrity verification");
    this.name = "VaultIntegrityError";
  }
}
