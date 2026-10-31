import { beforeEach, describe, expect, it } from "vitest";
import { EncryptedFileVault } from "../credentials/encrypted-file-vault.js";
import { silentLogger } from "../security/logger.js";
import { MemoryAuditLog } from "../storage/audit-log.js";
import { MemoryCollection } from "../storage/collection.js";
import { PLANTED_TOKEN, createFakeAdapter, randomKey, tempDir, type FakeAdapterState } from "../test-support/fixtures.js";
import { createPlannedAdapter } from "../providers/planned-adapter.js";
import { PLANNED_PROVIDERS } from "../providers/planned-catalog.js";
import { ActionService } from "./action-service.js";
import { ConnectionManager } from "./connection-manager.js";
import { IntegrationError } from "./errors.js";
import type { ApprovalRecord, AuthorizationStateRecord, ConnectionRecord } from "./records.js";
import { ProviderRegistry } from "./registry.js";

interface Harness {
  manager: ConnectionManager;
  actions: ActionService;
  audit: MemoryAuditLog;
  state: FakeAdapterState;
  connections: MemoryCollection<ConnectionRecord>;
  states: MemoryCollection<AuthorizationStateRecord>;
  vaultFile: string;
  clock: { now: Date };
}

async function harness(adapterState: Partial<FakeAdapterState> = {}): Promise<Harness> {
  const { dir } = await tempDir();
  const { adapter, state } = createFakeAdapter(adapterState);
  const registry = new ProviderRegistry();
  registry.register(adapter);
  registry.register(createPlannedAdapter(PLANNED_PROVIDERS[0]!));
  const audit = new MemoryAuditLog();
  const connections = new MemoryCollection<ConnectionRecord>();
  const states = new MemoryCollection<AuthorizationStateRecord>();
  const vaultFile = `${dir}/credentials.json`;
  const vault = new EncryptedFileVault({ file: vaultFile, keys: new Map([["k", randomKey()]]), currentKeyId: "k" });
  const clock = { now: new Date("2026-10-31T12:00:00Z") };
  const now = () => clock.now;
  const manager = new ConnectionManager({ registry, connections, states, vault, audit, logger: silentLogger, publicUrl: new URL("http://127.0.0.1:8787"), now });
  const actions = new ActionService({ registry, connections: manager, approvals: new MemoryCollection<ApprovalRecord>(), audit, logger: silentLogger, now });
  return { manager, actions, audit, state, connections, states, vaultFile, clock };
}

const stateFrom = (authorizationUrl: string): string => new URL(authorizationUrl).searchParams.get("state") ?? "";

async function connect(h: Harness): Promise<string> {
  const { authorizationUrl } = await h.manager.beginConnect("fakeprov");
  const view = await h.manager.completeCallback("fakeprov", new URLSearchParams({ state: stateFrom(authorizationUrl), code: "good-code" }));
  return view.id;
}

describe("ConnectionManager", () => {
  let h: Harness;
  beforeEach(async () => {
    h = await harness();
  });

  it("reports honest availability for each state (IN-8)", async () => {
    const byId = async () => Object.fromEntries((await h.manager.listProviders()).map((p) => [p.id, p.availability]));
    expect(await byId()).toEqual({ fakeprov: "available", vercel: "coming_soon" });
    h.state.configured = false;
    expect((await byId()).fakeprov).toBe("not_configured");
    h.state.configured = true;
    const id = await connect(h);
    expect((await byId()).fakeprov).toBe("connected");
    await h.manager.markError(id, new IntegrationError("provider_unauthorized", "Revoked."));
    expect((await byId()).fakeprov).toBe("error");
  });

  it("lists missing configuration names in provider details", async () => {
    h.state.configured = false;
    expect((await h.manager.getProvider("fakeprov")).missingConfiguration).toEqual(["FAKE_CLIENT_ID"]);
  });

  it("refuses to connect planned or unconfigured providers", async () => {
    await expect(h.manager.beginConnect("vercel")).rejects.toMatchObject({ code: "not_available" });
    h.state.configured = false;
    await expect(h.manager.beginConnect("fakeprov")).rejects.toMatchObject({ code: "not_configured" });
    await expect(h.manager.beginConnect("nope")).rejects.toMatchObject({ code: "not_found" });
  });

  it("stores only a hash of the state, and the state is single use (IN-5)", async () => {
    const { authorizationUrl } = await h.manager.beginConnect("fakeprov");
    const state = stateFrom(authorizationUrl);
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(await h.states.list())).not.toContain(state);
    await h.manager.completeCallback("fakeprov", new URLSearchParams({ state, code: "good-code" }));
    await h.manager.disconnect((await h.manager.listConnections())[0]!.id);
    await expect(h.manager.completeCallback("fakeprov", new URLSearchParams({ state, code: "good-code" }))).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("rejects expired, unknown and cross-provider states", async () => {
    const { authorizationUrl } = await h.manager.beginConnect("fakeprov");
    await expect(h.manager.completeCallback("vercel", new URLSearchParams({ state: stateFrom(authorizationUrl) }))).rejects.toMatchObject({ code: "invalid_state" });

    const second = await h.manager.beginConnect("fakeprov");
    h.clock.now = new Date(h.clock.now.getTime() + 11 * 60 * 1000);
    await expect(h.manager.completeCallback("fakeprov", new URLSearchParams({ state: stateFrom(second.authorizationUrl), code: "good-code" }))).rejects.toMatchObject({ code: "invalid_state" });
    await expect(h.manager.completeCallback("fakeprov", new URLSearchParams({ state: "x".repeat(43), code: "good-code" }))).rejects.toMatchObject({ code: "invalid_state" });
    expect(h.audit.entries.filter((entry) => entry.action === "connection.failed")).toHaveLength(3);
  });

  it("stores credentials in the vault only, never in the connection record or views (CR-1)", async () => {
    await connect(h);
    const records = JSON.stringify(await h.connections.list());
    const views = JSON.stringify(await h.manager.listConnections());
    const detail = JSON.stringify(await h.manager.getProvider("fakeprov"));
    const vaultRaw = await import("node:fs/promises").then((fs) => fs.readFile(h.vaultFile, "utf8"));
    for (const text of [records, views, detail, vaultRaw]) expect(text).not.toContain(PLANTED_TOKEN);
  });

  it("does not record a connection when the provider rejects the callback", async () => {
    const { authorizationUrl } = await h.manager.beginConnect("fakeprov");
    await expect(h.manager.completeCallback("fakeprov", new URLSearchParams({ state: stateFrom(authorizationUrl), code: "bad" }))).rejects.toMatchObject({ code: "provider_unauthorized" });
    expect(await h.manager.listConnections()).toHaveLength(0);
  });

  it("prevents a second connection while one is active", async () => {
    await connect(h);
    await expect(h.manager.beginConnect("fakeprov")).rejects.toMatchObject({ code: "conflict" });
  });

  it("disconnects: revokes at the provider, deletes the credential and the record (CR-5)", async () => {
    const id = await connect(h);
    const result = await h.manager.disconnect(id);
    expect(result.revocation).toBe("revoked");
    expect(h.state.revoked).toEqual([id]);
    expect(await h.manager.listConnections()).toHaveLength(0);
    const vaultRaw = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(h.vaultFile, "utf8")));
    expect(Object.keys(vaultRaw.records)).toHaveLength(0);
  });

  it("still deletes local credentials when provider revocation fails, and says so", async () => {
    h = await harness({ revokeOutcome: "failed-throw" });
    const id = await connect(h);
    const result = await h.manager.disconnect(id);
    expect(result.revocation).toBe("failed");
    expect(result.message).not.toContain(PLANTED_TOKEN);
    expect(await h.manager.listConnections()).toHaveLength(0);
  });

  it("audits the lifecycle without leaking secrets (AU-1, AU-2)", async () => {
    const id = await connect(h);
    await h.manager.disconnect(id);
    expect(h.audit.entries.map((entry) => entry.action)).toEqual(["connection.started", "connection.completed", "connection.disconnected"]);
    expect(JSON.stringify(h.audit.entries)).not.toContain(PLANTED_TOKEN);
  });
});

describe("ActionService (IN-3, IN-4)", () => {
  let h: Harness;
  let connectionId: string;
  beforeEach(async () => {
    h = await harness();
    connectionId = await connect(h);
  });

  it("runs a granted read capability and passes decrypted credentials only to the adapter", async () => {
    const result = await h.actions.execute(connectionId, "fakeprov.items.list", { filter: "x" });
    expect(result.data).toEqual({ items: ["a", "b"] });
    expect(h.state.lastCredentials?.accessToken?.reveal()).toBe(PLANTED_TOKEN);
    expect(JSON.stringify(result)).not.toContain(PLANTED_TOKEN);
    expect(h.audit.entries.at(-1)?.action).toBe("capability.allowed");
  });

  it("validates capability input", async () => {
    await expect(h.actions.execute(connectionId, "fakeprov.items.list", { filter: "x".repeat(50) })).rejects.toMatchObject({ code: "bad_request" });
    await expect(h.actions.execute(connectionId, "fakeprov.items.list", { unexpected: true })).rejects.toMatchObject({ code: "bad_request" });
  });

  it("denies capabilities whose permission was not granted", async () => {
    h = await harness({ grantedPermissions: ["fakeprov.items.write"] });
    connectionId = await connect(h);
    await expect(h.actions.execute(connectionId, "fakeprov.items.list", {})).rejects.toMatchObject({ code: "forbidden" });
    expect(h.audit.entries.at(-1)?.action).toBe("capability.denied");
  });

  it("denies unknown capabilities, other providers' capabilities and unknown connections", async () => {
    await expect(h.actions.execute(connectionId, "github.repositories.list", {})).rejects.toMatchObject({ code: "not_found" });
    await expect(h.actions.execute("conn_doesnotexist000000", "fakeprov.items.list", {})).rejects.toMatchObject({ code: "not_found" });
  });

  it("requires an explicit approval for write capabilities", async () => {
    await expect(h.actions.execute(connectionId, "fakeprov.items.rename", { name: "new" })).rejects.toMatchObject({ code: "approval_required" });
    expect(h.state.executed).toHaveLength(0);
  });

  it("accepts an approved, matching approval exactly once", async () => {
    const approval = await h.actions.createApproval(connectionId, "fakeprov.items.rename", { name: "new" });
    await expect(h.actions.execute(connectionId, "fakeprov.items.rename", { name: "new" }, approval.id)).rejects.toMatchObject({ code: "approval_required" });

    const second = await h.actions.createApproval(connectionId, "fakeprov.items.rename", { name: "new" });
    expect((await h.actions.approve(second.id)).status).toBe("approved");
    expect((await h.actions.execute(connectionId, "fakeprov.items.rename", { name: "new" }, second.id)).data).toEqual({ renamed: true });
    await expect(h.actions.execute(connectionId, "fakeprov.items.rename", { name: "new" }, second.id)).rejects.toMatchObject({ code: "approval_required" });
  });

  it("rejects an approval used with different input or after expiry", async () => {
    const approval = await h.actions.createApproval(connectionId, "fakeprov.items.rename", { name: "new" });
    await h.actions.approve(approval.id);
    await expect(h.actions.execute(connectionId, "fakeprov.items.rename", { name: "other" }, approval.id)).rejects.toMatchObject({ code: "approval_required" });

    const late = await h.actions.createApproval(connectionId, "fakeprov.items.rename", { name: "new" });
    await h.actions.approve(late.id);
    h.clock.now = new Date(h.clock.now.getTime() + 6 * 60 * 1000);
    await expect(h.actions.execute(connectionId, "fakeprov.items.rename", { name: "new" }, late.id)).rejects.toMatchObject({ code: "approval_required" });
  });

  it("does not create approvals for read-only capabilities", async () => {
    await expect(h.actions.createApproval(connectionId, "fakeprov.items.list", {})).rejects.toMatchObject({ code: "bad_request" });
  });

  it("marks the connection as error when the provider rejects authorization", async () => {
    h.state.failExecuteWith = new IntegrationError("provider_unauthorized", "Provider rejected the token.");
    await expect(h.actions.execute(connectionId, "fakeprov.items.list", {})).rejects.toMatchObject({ code: "provider_unauthorized" });
    expect((await h.manager.getProvider("fakeprov")).availability).toBe("error");
    await expect(h.actions.execute(connectionId, "fakeprov.items.list", {})).rejects.toMatchObject({ code: "invalid_state" });
  });
});
