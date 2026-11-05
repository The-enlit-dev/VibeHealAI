import { describe, expect, it } from "vitest";
import type { ProviderSummary } from "../shared/api.js";
import { BackendClient } from "./main/backend-client.js";
import { createBridgeHandlers } from "./main/bridge-handlers.js";
import { parseDesktopConfig } from "./main/desktop-config.js";
import { isAllowedAuthorizationUrl, isAllowedProviderLink } from "./main/links.js";
import { EMPTY_FILTER, filterCatalog, monogram, presentCategories } from "./renderer/catalog-filter.js";

const TOKEN = "t".repeat(43);

const providers: ProviderSummary[] = [
  { id: "github", name: "GitHub", category: "source_control", summary: "Read repositories.", implementation: "implemented", roadmapMilestone: "IM2", availability: "not_configured" },
  { id: "vercel", name: "Vercel", category: "deployment", summary: "See deployments.", implementation: "planned", roadmapMilestone: "IM3", availability: "coming_soon" },
  { id: "netlify", name: "Netlify", category: "deployment", summary: "See deploys.", implementation: "planned", roadmapMilestone: "IM3", availability: "coming_soon" },
];

describe("catalog filtering", () => {
  it("filters by text, category and availability", () => {
    expect(filterCatalog(providers, EMPTY_FILTER)).toHaveLength(3);
    expect(filterCatalog(providers, { ...EMPTY_FILTER, query: "deploy" }).map((p) => p.id)).toEqual(["vercel", "netlify"]);
    expect(filterCatalog(providers, { ...EMPTY_FILTER, query: "source control" }).map((p) => p.id)).toEqual(["github"]);
    expect(filterCatalog(providers, { ...EMPTY_FILTER, category: "deployment", query: "net" }).map((p) => p.id)).toEqual(["netlify"]);
    expect(filterCatalog(providers, { ...EMPTY_FILTER, availability: "not_configured" }).map((p) => p.id)).toEqual(["github"]);
    expect(filterCatalog(providers, { ...EMPTY_FILTER, query: "zzz" })).toEqual([]);
  });

  it("lists present categories once, and builds monograms", () => {
    expect(presentCategories(providers)).toEqual(["source_control", "deployment"]);
    expect(monogram("GitHub")).toBe("Gi");
    expect(monogram("Some Provider")).toBe("SP");
  });
});

describe("external link guard (IN-6)", () => {
  it("allows only https URLs on declared authorization hosts", () => {
    expect(isAllowedAuthorizationUrl("https://github.com/apps/x/installations/new", ["github.com"])).toBe(true);
    expect(isAllowedAuthorizationUrl("http://github.com/apps/x", ["github.com"])).toBe(false);
    expect(isAllowedAuthorizationUrl("https://github.com.evil.example/", ["github.com"])).toBe(false);
    expect(isAllowedAuthorizationUrl("https://user:pass@github.com/", ["github.com"])).toBe(false);
    expect(isAllowedAuthorizationUrl("javascript:alert(1)", ["github.com"])).toBe(false);
    expect(isAllowedAuthorizationUrl("file:///etc/passwd", ["github.com"])).toBe(false);
  });

  it("allows provider website and docs hosts for ordinary links", () => {
    const provider = { authorizationHosts: ["github.com"], websiteUrl: "https://github.com", docsUrl: "https://docs.github.com/en/apps" };
    expect(isAllowedProviderLink("https://docs.github.com/en/apps", provider)).toBe(true);
    expect(isAllowedProviderLink("https://evil.example/", provider)).toBe(false);
  });
});

describe("desktop config (CR-1)", () => {
  it("defaults to the loopback backend and accepts only loopback http or https", () => {
    expect(parseDesktopConfig({}).backendUrl.origin).toBe("http://127.0.0.1:8787");
    expect(() => parseDesktopConfig({ VIBEHEAL_BACKEND_URL: "http://example.com" })).toThrow();
    expect(parseDesktopConfig({ VIBEHEAL_BACKEND_URL: "https://vibeheal.example" }).backendUrl.protocol).toBe("https:");
  });

  it("treats a missing or malformed token as not set up", () => {
    expect(parseDesktopConfig({}).clientToken).toBeNull();
    expect(parseDesktopConfig({ VIBEHEAL_CLIENT_TOKEN: "short" }).clientToken).toBeNull();
    expect(parseDesktopConfig({ VIBEHEAL_CLIENT_TOKEN: TOKEN }).clientToken).toBe(TOKEN);
  });
});

describe("bridge handlers", () => {
  const setup = (responses: Record<string, unknown>) => {
    const requests: { url: string; init: RequestInit }[] = [];
    const opened: string[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      const key = `${init.method} ${new URL(url).pathname}`;
      if (!(key in responses)) return new Response(JSON.stringify({ error: { code: "not_found", message: "Not found." } }), { status: 404 });
      return new Response(JSON.stringify(responses[key]), { status: 200 });
    };
    const client = new BackendClient(parseDesktopConfig({ VIBEHEAL_CLIENT_TOKEN: TOKEN }), fetchImpl);
    const handlers = createBridgeHandlers({ client, openExternal: async (url) => void opened.push(url) });
    return { handlers, requests, opened };
  };

  const github = { provider: { authorizationHosts: ["github.com"], websiteUrl: "https://github.com", docsUrl: "https://docs.github.com/en/apps" } };

  it("sends the token to the backend and never returns it to the renderer", async () => {
    const { handlers, requests } = setup({ "GET /v1/providers": { providers } });
    const result = await handlers.listProviders();
    expect(result).toEqual({ ok: true, data: providers });
    expect((requests[0]?.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("rejects malformed arguments from the renderer before calling the backend", async () => {
    const { handlers, requests } = setup({});
    for (const result of [
      await handlers.getProvider("../admin"),
      await handlers.disconnect("conn_x/../../v1"),
      await handlers.runAction("conn_aaaaaaaaaaaaaaaaaaaaaa", "github.repositories.list", "not-an-object"),
      await handlers.runAction("conn_aaaaaaaaaaaaaaaaaaaaaa", "bad id", {}),
      await handlers.listActivity(10_000),
    ]) {
      expect(result).toMatchObject({ ok: false, error: { code: "bad_request" } });
    }
    expect(requests).toHaveLength(0);
  });

  it("opens the authorization URL only when its host is declared by the provider", async () => {
    const good = setup({
      "GET /v1/providers/github": github,
      "POST /v1/providers/github/connect": { authorizationUrl: "https://github.com/apps/x/installations/new?state=s", expiresAt: "2026-10-31T12:10:00Z" },
    });
    expect(await good.handlers.connect("github")).toEqual({ ok: true, data: { expiresAt: "2026-10-31T12:10:00Z" } });
    expect(good.opened).toEqual(["https://github.com/apps/x/installations/new?state=s"]);

    const bad = setup({
      "GET /v1/providers/github": github,
      "POST /v1/providers/github/connect": { authorizationUrl: "https://evil.example/login", expiresAt: "x" },
    });
    expect(await bad.handlers.connect("github")).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect(bad.opened).toEqual([]);
  });

  it("reports an unreachable backend with a safe message", async () => {
    const client = new BackendClient(parseDesktopConfig({ VIBEHEAL_CLIENT_TOKEN: TOKEN }), async () => {
      throw new Error("ECONNREFUSED");
    });
    const handlers = createBridgeHandlers({ client, openExternal: async () => {} });
    expect(await handlers.listProviders()).toMatchObject({ ok: false, error: { code: "backend_unreachable" } });
    expect(await handlers.backendStatus()).toEqual({ ok: true, data: { reachable: false, configured: true, backendUrl: "http://127.0.0.1:8787" } });
  });

  it("explains how to set up the desktop app when it has no token", async () => {
    const client = new BackendClient(parseDesktopConfig({}), async () => new Response("{}"));
    const handlers = createBridgeHandlers({ client, openExternal: async () => {} });
    expect(await handlers.listProviders()).toMatchObject({ ok: false, error: { code: "unauthorized" } });
  });
});
