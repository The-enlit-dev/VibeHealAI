import { generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ProviderMetadata } from "../../shared/providers.js";
import { object, optional, string } from "../../shared/validation.js";
import type { ServerConfig } from "../config.js";
import type { CredentialMaterial } from "../credentials/vault.js";
import { type Capability, type ProviderAdapter, defineCapability } from "../integrations/adapter.js";
import { IntegrationError } from "../integrations/errors.js";
import { Secret } from "../security/secret.js";

// Test helpers. All keys and tokens are generated at runtime: no secret is stored in
// the repository, not even a test one (CR-6).

export async function tempDir(): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(path.join(tmpdir(), "vibeheal-test-"));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

export function randomKey(): Buffer {
  return randomBytes(32);
}

export function testRsaKey() {
  return generateKeyPairSync("rsa", { modulusLength: 2048 });
}

export function testConfig(dataDir: string, overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    host: "127.0.0.1",
    port: 0,
    publicUrl: new URL("http://127.0.0.1:8787"),
    dataDir,
    clientToken: new Secret(randomBytes(32).toString("base64url")),
    encryptionKey: randomKey(),
    encryptionKeyId: "test-1",
    logLevel: "error",
    allowNonLoopback: false,
    providers: { github: { missing: ["GITHUB_APP_ID"] } },
    ...overrides,
  };
}

/** A fake "planted" provider token used to prove it never leaks anywhere (VR-2 style). */
export const PLANTED_TOKEN = `ghs_${"PLANTEDSECRET".repeat(3)}0000`;

export const fakeMetadata: ProviderMetadata = {
  id: "fakeprov",
  name: "Fake Provider",
  category: "productivity",
  summary: "Test provider.",
  description: "A provider used only in tests.",
  contextUse: "Test context.",
  websiteUrl: "https://example.com",
  docsUrl: "https://example.com/docs",
  implementation: "implemented",
  roadmapMilestone: "IM4",
  authorizationHosts: ["auth.example.com"],
  permissions: [
    { id: "fakeprov.items.read", title: "Items (read)", description: "Read items.", access: "read", verified: true },
    { id: "fakeprov.items.write", title: "Items (write)", description: "Change items.", access: "write", verified: true },
  ],
  capabilities: [
    { id: "fakeprov.items.list", title: "List items", description: "List items.", access: "read", requiredPermissions: ["fakeprov.items.read"] },
    { id: "fakeprov.items.rename", title: "Rename item", description: "Rename an item.", access: "write", requiredPermissions: ["fakeprov.items.write"] },
  ],
  notes: [],
};

export interface FakeAdapterState {
  configured: boolean;
  grantedPermissions: string[];
  revokeOutcome: "revoked" | "failed-throw";
  failExecuteWith?: IntegrationError;
  lastCredentials: CredentialMaterial | null;
  revoked: string[];
  executed: { capabilityId: string; input: unknown }[];
}

export function createFakeAdapter(state: Partial<FakeAdapterState> = {}): { adapter: ProviderAdapter; state: FakeAdapterState } {
  const s: FakeAdapterState = {
    configured: true,
    grantedPermissions: ["fakeprov.items.read", "fakeprov.items.write"],
    revokeOutcome: "revoked",
    lastCredentials: null,
    revoked: [],
    executed: [],
    ...state,
  };
  const [listDescriptor, renameDescriptor] = fakeMetadata.capabilities as [typeof fakeMetadata.capabilities[0], typeof fakeMetadata.capabilities[0]];
  const capabilities: Capability[] = [
    defineCapability({
      descriptor: listDescriptor,
      validateInput: object({ filter: optional(string({ max: 20 })) }),
      async execute(handle, input) {
        if (s.failExecuteWith) throw s.failExecuteWith;
        s.lastCredentials = handle.credentials;
        s.executed.push({ capabilityId: listDescriptor.id, input });
        return { items: ["a", "b"], tokenEcho: undefined };
      },
    }),
    defineCapability({
      descriptor: renameDescriptor,
      validateInput: object({ name: string({ min: 1, max: 20 }) }),
      async execute(_handle, input) {
        s.executed.push({ capabilityId: renameDescriptor.id, input });
        return { renamed: true };
      },
    }),
  ];
  const adapter: ProviderAdapter = {
    metadata: fakeMetadata,
    configuration: () => ({ configured: s.configured, missing: s.configured ? [] : ["FAKE_CLIENT_ID"] }),
    beginConnect: async ({ state }) => ({ authorizationUrl: `https://auth.example.com/authorize?state=${state}` }),
    completeConnect: async ({ query }) => {
      if (query.get("code") !== "good-code") throw new IntegrationError("provider_unauthorized", "Provider rejected the code.");
      return {
        externalAccountId: "acct-1",
        accountLabel: "fake-user",
        grantedPermissions: s.grantedPermissions,
        credentials: { accessToken: new Secret(PLANTED_TOKEN) },
      };
    },
    revoke: async (handle) => {
      if (s.revokeOutcome === "failed-throw") throw new Error(`network down ${PLANTED_TOKEN}`);
      s.revoked.push(handle.id);
      return { outcome: "revoked", message: "Revoked at provider." };
    },
    capabilities,
  };
  return { adapter, state: s };
}
