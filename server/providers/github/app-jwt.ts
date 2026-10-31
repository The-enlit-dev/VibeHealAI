import { createSign, type KeyObject } from "node:crypto";

/**
 * Creates the short-lived JSON Web Token a GitHub App uses to authenticate as itself
 * (RS256, signed with the App's private key). It is valid for under 10 minutes, and
 * `iat` is backdated 60 seconds to tolerate clock drift. The JWT never leaves the backend.
 */
export function createAppJwt(issuer: string, privateKey: KeyObject, now: Date = new Date()): string {
  const issuedAt = Math.floor(now.getTime() / 1000) - 60;
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iat: issuedAt, exp: issuedAt + 9 * 60, iss: issuer }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(privateKey).toString("base64url")}`;
}

function base64Url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}
