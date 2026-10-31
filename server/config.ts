import { createPrivateKey, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import type { LogLevel } from "./security/logger.js";
import { Secret } from "./security/secret.js";

// All configuration comes from environment variables and is validated at startup (BK-7).
// Error messages name variables, never their values.

export interface GitHubAppConfig {
  readonly appId: string;
  readonly slug: string;
  readonly clientId: string;
  readonly clientSecret: Secret;
  readonly privateKey: KeyObject;
}

export interface ProviderConfigs {
  readonly github: GitHubAppConfig | { readonly missing: readonly string[] };
}

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly publicUrl: URL;
  readonly dataDir: string;
  readonly clientToken: Secret;
  readonly encryptionKey: Buffer;
  readonly encryptionKeyId: string;
  readonly logLevel: LogLevel;
  readonly allowNonLoopback: boolean;
  readonly providers: ProviderConfigs;
}

export class ConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid BrixoAI backend configuration:\n- ${problems.join("\n- ")}`);
    this.name = "ConfigError";
  }
}

type Env = Readonly<Record<string, string | undefined>>;

const PLACEHOLDER = /^(|replace[-_ ]?me.*|changeme|<.*>|x+|your[-_].*)$/i;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host) || (isIP(host) === 4 && host.startsWith("127."));
}

function present(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value && !PLACEHOLDER.test(value) ? value : undefined;
}

export function loadConfig(env: Env, cwd = process.cwd()): ServerConfig {
  const problems: string[] = [];

  const host = env.BRIXO_HOST?.trim() || "127.0.0.1";
  const allowNonLoopback = env.BRIXO_ALLOW_NON_LOOPBACK === "true";
  if (!isLoopbackHost(host) && !allowNonLoopback) {
    problems.push("BRIXO_HOST must be a loopback address (127.0.0.1) unless BRIXO_ALLOW_NON_LOOPBACK=true (BK-1).");
  }

  const port = Number(env.BRIXO_PORT?.trim() || "8787");
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push("BRIXO_PORT must be an integer between 1 and 65535.");

  let publicUrl = new URL(`http://127.0.0.1:${Number.isInteger(port) ? port : 8787}`);
  if (env.BRIXO_PUBLIC_URL?.trim()) {
    try {
      publicUrl = new URL(env.BRIXO_PUBLIC_URL.trim());
      const loopback = isLoopbackHost(publicUrl.hostname.replace(/^\[|\]$/g, ""));
      if (publicUrl.protocol !== "https:" && !(publicUrl.protocol === "http:" && loopback)) {
        problems.push("BRIXO_PUBLIC_URL must use https, or http on a loopback address.");
      }
    } catch {
      problems.push("BRIXO_PUBLIC_URL must be a valid URL.");
    }
  }

  const clientToken = present(env, "BRIXO_CLIENT_TOKEN");
  if (!clientToken) problems.push("BRIXO_CLIENT_TOKEN is required. Run `npm run setup:env` to generate one.");
  else if (clientToken.length < 43) problems.push("BRIXO_CLIENT_TOKEN must be at least 43 characters (32 random bytes).");

  let encryptionKey = Buffer.alloc(0);
  const rawKey = present(env, "BRIXO_ENCRYPTION_KEY");
  if (!rawKey) {
    problems.push("BRIXO_ENCRYPTION_KEY is required. Run `npm run setup:env` to generate one.");
  } else {
    encryptionKey = Buffer.from(rawKey, "base64");
    if (encryptionKey.length !== 32 || encryptionKey.toString("base64") !== rawKey) {
      problems.push("BRIXO_ENCRYPTION_KEY must be exactly 32 bytes encoded as standard base64 (CR-3).");
    } else if (new Set(encryptionKey).size < 8) {
      problems.push("BRIXO_ENCRYPTION_KEY does not look random. Generate it with `npm run setup:env`.");
    }
  }

  const encryptionKeyId = env.BRIXO_ENCRYPTION_KEY_ID?.trim() || "local-1";
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(encryptionKeyId)) problems.push("BRIXO_ENCRYPTION_KEY_ID has an invalid format.");

  const logLevel = (env.BRIXO_LOG_LEVEL?.trim() || "info") as LogLevel;
  if (!["debug", "info", "warn", "error"].includes(logLevel)) problems.push("BRIXO_LOG_LEVEL must be debug, info, warn or error.");

  const dataDir = path.resolve(cwd, env.BRIXO_DATA_DIR?.trim() || ".brixo-data");

  const github = loadGitHubConfig(env, cwd, problems);

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    host,
    port,
    publicUrl,
    dataDir,
    clientToken: new Secret(clientToken as string),
    encryptionKey,
    encryptionKeyId,
    logLevel,
    allowNonLoopback,
    providers: { github },
  };
}

/**
 * GitHub App settings are optional: when absent the provider shows "Not configured"
 * and lists the missing names. When partially present but invalid, startup fails.
 */
function loadGitHubConfig(env: Env, cwd: string, problems: string[]): ProviderConfigs["github"] {
  const names = [
    "GITHUB_APP_ID",
    "GITHUB_APP_SLUG",
    "GITHUB_APP_CLIENT_ID",
    "GITHUB_APP_CLIENT_SECRET",
    "GITHUB_APP_PRIVATE_KEY_PATH",
  ] as const;
  const values = Object.fromEntries(names.map((name) => [name, present(env, name)])) as Record<
    (typeof names)[number],
    string | undefined
  >;
  const missing = names.filter((name) => values[name] === undefined);
  if (missing.length > 0) return { missing };

  const appId = values.GITHUB_APP_ID as string;
  const slug = values.GITHUB_APP_SLUG as string;
  const clientId = values.GITHUB_APP_CLIENT_ID as string;
  if (!/^\d{1,12}$/.test(appId)) problems.push("GITHUB_APP_ID must be numeric.");
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) problems.push("GITHUB_APP_SLUG has an invalid format.");
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(clientId)) problems.push("GITHUB_APP_CLIENT_ID has an invalid format.");

  let privateKey: KeyObject | undefined;
  try {
    const keyPath = path.resolve(cwd, values.GITHUB_APP_PRIVATE_KEY_PATH as string);
    privateKey = createPrivateKey(readFileSync(keyPath, "utf8"));
    if (privateKey.asymmetricKeyType !== "rsa") problems.push("GITHUB_APP_PRIVATE_KEY_PATH must point to an RSA private key.");
  } catch {
    problems.push("GITHUB_APP_PRIVATE_KEY_PATH could not be read as a PEM private key.");
  }
  if (!privateKey) return { missing: [] };

  return { appId, slug, clientId, clientSecret: new Secret(values.GITHUB_APP_CLIENT_SECRET as string), privateKey };
}
