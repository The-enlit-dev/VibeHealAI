// Safety checks for the public marketing site (website/). These run in `npm test`.
// They catch secrets, private addresses, third-party assets and CSP-breaking inline code
// before anything is published.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, "..", "website");

const SECRET_PATTERNS = [
  /BRIXO_ENCRYPTION_KEY/,
  /BRIXO_CLIENT_TOKEN/,
  /GITHUB_APP_CLIENT_SECRET/,
  /GITHUB_APP_PRIVATE_KEY/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/,
  /\bsk-ant-[A-Za-z0-9_-]{10,}/,
];

async function siteFiles(): Promise<{ name: string; text: string }[]> {
  const names = await readdir(siteDir);
  return Promise.all(
    names.map(async (name) => ({ name, text: await readFile(path.join(siteDir, name), "utf8") })),
  );
}

describe("public marketing site", () => {
  it("contains no secret-like values or backend setting names", async () => {
    for (const file of await siteFiles()) {
      for (const pattern of SECRET_PATTERNS) {
        expect(pattern.test(file.text), `${file.name} matches ${pattern}`).toBe(false);
      }
    }
  });

  it("contains no email addresses (private or otherwise) in frontend code", async () => {
    for (const file of await siteFiles()) {
      expect(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(file.text), file.name).toBe(false);
    }
  });

  it("loads no third-party scripts, styles, fonts or images", async () => {
    for (const file of await siteFiles()) {
      expect(/(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//i.test(file.text), file.name).toBe(false);
      expect(/@import\s+url\(\s*["']?https?:/i.test(file.text), file.name).toBe(false);
    }
  });

  it("has no inline scripts or event-handler attributes (CSP: script-src 'self')", async () => {
    const html = (await siteFiles()).find((f) => f.name === "index.html");
    expect(html).toBeDefined();
    expect(/<script(?![^>]*\bsrc=)/i.test(html?.text ?? "")).toBe(false);
    expect(/\son[a-z]+\s*=/i.test(html?.text ?? "")).toBe(false);
    expect(/\sstyle\s*=/i.test(html?.text ?? "")).toBe(false);
  });

  it("does not use innerHTML, eval or document.write in the script", async () => {
    const script = (await siteFiles()).find((f) => f.name === "app.js");
    expect(script).toBeDefined();
    // Ignore comment lines so the explanatory comments do not trigger the check.
    const code = (script?.text ?? "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(/innerHTML|outerHTML|insertAdjacentHTML|\beval\(|document\.write/.test(code)).toBe(false);
  });

  it("states that nothing is available yet and makes no launch or price promise", async () => {
    const html = (await siteFiles()).find((f) => f.name === "index.html")?.text ?? "";
    expect(html).toContain("not available to download yet");
    expect(html).toContain("no release date has been set");
    expect(html).toContain("Join the waitlist");
    expect(html).toContain("Explore how it works");
    expect(html).toContain("Your code deserves a safety net.");
  });
});
