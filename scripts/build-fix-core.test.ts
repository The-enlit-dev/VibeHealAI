import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildFixCore } from "./build-fix-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("browser copy of the error explainer", () => {
  it("matches shared/explainer/ exactly (run npm run build:fix if this fails)", () => {
    const built = buildFixCore() as Map<string, string>;
    expect(built.size).toBeGreaterThan(5);
    for (const [name, text] of built) {
      expect(readFileSync(path.join(root, "website", "fix-core", name), "utf8"), name).toBe(text);
    }
  });

  it("is a page on the site: indexable, in the sitemap, with a module script", () => {
    const html = readFileSync(path.join(root, "website", "fix", "index.html"), "utf8");
    expect(html).toContain('<script src="/fix.js" type="module"></script>');
    expect(html).toContain('<meta name="robots" content="index, follow">');
    expect(readFileSync(path.join(root, "website", "sitemap.xml"), "utf8")).toContain("/fix/</loc>");
  });
});
