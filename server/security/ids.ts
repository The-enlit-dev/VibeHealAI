import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Random, URL-safe resource id such as "conn_3q2...". 128 bits of entropy. */
export function newId(prefix: "conn" | "cred" | "appr" | "act" | "state"): string {
  return `${prefix}_${randomBytes(16).toString("base64url")}`;
}

/** 256-bit random value for OAuth/installation state (IN-5). */
export function newStateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time comparison of two strings of any length (BK-2). */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

/** Deterministic JSON for hashing approval inputs: keys sorted recursively. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}
