// Safety checks for everything Netlify would publish (website/) and for the admin UI.
// They run in `npm test` and catch secrets, private addresses, third-party assets,
// CSP-breaking inline code and stray files before anything is published.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, "..", "website");
const adminDir = path.resolve(here, "admin-ui");

const SECRET_PATTERNS = [
  /BRIXO_ENCRYPTION_KEY/,
  /BRIXO_CLIENT_TOKEN/,
  /GITHUB_APP_CLIENT_SECRET/,
  /GITHUB_APP_PRIVATE_KEY/,
  /WAITLIST_ADMIN_PASSWORD_HASH/,
  /scrypt:\d+:\d+:\d+:/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/,
  /\bsk-ant-[A-Za-z0-9_-]{10,}/,
];

const TEXT_EXTENSIONS = new Set([".html", ".css", ".js", ".svg", ".txt", ".xml"]);
const PUBLISHABLE_EXTENSIONS = new Set([...TEXT_EXTENSIONS, ".png", ".ico", ".webmanifest"]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function textFiles(dir: string): { name: string; text: string }[] {
  return walk(dir)
    .filter((file) => TEXT_EXTENSIONS.has(path.extname(file)))
    .map((file) => ({ name: path.relative(dir, file), text: readFileSync(file, "utf8") }));
}

const site = textFiles(siteDir);
const admin = textFiles(adminDir);
const htmlPages = site.filter((f) => f.name.endsWith(".html"));

describe("public website files", () => {
  it("only contains web assets (no README, source, data or config files)", () => {
    for (const file of walk(siteDir)) {
      expect(PUBLISHABLE_EXTENSIONS.has(path.extname(file)), path.relative(siteDir, file)).toBe(true);
    }
  });

  it("contains no secret-like values or backend setting names", () => {
    for (const file of [...site, ...admin]) {
      for (const pattern of SECRET_PATTERNS) {
        expect(pattern.test(file.text), `${file.name} matches ${pattern}`).toBe(false);
      }
    }
  });

  it("contains no email addresses in frontend code", () => {
    for (const file of [...site, ...admin]) {
      expect(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(file.text), file.name).toBe(false);
    }
  });

  it("loads no third-party scripts, styles, fonts or images (text links to references are allowed)", () => {
    for (const file of [...site, ...admin]) {
      expect(/\ssrc\s*=\s*["']\s*(?:https?:)?\/\//i.test(file.text), `${file.name}: external src`).toBe(false);
      // <link rel="canonical"> legitimately points at the site's own absolute URL; asset links must be local.
      for (const tag of file.text.match(/<link\b[^>]*>/gi) ?? []) {
        if (/rel="(?:canonical|alternate)"/i.test(tag)) continue;
        expect(/href\s*=\s*["']\s*(?:https?:)?\/\//i.test(tag), `${file.name}: external asset ${tag}`).toBe(false);
      }
      expect(/@import|url\(\s*["']?(?:https?:)?\/\//i.test(file.text), `${file.name}: external CSS`).toBe(false);
    }
  });

  it("has no executable inline scripts, event handlers or style attributes (CSP: script-src/style-src 'self')", () => {
    for (const page of [...htmlPages, ...admin.filter((f) => f.name.endsWith(".html"))]) {
      const inlineScripts = page.text.match(/<script(?![^>]*\bsrc=)[^>]*>/gi) ?? [];
      for (const tag of inlineScripts) {
        expect(tag, `${page.name}: inline script must be JSON-LD data`).toMatch(/type="application\/ld\+json"/);
      }
      expect(/\son[a-z]+\s*=/i.test(page.text), `${page.name}: event handler attribute`).toBe(false);
      expect(/\sstyle\s*=/i.test(page.text), `${page.name}: style attribute`).toBe(false);
    }
  });

  it("does not use innerHTML, eval or document.write in any script", () => {
    for (const file of [...site, ...admin].filter((f) => f.name.endsWith(".js"))) {
      const code = file.text
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");
      expect(/innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function|document\.write/.test(code), file.name).toBe(false);
    }
  });

  it("does not use the undecided product name in public copy", () => {
    for (const file of site) {
      expect(/brixo/i.test(file.text), file.name).toBe(false);
    }
  });

  it("does not ship the admin dashboard with the public site", () => {
    expect(walk(siteDir).some((file) => /admin/i.test(path.relative(siteDir, file)))).toBe(false);
  });
});
