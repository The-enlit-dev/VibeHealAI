import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import path from "node:path";
import { Secret } from "../security/secret.js";
import { Mutex, readJsonFile, writeJsonFileAtomic } from "../storage/json-file.js";
import { type CredentialMaterial, type CredentialVault, VaultIntegrityError } from "./vault.js";

// AES-256-GCM envelope per record (CR-2):
//   - 256-bit key from BRIXO_ENCRYPTION_KEY, never stored with the data (CR-3);
//   - fresh random 96-bit IV for every encryption (GCM's recommended IV size);
//   - 128-bit authentication tag; any change to ciphertext, IV or tag fails closed;
//   - additional authenticated data binds the ciphertext to its record id and provider,
//     so a ciphertext copied to another record does not decrypt;
//   - a key id is stored per record so keys can be rotated (U17).

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FORMAT_VERSION = 1;

interface StoredRecord {
  readonly providerId: string;
  readonly keyId: string;
  readonly iv: string;
  readonly tag: string;
  readonly ciphertext: string;
  readonly createdAt: string;
}

interface VaultFile {
  readonly version: number;
  readonly records: Record<string, StoredRecord>;
}

export interface EncryptedFileVaultOptions {
  readonly file: string;
  /** Keys by id. The current key encrypts; any listed key can decrypt. */
  readonly keys: ReadonlyMap<string, Buffer>;
  readonly currentKeyId: string;
}

export class EncryptedFileVault implements CredentialVault {
  readonly #file: string;
  readonly #keys: ReadonlyMap<string, Buffer>;
  readonly #currentKeyId: string;
  readonly #mutex = new Mutex();

  constructor(options: EncryptedFileVaultOptions) {
    for (const [keyId, key] of options.keys) {
      if (key.length !== 32) throw new Error(`Encryption key ${keyId} must be 32 bytes`);
    }
    if (!options.keys.has(options.currentKeyId)) throw new Error("Current encryption key id is not among the keys");
    this.#file = path.resolve(options.file);
    this.#keys = options.keys;
    this.#currentKeyId = options.currentKeyId;
  }

  put(id: string, providerId: string, material: CredentialMaterial): Promise<void> {
    return this.#mutex.run(async () => {
      const plaintext = Buffer.from(
        JSON.stringify(Object.fromEntries(Object.entries(material).map(([name, secret]) => [name, secret.reveal()]))),
        "utf8",
      );
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, this.#key(this.#currentKeyId), iv, { authTagLength: TAG_BYTES });
      cipher.setAAD(aad(id, providerId));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      plaintext.fill(0);
      const data = await this.#read();
      data.records[id] = {
        providerId,
        keyId: this.#currentKeyId,
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        ciphertext: ciphertext.toString("base64"),
        createdAt: new Date().toISOString(),
      };
      await writeJsonFileAtomic(this.#file, data);
    });
  }

  async get(id: string, providerId: string): Promise<CredentialMaterial | null> {
    const data = await this.#read();
    const record = Object.hasOwn(data.records, id) ? data.records[id] : undefined;
    if (!record) return null;
    if (record.providerId !== providerId) throw new VaultIntegrityError();
    const key = this.#keys.get(record.keyId);
    if (!key) throw new VaultIntegrityError();
    try {
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(record.iv, "base64"), { authTagLength: TAG_BYTES });
      decipher.setAAD(aad(id, providerId));
      decipher.setAuthTag(Buffer.from(record.tag, "base64"));
      const plaintext = Buffer.concat([decipher.update(Buffer.from(record.ciphertext, "base64")), decipher.final()]);
      const parsed = JSON.parse(plaintext.toString("utf8")) as Record<string, unknown>;
      plaintext.fill(0);
      const material: Record<string, Secret> = {};
      for (const [name, value] of Object.entries(parsed)) {
        if (typeof value !== "string") throw new VaultIntegrityError();
        material[name] = new Secret(value);
      }
      return material;
    } catch {
      throw new VaultIntegrityError();
    }
  }

  delete(id: string): Promise<boolean> {
    return this.#mutex.run(async () => {
      const data = await this.#read();
      if (!Object.hasOwn(data.records, id)) return false;
      delete data.records[id];
      await writeJsonFileAtomic(this.#file, data);
      return true;
    });
  }

  #key(keyId: string): Buffer {
    const key = this.#keys.get(keyId);
    if (!key) throw new Error("Unknown encryption key id");
    return key;
  }

  async #read(): Promise<{ version: number; records: Record<string, StoredRecord> }> {
    const data = await readJsonFile<VaultFile>(this.#file, { version: FORMAT_VERSION, records: {} });
    if (data.version !== FORMAT_VERSION || typeof data.records !== "object" || data.records === null) {
      throw new Error("Unsupported credential store format");
    }
    return { version: data.version, records: { ...data.records } };
  }
}

function aad(id: string, providerId: string): Buffer {
  return Buffer.from(`brixoai-credential:v${FORMAT_VERSION}:${providerId}:${id}`, "utf8");
}
