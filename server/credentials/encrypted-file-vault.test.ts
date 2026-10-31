import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Secret } from "../security/secret.js";
import { PLANTED_TOKEN, randomKey, tempDir } from "../test-support/fixtures.js";
import { EncryptedFileVault } from "./encrypted-file-vault.js";
import { VaultIntegrityError } from "./vault.js";

describe("EncryptedFileVault (CR-2, CR-3)", () => {
  let dir: string;
  let cleanup: () => Promise<void>;
  let file: string;
  const key = randomKey();
  const vault = () => new EncryptedFileVault({ file, keys: new Map([["k1", key]]), currentKeyId: "k1" });

  beforeEach(async () => {
    ({ dir, cleanup } = await tempDir());
    file = path.join(dir, "credentials.json");
  });
  afterEach(() => cleanup());

  it("round-trips credentials", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret(PLANTED_TOKEN) });
    const material = await vault().get("cred_1", "github");
    expect(material?.accessToken?.reveal()).toBe(PLANTED_TOKEN);
  });

  it("never writes the plaintext to disk", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret(PLANTED_TOKEN) });
    const raw = await readFile(file, "utf8");
    expect(raw).not.toContain(PLANTED_TOKEN);
    expect(raw).not.toContain("PLANTEDSECRET");
    expect(raw).not.toContain(key.toString("base64"));
  });

  it("writes the file with owner-only permissions on POSIX systems", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret("value-123456") });
    if (process.platform !== "win32") expect((await stat(file)).mode & 0o777).toBe(0o600);
  });

  it("uses a fresh IV for every encryption", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret("same-value") });
    await vault().put("cred_2", "github", { accessToken: new Secret("same-value") });
    const records = JSON.parse(await readFile(file, "utf8")).records;
    expect(records.cred_1.iv).not.toBe(records.cred_2.iv);
    expect(records.cred_1.ciphertext).not.toBe(records.cred_2.ciphertext);
  });

  it("fails closed when the ciphertext is tampered with", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret("value-123456") });
    const data = JSON.parse(await readFile(file, "utf8"));
    const bytes = Buffer.from(data.records.cred_1.ciphertext, "base64");
    bytes[0] = (bytes[0] as number) ^ 0xff;
    data.records.cred_1.ciphertext = bytes.toString("base64");
    await writeFile(file, JSON.stringify(data));
    await expect(vault().get("cred_1", "github")).rejects.toBeInstanceOf(VaultIntegrityError);
  });

  it("fails closed when a ciphertext is moved to another record (AAD binding)", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret("value-123456") });
    const data = JSON.parse(await readFile(file, "utf8"));
    data.records.cred_2 = data.records.cred_1;
    await writeFile(file, JSON.stringify(data));
    await expect(vault().get("cred_2", "github")).rejects.toBeInstanceOf(VaultIntegrityError);
  });

  it("fails closed for the wrong provider or the wrong key", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret("value-123456") });
    await expect(vault().get("cred_1", "vercel")).rejects.toBeInstanceOf(VaultIntegrityError);
    const other = new EncryptedFileVault({ file, keys: new Map([["k1", randomKey()]]), currentKeyId: "k1" });
    await expect(other.get("cred_1", "github")).rejects.toBeInstanceOf(VaultIntegrityError);
  });

  it("decrypts with an older key after rotation", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret("value-123456") });
    const rotated = new EncryptedFileVault({ file, keys: new Map([["k1", key], ["k2", randomKey()]]), currentKeyId: "k2" });
    expect((await rotated.get("cred_1", "github"))?.accessToken?.reveal()).toBe("value-123456");
  });

  it("deletes credentials and returns null for missing ones", async () => {
    await vault().put("cred_1", "github", { accessToken: new Secret("value-123456") });
    expect(await vault().delete("cred_1")).toBe(true);
    expect(await vault().get("cred_1", "github")).toBeNull();
    expect(await vault().delete("cred_1")).toBe(false);
  });

  it("rejects keys of the wrong length", () => {
    expect(() => new EncryptedFileVault({ file, keys: new Map([["k1", Buffer.alloc(16)]]), currentKeyId: "k1" })).toThrow();
  });
});
