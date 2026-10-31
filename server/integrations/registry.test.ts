import { describe, expect, it } from "vitest";
import type { ProviderMetadata } from "../../shared/providers.js";
import { createProviderRegistry, PROVIDER_ORDER } from "../providers/index.js";
import { createPlannedAdapter } from "../providers/planned-adapter.js";
import { createFakeAdapter, fakeMetadata } from "../test-support/fixtures.js";
import type { ProviderAdapter } from "./adapter.js";
import { IntegrationError } from "./errors.js";
import { ProviderRegistry, RegistryError, validateAdapter } from "./registry.js";

const noFetch = async (): Promise<Response> => {
  throw new Error("network disabled in tests");
};
const registry = createProviderRegistry({ config: { github: { missing: ["GITHUB_APP_ID"] } }, fetch: noFetch });

describe("provider catalog", () => {
  it("registers all nine approved providers in the approved order (DEC-19)", () => {
    expect(registry.list().map((adapter) => adapter.metadata.id)).toEqual([...PROVIDER_ORDER]);
    expect(PROVIDER_ORDER).toEqual(["github", "vercel", "netlify", "supabase", "figma", "stripe", "shopify", "notion", "slack"]);
  });

  it("marks only GitHub as implemented; the rest are planned", () => {
    const implemented = registry.list().filter((adapter) => adapter.metadata.implementation === "implemented");
    expect(implemented.map((adapter) => adapter.metadata.id)).toEqual(["github"]);
  });

  it("does not claim verified scopes for planned providers (IN-8, U15)", () => {
    for (const adapter of registry.list().filter((item) => item.metadata.implementation === "planned")) {
      for (const permission of adapter.metadata.permissions) {
        expect(permission.verified).toBe(false);
        expect(permission.providerScope).toBeUndefined();
      }
    }
  });

  it("starts every provider read-only (DEC-21)", () => {
    for (const adapter of registry.list()) {
      for (const capability of adapter.metadata.capabilities) expect(capability.access).toBe("read");
      for (const permission of adapter.metadata.permissions) expect(permission.access).toBe("read");
    }
  });

  it("keeps Stripe to test mode in its description and notes", () => {
    const stripe = registry.get("stripe");
    expect(stripe?.metadata.summary.toLowerCase()).toContain("test-mode");
    expect(stripe?.metadata.notes.join(" ")).toMatch(/no|not be built/i);
  });
});

describe("common adapter contract (applies to every registered adapter)", () => {
  for (const adapter of registry.list()) {
    describe(adapter.metadata.id, () => {
      it("passes registry validation", () => {
        expect(() => validateAdapter(adapter)).not.toThrow();
      });

      it("reports configuration without leaking values", () => {
        const configuration = adapter.configuration();
        expect(typeof configuration.configured).toBe("boolean");
        for (const name of configuration.missing) expect(name).toMatch(/^[A-Z][A-Z0-9_]+$/);
      });

      it("describes how it supports the core workflow (DEC-16)", () => {
        expect(adapter.metadata.contextUse.length).toBeGreaterThan(10);
      });

      if (adapter.metadata.implementation === "planned") {
        it("cannot connect and exposes no executable capabilities", async () => {
          expect(adapter.capabilities).toHaveLength(0);
          await expect(adapter.beginConnect({ state: "s", callbackUrl: "http://127.0.0.1/cb" })).rejects.toMatchObject({ code: "not_available" });
          await expect(adapter.completeConnect({ query: new URLSearchParams(), callbackUrl: "x" })).rejects.toBeInstanceOf(IntegrationError);
        });
      } else {
        it("implements exactly the capabilities its metadata declares", () => {
          expect(adapter.capabilities.map((capability) => capability.descriptor.id).sort()).toEqual(
            adapter.metadata.capabilities.map((capability) => capability.id).sort(),
          );
        });
      }
    });
  }
});

describe("ProviderRegistry validation (IN-1)", () => {
  const withMetadata = (changes: Partial<ProviderMetadata>, base: ProviderAdapter = createFakeAdapter().adapter): ProviderAdapter => ({
    ...base,
    metadata: { ...base.metadata, ...changes },
  });

  it("rejects duplicate provider ids", () => {
    const local = new ProviderRegistry();
    local.register(createFakeAdapter().adapter);
    expect(() => local.register(createFakeAdapter().adapter)).toThrow(RegistryError);
  });

  it("rejects invalid ids, categories and non-https links", () => {
    expect(() => validateAdapter(withMetadata({ id: "Bad Id" }))).toThrow(/invalid id/);
    expect(() => validateAdapter(withMetadata({ category: "games" as never }))).toThrow(/category/);
    expect(() => validateAdapter(withMetadata({ docsUrl: "http://example.com" }))).toThrow(/https/);
  });

  it("rejects capabilities that use undeclared permissions", () => {
    const capabilities = [{ ...fakeMetadata.capabilities[0]!, requiredPermissions: ["fakeprov.unknown.read"] }];
    expect(() => validateAdapter(withMetadata({ capabilities }))).toThrow(/undeclared permission/);
  });

  it("rejects a capability labelled read that needs a write permission", () => {
    const capabilities = [{ ...fakeMetadata.capabilities[0]!, requiredPermissions: ["fakeprov.items.write"] }];
    expect(() => validateAdapter(withMetadata({ capabilities }))).toThrow(/labelled read/);
  });

  it("rejects permissions not namespaced by the provider id", () => {
    const permissions = [{ ...fakeMetadata.permissions[0]!, id: "other.items.read" }];
    expect(() => validateAdapter(withMetadata({ permissions, capabilities: [] }))).toThrow(/namespaced/);
  });

  it("rejects implemented providers whose capabilities and metadata disagree", () => {
    const { adapter } = createFakeAdapter();
    expect(() => validateAdapter({ ...adapter, capabilities: adapter.capabilities.slice(0, 1) })).toThrow(/not implemented/);
  });

  it("rejects implemented providers without authorization hosts", () => {
    expect(() => validateAdapter(withMetadata({ authorizationHosts: [] }))).toThrow(/authorization hosts/);
  });

  it("rejects planned providers that try to expose capabilities", () => {
    const planned = createPlannedAdapter({ ...fakeMetadata, implementation: "planned" });
    expect(() => validateAdapter({ ...planned, capabilities: createFakeAdapter().adapter.capabilities })).toThrow(/planned/);
  });

  it("finds capabilities only within their own provider", () => {
    const local = new ProviderRegistry();
    local.register(createFakeAdapter().adapter);
    expect(local.capability("fakeprov", "fakeprov.items.list")).toBeDefined();
    expect(local.capability("fakeprov", "github.repositories.list")).toBeUndefined();
  });
});
