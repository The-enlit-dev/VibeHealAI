import { createVerify, randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { GitHubAppConfig } from "../../config.js";
import { Secret } from "../../security/secret.js";
import { testRsaKey } from "../../test-support/fixtures.js";
import { validateAdapter } from "../../integrations/registry.js";
import { GitHubAdapter, mapPermissions } from "./adapter.js";
import { createAppJwt } from "./app-jwt.js";
import type { FetchLike } from "./client.js";

// These tests use a fake fetch. Nothing here proves the adapter works against the
// live GitHub API; that still needs a registered GitHub App (P-11).

const { privateKey, publicKey } = testRsaKey();
const config: GitHubAppConfig = {
  appId: "12345",
  slug: "brixoai-dev",
  clientId: "Iv1.testclientid",
  clientSecret: new Secret(randomBytes(20).toString("hex")),
  privateKey,
};

// Token-shaped values are built at runtime (CR-6).
const USER_TOKEN = `ghu_${"U".repeat(36)}`;
const INSTALLATION_TOKEN = `ghs_${"I".repeat(36)}`;

interface Call {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: unknown;
  redirect: RequestRedirect | undefined;
}

type Handler = (call: Call) => { status?: number; body?: unknown; headers?: Record<string, string> };

function fakeFetch(handlers: Record<string, Handler>): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: FetchLike = async (input, init) => {
    const url = new URL(input);
    const call: Call = {
      method: init.method ?? "GET",
      url,
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      redirect: init.redirect,
    };
    calls.push(call);
    const handler = handlers[`${call.method} ${url.host}${url.pathname}`];
    if (!handler) return new Response(JSON.stringify({ message: "unexpected" }), { status: 500 });
    const { status = 200, body, headers } = handler(call);
    return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status, headers: { "content-type": "application/json", ...headers } });
  };
  return { fetch, calls };
}

const happyHandlers = (overrides: Record<string, Handler> = {}): Record<string, Handler> => ({
  "POST github.com/login/oauth/access_token": () => ({ body: { access_token: USER_TOKEN, token_type: "bearer" } }),
  "GET api.github.com/user/installations": () => ({ body: { total_count: 1, installations: [{ id: 777 }] } }),
  "DELETE api.github.com/applications/Iv1.testclientid/token": () => ({ status: 204 }),
  "GET api.github.com/app/installations/777": () => ({
    body: {
      id: 777,
      account: { login: "octo-org" },
      permissions: { metadata: "read", contents: "read", pull_requests: "read" },
      html_url: "https://github.com/organizations/octo-org/settings/installations/777",
    },
  }),
  "POST api.github.com/app/installations/777/access_tokens": () => ({
    status: 201,
    body: { token: INSTALLATION_TOKEN, expires_at: "2026-10-31T13:00:00Z" },
  }),
  ...overrides,
});

const callbackQuery = (extra: Record<string, string> = {}) =>
  new URLSearchParams({ installation_id: "777", setup_action: "install", code: "abcdef123456", ...extra });

const now = () => new Date("2026-10-31T12:00:00Z");

describe("createAppJwt", () => {
  it("creates an RS256 JWT valid for under 10 minutes, verifiable with the public key", () => {
    const jwt = createAppJwt("Iv1.testclientid", privateKey, now());
    const [header, payload, signature] = jwt.split(".") as [string, string, string];
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    expect(claims.iss).toBe("Iv1.testclientid");
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(600);
    expect(claims.iat).toBeLessThan(now().getTime() / 1000);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(true);
  });
});

describe("GitHubAdapter", () => {
  it("satisfies the common adapter contract", () => {
    expect(() => validateAdapter(new GitHubAdapter({ config, fetch: fakeFetch({}).fetch }))).not.toThrow();
  });

  it("is Not configured, listing names only, when App settings are missing", async () => {
    const adapter = new GitHubAdapter({ config: { missing: ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY_PATH"] }, fetch: fakeFetch({}).fetch });
    expect(adapter.configuration()).toEqual({ configured: false, missing: ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY_PATH"] });
    await expect(adapter.beginConnect({ state: "s", callbackUrl: "x" })).rejects.toMatchObject({ code: "not_configured" });
  });

  it("builds the installation URL on github.com with the state", async () => {
    const adapter = new GitHubAdapter({ config, fetch: fakeFetch({}).fetch });
    const { authorizationUrl } = await adapter.beginConnect({ state: "state-123", callbackUrl: "http://127.0.0.1:8787/v1/callback/github" });
    const url = new URL(authorizationUrl);
    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe("/apps/brixoai-dev/installations/new");
    expect(url.searchParams.get("state")).toBe("state-123");
  });

  describe("completeConnect (IN-10)", () => {
    let fake: ReturnType<typeof fakeFetch>;
    let adapter: GitHubAdapter;
    beforeEach(() => {
      fake = fakeFetch(happyHandlers());
      adapter = new GitHubAdapter({ config, fetch: fake.fetch, now });
    });

    it("verifies the user can access the installation, revokes the user token and stores no credentials", async () => {
      const result = await adapter.completeConnect({ query: callbackQuery(), callbackUrl: "http://127.0.0.1:8787/v1/callback/github" });
      expect(result).toEqual({
        externalAccountId: "777",
        accountLabel: "octo-org",
        grantedPermissions: ["github.metadata.read", "github.contents.read", "github.pull-requests.read"],
        credentials: null,
        manageUrl: "https://github.com/organizations/octo-org/settings/installations/777",
      });
      const paths = fake.calls.map((call) => `${call.method} ${call.url.pathname}`);
      expect(paths).toEqual([
        "POST /login/oauth/access_token",
        "GET /user/installations",
        "DELETE /applications/Iv1.testclientid/token",
        "GET /app/installations/777",
      ]);
      // The client secret goes only to GitHub's token endpoints.
      expect(JSON.stringify(result)).not.toContain(config.clientSecret.reveal());
      expect(JSON.stringify(result)).not.toContain(USER_TOKEN);
    });

    it("never follows redirects and always uses HTTPS GitHub hosts (BK-8)", async () => {
      await adapter.completeConnect({ query: callbackQuery(), callbackUrl: "cb" });
      for (const call of fake.calls) {
        expect(call.redirect).toBe("error");
        expect(call.url.protocol).toBe("https:");
        expect(["api.github.com", "github.com"]).toContain(call.url.host);
      }
    });

    it("rejects an installation id the user cannot access (spoofed callback)", async () => {
      fake = fakeFetch(happyHandlers({ "GET api.github.com/user/installations": () => ({ body: { installations: [{ id: 999 }] } }) }));
      adapter = new GitHubAdapter({ config, fetch: fake.fetch, now });
      await expect(adapter.completeConnect({ query: callbackQuery(), callbackUrl: "cb" })).rejects.toMatchObject({ code: "forbidden" });
      // The user token is revoked even when verification fails.
      expect(fake.calls.some((call) => call.method === "DELETE" && call.url.pathname.endsWith("/token"))).toBe(true);
    });

    it("refuses installations with more than read access", async () => {
      fake = fakeFetch(
        happyHandlers({
          "GET api.github.com/app/installations/777": () => ({ body: { id: 777, account: { login: "o" }, permissions: { metadata: "read", contents: "write" } } }),
        }),
      );
      adapter = new GitHubAdapter({ config, fetch: fake.fetch, now });
      await expect(adapter.completeConnect({ query: callbackQuery(), callbackUrl: "cb" })).rejects.toMatchObject({ code: "forbidden" });
    });

    it("validates callback parameters", async () => {
      await expect(adapter.completeConnect({ query: callbackQuery({ installation_id: "../1" }), callbackUrl: "cb" })).rejects.toMatchObject({ code: "bad_request" });
      await expect(adapter.completeConnect({ query: callbackQuery({ code: "" }), callbackUrl: "cb" })).rejects.toMatchObject({ code: "bad_request" });
      await expect(adapter.completeConnect({ query: callbackQuery({ setup_action: "request" }), callbackUrl: "cb" })).rejects.toMatchObject({ code: "invalid_state" });
      expect(fake.calls).toHaveLength(0);
    });

    it("drops a manage URL that is not on github.com", async () => {
      fake = fakeFetch(
        happyHandlers({
          "GET api.github.com/app/installations/777": () => ({ body: { id: 777, account: { login: "o" }, permissions: { metadata: "read" }, html_url: "https://evil.example/x" } }),
        }),
      );
      adapter = new GitHubAdapter({ config, fetch: fake.fetch, now });
      const result = await adapter.completeConnect({ query: callbackQuery(), callbackUrl: "cb" });
      expect(result.manageUrl).toBeUndefined();
    });
  });

  describe("read-only capabilities", () => {
    const handle = { id: "conn_x", externalAccountId: "777", grantedPermissions: [], credentials: null };
    const capability = (adapter: GitHubAdapter, id: string) => {
      const found = adapter.capabilities.find((item) => item.descriptor.id === id);
      if (!found) throw new Error(`missing ${id}`);
      return found;
    };

    it("lists repositories with whitelisted fields only, using a cached installation token", async () => {
      const fake = fakeFetch(
        happyHandlers({
          "GET api.github.com/installation/repositories": () => ({
            body: {
              total_count: 1,
              repositories: [
                {
                  id: 1,
                  name: "site",
                  full_name: "octo-org/site",
                  owner: { login: "octo-org", email: "hidden@example.com" },
                  private: true,
                  default_branch: "main",
                  html_url: "https://github.com/octo-org/site",
                  clone_url: "https://x-access-token@github.com/octo-org/site.git",
                  permissions: { admin: true },
                },
              ],
            },
          }),
        }),
      );
      const adapter = new GitHubAdapter({ config, fetch: fake.fetch, now });
      const list = capability(adapter, "github.repositories.list");
      const data = await list.execute(handle, {});
      await list.execute(handle, {});
      expect(data).toEqual({
        totalCount: 1,
        repositories: [
          {
            id: 1,
            fullName: "octo-org/site",
            owner: "octo-org",
            name: "site",
            private: true,
            archived: false,
            defaultBranch: "main",
            description: null,
            language: null,
            htmlUrl: "https://github.com/octo-org/site",
            pushedAt: null,
          },
        ],
      });
      expect(JSON.stringify(data)).not.toContain("hidden@example.com");
      expect(JSON.stringify(data)).not.toContain(INSTALLATION_TOKEN);
      expect(fake.calls.filter((call) => call.url.pathname.endsWith("/access_tokens"))).toHaveLength(1);
      const apiCall = fake.calls.find((call) => call.url.pathname === "/installation/repositories");
      expect(apiCall?.headers.Authorization).toBe(`Bearer ${INSTALLATION_TOKEN}`);
      expect(apiCall?.headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
    });

    it("encodes path segments and drops author emails from commits", async () => {
      const fake = fakeFetch(
        happyHandlers({
          "GET api.github.com/repos/octo-org/my.site/commits": () => ({
            body: [{ sha: "a".repeat(40), html_url: "https://github.com/octo-org/my.site/commit/a", commit: { message: "Fix build\n\nlong body", author: { name: "Octo", email: "o@example.com", date: "2026-10-30T10:00:00Z" } } }],
          }),
        }),
      );
      const adapter = new GitHubAdapter({ config, fetch: fake.fetch, now });
      const data = await capability(adapter, "github.commits.list").execute(handle, { owner: "octo-org", repo: "my.site", ref: "main" });
      expect(data).toEqual({ commits: [{ sha: "a".repeat(40), message: "Fix build", authorName: "Octo", authoredAt: "2026-10-30T10:00:00Z", htmlUrl: "https://github.com/octo-org/my.site/commit/a" }] });
      expect(JSON.stringify(data)).not.toContain("o@example.com");
      expect(fake.calls.at(-1)?.url.searchParams.get("sha")).toBe("main");
    });

    it("rejects unsafe repository names and refs", () => {
      const adapter = new GitHubAdapter({ config, fetch: fakeFetch({}).fetch, now });
      const validate = capability(adapter, "github.commits.list").validateInput;
      expect(() => validate({ owner: "octo", repo: ".." }, "")).toThrow();
      expect(() => validate({ owner: "octo/../x", repo: "site" }, "")).toThrow();
      expect(() => validate({ owner: "octo", repo: "site", ref: "../../etc" }, "")).toThrow();
      expect(() => validate({ owner: "octo", repo: "site", perPage: 500 }, "")).toThrow();
    });

    it("maps GitHub errors to safe codes without copying response bodies", async () => {
      const cases: [number, Record<string, string>, string][] = [
        [401, {}, "provider_unauthorized"],
        [404, {}, "not_found"],
        [403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "0" }, "rate_limited"],
        [429, { "retry-after": "30" }, "rate_limited"],
        [500, {}, "provider_error"],
      ];
      for (const [status, headers, code] of cases) {
        const fake = fakeFetch(
          happyHandlers({ "GET api.github.com/repos/o/r": () => ({ status, headers, body: { message: `leak ${INSTALLATION_TOKEN}` } }) }),
        );
        const adapter = new GitHubAdapter({ config, fetch: fake.fetch, now });
        const error = await capability(adapter, "github.repository.get").execute(handle, { owner: "o", repo: "r" }).catch((caught: unknown) => caught);
        expect(error).toMatchObject({ code });
        expect(String((error as Error).message)).not.toContain(INSTALLATION_TOKEN);
      }
    });

    it("revokes the cached installation token on disconnect and asks the user to uninstall", async () => {
      const fake = fakeFetch(
        happyHandlers({
          "GET api.github.com/installation/repositories": () => ({ body: { total_count: 0, repositories: [] } }),
          "DELETE api.github.com/installation/token": () => ({ status: 204 }),
        }),
      );
      const adapter = new GitHubAdapter({ config, fetch: fake.fetch, now });
      await capability(adapter, "github.repositories.list").execute(handle, {});
      const result = await adapter.revoke(handle);
      expect(result.outcome).toBe("manual_required");
      const revoke = fake.calls.find((call) => call.method === "DELETE" && call.url.pathname === "/installation/token");
      expect(revoke?.headers.Authorization).toBe(`Bearer ${INSTALLATION_TOKEN}`);
    });
  });

  it("maps only read permissions", () => {
    expect(mapPermissions({ metadata: "read", issues: "read" })).toEqual(["github.metadata.read"]);
    expect(() => mapPermissions({ administration: "write" })).toThrow();
  });
});
