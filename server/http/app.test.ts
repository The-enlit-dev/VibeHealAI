import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBackend, type Backend } from "../backend.js";
import { createLogger } from "../security/logger.js";
import { ProviderRegistry } from "../integrations/registry.js";
import { createPlannedAdapter } from "../providers/planned-adapter.js";
import { PLANNED_PROVIDERS } from "../providers/planned-catalog.js";
import { PLANTED_TOKEN, createFakeAdapter, tempDir, testConfig, type FakeAdapterState } from "../test-support/fixtures.js";

// End-to-end tests of the HTTP API on a real loopback socket, with a fake provider.

describe("backend HTTP API", () => {
  let backend: Backend;
  let base: string;
  let token: string;
  let cleanup: () => Promise<void>;
  let state: FakeAdapterState;
  const logLines: string[] = [];

  beforeEach(async () => {
    const temp = await tempDir();
    cleanup = temp.cleanup;
    const config = testConfig(temp.dir);
    token = config.clientToken.reveal();
    const fake = createFakeAdapter();
    state = fake.state;
    const registry = new ProviderRegistry();
    registry.register(fake.adapter);
    registry.register(createPlannedAdapter(PLANNED_PROVIDERS[0]!));
    backend = await createBackend({ config, registry, logger: createLogger({ level: "debug", write: (line) => logLines.push(line) }) });
    await new Promise<void>((resolve) => backend.server.listen(0, "127.0.0.1", resolve));
    const { port } = backend.server.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => backend.server.close(() => resolve()));
    await cleanup();
  });

  const api = (path: string, init: RequestInit & { auth?: boolean } = {}) => {
    const headers = new Headers(init.headers);
    if (init.auth !== false) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${base}${path}`, { ...init, headers });
  };

  it("serves health without authentication and with security headers (BK-6)", async () => {
    const response = await api("/v1/health", { auth: false });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  });

  it("requires the bearer token on every other route (BK-2)", async () => {
    for (const path of ["/v1/providers", "/v1/connections", "/v1/activity", "/v1/providers/fakeprov"]) {
      expect((await api(path, { auth: false })).status).toBe(401);
    }
    const wrong = await fetch(`${base}/v1/providers`, { headers: { Authorization: "Bearer wrong-token-value" } });
    expect(wrong.status).toBe(401);
    expect(JSON.stringify(await wrong.json())).not.toContain(token);
  });

  it("rejects browser requests and unexpected Host headers (BK-3)", async () => {
    expect((await api("/v1/providers", { headers: { Origin: "https://evil.example" } })).status).toBe(403);
    const { request } = await import("node:http");
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(`${base}/v1/health`, { headers: { Host: "evil.example:80" } }, (res) => resolve(res.statusCode ?? 0));
      req.on("error", reject);
      req.end();
    });
    expect(status).toBe(403);
  });

  it("returns the catalog with honest availability", async () => {
    const response = await api("/v1/providers");
    const body = (await response.json()) as { providers: { id: string; availability: string }[] };
    expect(body.providers.map((provider) => [provider.id, provider.availability])).toEqual([
      ["fakeprov", "available"],
      ["vercel", "coming_soon"],
    ]);
  });

  it("validates route parameters and bodies (BK-4)", async () => {
    expect((await api("/v1/providers/BAD_ID")).status).toBe(404);
    expect((await api("/v1/approvals", { method: "POST", body: "{}", headers: { "Content-Type": "text/plain" } })).status).toBe(415);
    expect((await api("/v1/approvals", { method: "POST", body: "{not json", headers: { "Content-Type": "application/json" } })).status).toBe(400);
    const extra = await api("/v1/approvals", { method: "POST", body: JSON.stringify({ connectionId: "conn_aaaaaaaaaaaaaaaaaaaaaa", capabilityId: "fakeprov.items.rename", evil: 1 }), headers: { "Content-Type": "application/json" } });
    expect(extra.status).toBe(400);
    const big = await api("/v1/approvals", { method: "POST", body: JSON.stringify({ x: "a".repeat(70_000) }), headers: { "Content-Type": "application/json" } });
    expect(big.status).toBe(413);
    expect((await api("/v1/activity?limit=5000")).status).toBe(400);
    expect((await api("/v1/providers", { method: "DELETE" })).status).toBe(405);
  });

  it("runs the full connect → act → disconnect lifecycle without leaking the provider token", async () => {
    const start = await api("/v1/providers/fakeprov/connect", { method: "POST" });
    expect(start.status).toBe(200);
    const { authorizationUrl } = (await start.json()) as { authorizationUrl: string };
    expect(new URL(authorizationUrl).host).toBe("auth.example.com");

    const stateParam = new URL(authorizationUrl).searchParams.get("state") ?? "";
    const callback = await fetch(`${base}/v1/callback/fakeprov?state=${stateParam}&code=good-code`);
    const page = await callback.text();
    expect(callback.status).toBe(200);
    expect(page).toContain("Connected");
    expect(page).not.toContain(stateParam);

    const replay = await fetch(`${base}/v1/callback/fakeprov?state=${stateParam}&code=good-code`);
    expect(replay.status).toBe(400);

    const detail = (await (await api("/v1/providers/fakeprov")).json()) as { provider: { availability: string; connection: { id: string } } };
    expect(detail.provider.availability).toBe("connected");
    const connectionId = detail.provider.connection.id;

    const action = await api(`/v1/connections/${connectionId}/actions/fakeprov.items.list`, { method: "POST", body: JSON.stringify({ input: {} }), headers: { "Content-Type": "application/json" } });
    expect(action.status).toBe(200);
    expect(state.lastCredentials?.accessToken?.reveal()).toBe(PLANTED_TOKEN);

    const write = await api(`/v1/connections/${connectionId}/actions/fakeprov.items.rename`, { method: "POST", body: JSON.stringify({ input: { name: "x" } }), headers: { "Content-Type": "application/json" } });
    expect(write.status).toBe(403);
    expect(((await write.json()) as { error: { code: string } }).error.code).toBe("approval_required");

    const disconnect = await api(`/v1/connections/${connectionId}`, { method: "DELETE" });
    expect(((await disconnect.json()) as { revocation: string }).revocation).toBe("revoked");

    const activity = (await (await api("/v1/activity")).json()) as { activity: { action: string }[] };
    expect(activity.activity.map((entry) => entry.action)).toContain("connection.disconnected");

    // The planted provider token must not appear in any response, the audit log or the server log.
    const everything = [
      JSON.stringify(detail),
      JSON.stringify(activity),
      JSON.stringify(await (await api("/v1/providers")).json()),
      JSON.stringify(await (await api("/v1/connections")).json()),
      logLines.join("\n"),
    ].join("\n");
    expect(everything).not.toContain(PLANTED_TOKEN);
    expect(everything).not.toContain(token);
  });

  it("returns safe errors for planned providers and unknown connections (BK-5)", async () => {
    const planned = await api("/v1/providers/vercel/connect", { method: "POST" });
    expect(planned.status).toBe(409);
    expect(await planned.json()).toEqual({ error: { code: "not_available", message: "Vercel is not available yet." } });
    const missing = await api("/v1/connections/conn_aaaaaaaaaaaaaaaaaaaaaa", { method: "DELETE" });
    expect(missing.status).toBe(404);
  });

  it("does not echo request data on a failed callback", async () => {
    const response = await fetch(`${base}/v1/callback/fakeprov?state=<script>alert(1)</script>&code=x`);
    const page = await response.text();
    expect(response.status).toBe(400);
    expect(page).not.toContain("<script>");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  });
});
