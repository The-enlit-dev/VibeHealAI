import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config.js";
import { tempDir, testRsaKey } from "./test-support/fixtures.js";

const baseEnv = () => ({
  BRIXO_CLIENT_TOKEN: randomBytes(32).toString("base64url"),
  BRIXO_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
});

const problems = (env: Record<string, string>, cwd?: string): string[] => {
  try {
    loadConfig(env, cwd);
    return [];
  } catch (error) {
    if (error instanceof ConfigError) return [...error.problems];
    throw error;
  }
};

describe("loadConfig (BK-1, BK-7, CR-3)", () => {
  let dir: string;
  let cleanup: () => Promise<void>;
  beforeEach(async () => ({ dir, cleanup } = await tempDir()));
  afterEach(() => cleanup());

  it("loads a minimal valid configuration with loopback defaults", () => {
    const config = loadConfig(baseEnv(), dir);
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(8787);
    expect(config.encryptionKey).toHaveLength(32);
    expect("missing" in config.providers.github && config.providers.github.missing).toContain("GITHUB_APP_ID");
  });

  it("requires the client token and encryption key", () => {
    const found = problems({}).join("\n");
    expect(found).toContain("BRIXO_CLIENT_TOKEN");
    expect(found).toContain("BRIXO_ENCRYPTION_KEY");
  });

  it("rejects placeholders, short tokens and badly sized keys", () => {
    expect(problems({ ...baseEnv(), BRIXO_CLIENT_TOKEN: "replace-me" }).join()).toContain("BRIXO_CLIENT_TOKEN");
    expect(problems({ ...baseEnv(), BRIXO_CLIENT_TOKEN: "short" }).join()).toContain("43");
    expect(problems({ ...baseEnv(), BRIXO_ENCRYPTION_KEY: randomBytes(16).toString("base64") }).join()).toContain("32 bytes");
    expect(problems({ ...baseEnv(), BRIXO_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64") }).join()).toContain("random");
  });

  it("refuses a non-loopback host unless explicitly allowed", () => {
    expect(problems({ ...baseEnv(), BRIXO_HOST: "0.0.0.0" }).join()).toContain("loopback");
    expect(problems({ ...baseEnv(), BRIXO_HOST: "0.0.0.0", BRIXO_ALLOW_NON_LOOPBACK: "true" })).toEqual([]);
  });

  it("requires https for a non-loopback public URL", () => {
    expect(problems({ ...baseEnv(), BRIXO_PUBLIC_URL: "http://example.com" }).join()).toContain("https");
    expect(problems({ ...baseEnv(), BRIXO_PUBLIC_URL: "https://example.com" })).toEqual([]);
  });

  it("never includes secret values in error messages", () => {
    const env = { ...baseEnv(), BRIXO_CLIENT_TOKEN: "x".repeat(10) + "unique-secret-marker" };
    const message = (() => {
      try {
        loadConfig({ ...env, BRIXO_ENCRYPTION_KEY: "not-base64-unique-marker" });
        return "";
      } catch (error) {
        return String((error as Error).message);
      }
    })();
    expect(message).not.toContain("unique-secret-marker");
    expect(message).not.toContain("not-base64-unique-marker");
  });

  it("loads a complete GitHub App configuration", async () => {
    const { privateKey } = testRsaKey();
    const keyPath = path.join(dir, "app.pem");
    await writeFile(keyPath, privateKey.export({ type: "pkcs1", format: "pem" }));
    const config = loadConfig(
      {
        ...baseEnv(),
        GITHUB_APP_ID: "12345",
        GITHUB_APP_SLUG: "brixoai-dev",
        GITHUB_APP_CLIENT_ID: "Iv1.abcdef123456",
        GITHUB_APP_CLIENT_SECRET: randomBytes(20).toString("hex"),
        GITHUB_APP_PRIVATE_KEY_PATH: keyPath,
      },
      dir,
    );
    expect("appId" in config.providers.github).toBe(true);
    expect(JSON.stringify(config)).not.toContain("BEGIN");
  });

  it("fails startup on an unreadable GitHub private key", () => {
    const found = problems({
      ...baseEnv(),
      GITHUB_APP_ID: "12345",
      GITHUB_APP_SLUG: "brixoai-dev",
      GITHUB_APP_CLIENT_ID: "Iv1.abcdef123456",
      GITHUB_APP_CLIENT_SECRET: "a-client-secret-value",
      GITHUB_APP_PRIVATE_KEY_PATH: path.join(dir, "missing.pem"),
    });
    expect(found.join()).toContain("GITHUB_APP_PRIVATE_KEY_PATH");
  });
});
