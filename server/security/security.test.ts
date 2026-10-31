import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";
import { canonicalJson, constantTimeEqual, newId, newStateToken } from "./ids.js";
import { redact, redactValue } from "./redaction.js";
import { Secret } from "./secret.js";

// Token-shaped strings are assembled at runtime so no secret-looking literal sits in source.
const fake = (prefix: string, length = 36): string => `${prefix}${"A1b2C3d4".repeat(8).slice(0, length)}`;

describe("Secret (CR-4)", () => {
  it("never reveals its value through string conversion, JSON or inspect", () => {
    const secret = new Secret("super-secret-value");
    expect(String(secret)).toBe("[REDACTED]");
    expect(`${secret}`).toBe("[REDACTED]");
    expect(JSON.stringify({ secret })).toBe('{"secret":"[REDACTED]"}');
    expect(inspect({ secret })).not.toContain("super-secret-value");
    expect(secret.reveal()).toBe("super-secret-value");
  });

  it("rejects empty values", () => {
    expect(() => new Secret("")).toThrow();
  });
});

describe("redact (SE-2, BK-9)", () => {
  const samples: Record<string, string> = {
    "GitHub installation token": fake("ghs_"),
    "GitHub user token": fake("ghu_"),
    "GitHub fine-grained token": fake("github_pat_", 40),
    "Stripe secret key": fake("sk_live_", 24),
    "Stripe test key": fake("sk_test_", 24),
    "Slack bot token": fake("xoxb-", 30),
    "Shopify token": `shpat_${"ab12".repeat(8)}`,
    "OpenAI-style key": fake("sk-", 40),
    "AWS key id": `AKIA${"ABCDEFGH12345678"}`,
    JWT: `eyJ${"a".repeat(12)}.${"b".repeat(12)}.${"c".repeat(12)}`,
  };

  for (const [name, value] of Object.entries(samples)) {
    it(`removes a ${name}`, () => {
      expect(redact(`value: ${value} end`)).not.toContain(value);
    });
  }

  it("removes bearer values, sensitive assignments and credential query parameters", () => {
    const token = fake("opaque", 30);
    expect(redact(`Authorization: Bearer ${token}`)).not.toContain(token);
    expect(redact(`client_secret=${token}`)).not.toContain(token);
    expect(redact(`{"apiKey": "${token}"}`)).not.toContain(token);
    expect(redact(`https://x.test/cb?code=${token}&state=abc12345`)).not.toContain(token);
  });

  it("removes private key blocks", () => {
    const block = "-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----";
    expect(redact(`key: ${block}`)).toBe("key: [REDACTED]");
  });

  it("removes exact known secret values", () => {
    expect(redact("the value is hunter2-long", ["hunter2-long"])).toBe("the value is [REDACTED]");
  });

  it("leaves ordinary text alone", () => {
    expect(redact("Connected GitHub (octocat). 3 repositories.")).toBe("Connected GitHub (octocat). 3 repositories.");
  });

  it("drops sensitive keys in structured values", () => {
    expect(redactValue({ accessToken: "abc", nested: { password: "x", ok: "fine" } })).toEqual({
      accessToken: "[REDACTED]",
      nested: { password: "[REDACTED]", ok: "fine" },
    });
  });
});

describe("logger (BK-9)", () => {
  it("redacts messages and drops secret fields before writing", () => {
    const lines: string[] = [];
    const logger = createLogger({ level: "debug", write: (line) => lines.push(line) });
    const token = fake("ghs_");
    logger.info(`token ${token}`, { token, safe: "yes", secret: new Secret("hidden-value") });
    const output = lines.join("\n");
    expect(output).not.toContain(token);
    expect(output).not.toContain("hidden-value");
    expect(output).toContain("yes");
  });

  it("respects the level", () => {
    const lines: string[] = [];
    createLogger({ level: "warn", write: (line) => lines.push(line) }).info("hidden");
    expect(lines).toHaveLength(0);
  });
});

describe("ids", () => {
  it("creates unique prefixed ids and 256-bit state tokens", () => {
    expect(newId("conn")).toMatch(/^conn_[A-Za-z0-9_-]{22}$/);
    expect(newId("conn")).not.toBe(newId("conn"));
    expect(newStateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("compares in constant time regardless of length", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });

  it("produces canonical JSON independent of key order", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [1, { f: 1, e: 2 }] } })).toBe(canonicalJson({ a: { c: [1, { e: 2, f: 1 }], d: 2 }, b: 1 }));
  });
});
