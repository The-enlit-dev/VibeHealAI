// Tests for the static site generator and the SEO, AEO and GEO foundations it produces.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, escapeHtml, isPlaceholderUrl, render } from "./build-site.mjs";
import { AI_TOOLS, PLANNED_CAPABILITIES } from "../waitlist/validation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brand = JSON.parse(readFileSync(path.join(root, "site", "brand.json"), "utf8"));
const content = JSON.parse(readFileSync(path.join(root, "site", "content.json"), "utf8"));
const faq = JSON.parse(readFileSync(path.join(root, "site", "faq.json"), "utf8"));

const committed = buildSite();
const live = buildSite({ siteUrl: "https://example.org" });
const pages = [...committed.files.entries()].filter(([name]) => name.endsWith(".html"));
const indexablePages = pages.filter(([name]) => name !== "404.html");

const attr = (html: string, pattern: RegExp) => html.match(pattern)?.[1];
const metaName = (html: string, name: string) => attr(html, new RegExp(`<meta name="${name}" content="([^"]*)"`));
const metaProperty = (html: string, name: string) => attr(html, new RegExp(`<meta property="${name}" content="([^"]*)"`));
const unescape = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/g)].map((m) => JSON.parse(m[1] ?? ""));
}

function urlToFile(url: string): string | null {
  const clean = url.split("#")[0] ?? "";
  if (clean === "" || clean === "/") return "index.html";
  const relative = clean.replace(/^\//, "");
  return relative.endsWith("/") ? `${relative}index.html` : relative;
}

describe("generated site is up to date", () => {
  it("matches the committed files in website/ (run npm run build:site after editing site/)", () => {
    for (const [name, text] of committed.files) {
      const file = path.join(root, "website", name);
      expect(existsSync(file), `${name} is missing`).toBe(true);
      expect(readFileSync(file, "utf8") === text, `${name} is stale`).toBe(true);
    }
  });

  it("references assets that exist", () => {
    for (const asset of [brand.logo.path, brand.favicon, brand.socialImage.path, "/styles.css", "/app.js"]) {
      expect(existsSync(path.join(root, "website", asset)), asset).toBe(true);
    }
  });
});

describe("SEO metadata", () => {
  it("gives every page a unique title and meta description of a sensible length", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const [name, html] of pages) {
      const title = attr(html, /<title>([^<]+)<\/title>/);
      const description = metaName(html, "description");
      expect(title, name).toBeTruthy();
      expect(description, name).toBeTruthy();
      expect(unescape(title ?? "").length, `${name} title length`).toBeLessThanOrEqual(70);
      expect(unescape(description ?? "").length, `${name} description length`).toBeGreaterThanOrEqual(50);
      expect(unescape(description ?? "").length, `${name} description length`).toBeLessThanOrEqual(320);
      titles.add(title ?? "");
      descriptions.add(description ?? "");
    }
    expect(titles.size).toBe(pages.length);
    expect(descriptions.size).toBe(pages.length);
  });

  it("uses one h1 per page and never skips a heading level", () => {
    for (const [name, html] of pages) {
      const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      expect(levels[0], `${name} starts with h1`).toBe(1);
      expect(levels.filter((l) => l === 1), `${name} has one h1`).toHaveLength(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect((levels[i] ?? 0) - (levels[i - 1] ?? 0), `${name} heading jump at ${i}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("sets canonical, Open Graph and Twitter metadata on indexable pages", () => {
    for (const [name, html] of indexablePages) {
      const canonical = attr(html, /<link rel="canonical" href="([^"]+)">/);
      expect(canonical, name).toMatch(/^https:\/\//);
      expect(metaProperty(html, "og:url"), name).toBe(canonical);
      expect(metaProperty(html, "og:title"), name).toBeTruthy();
      expect(metaProperty(html, "og:description"), name).toBeTruthy();
      expect(metaProperty(html, "og:image"), name).toBe(`${committed.base}${brand.socialImage.path}`);
      expect(metaProperty(html, "og:image:alt"), name).toBeTruthy();
      expect(metaName(html, "twitter:card"), name).toBe("summary_large_image");
      expect(attr(html, /<html lang="([^"]+)">/), name).toBe(brand.language);
    }
  });

  it("gives every image an alt attribute", () => {
    for (const [name, html] of pages) {
      for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
        expect(img, name).toMatch(/\salt="[^"]*"/);
      }
    }
  });

  it("marks every page noindex while the domain is a placeholder, and indexable once it is set", () => {
    expect(committed.placeholder).toBe(isPlaceholderUrl(brand.siteUrl));
    if (committed.placeholder) {
      for (const [name, html] of pages) expect(metaName(html, "robots"), name).toBe("noindex, nofollow");
    }
    for (const [name, html] of live.files) {
      if (!name.endsWith(".html")) continue;
      expect(metaName(html, "robots"), name).toBe(name === "404.html" ? "noindex, nofollow" : "index, follow");
    }
  });

  it("has no broken internal links or anchors", () => {
    const ids = new Map(pages.map(([name, html]) => [name, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
    for (const [name, html] of pages) {
      const urls = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => unescape(m[1] ?? ""));
      for (const url of urls) {
        if (/^(https?:|mailto:)/.test(url)) continue;
        if (url.startsWith("#")) {
          expect(ids.get(name)?.has(url.slice(1)), `${name} -> ${url}`).toBe(true);
          continue;
        }
        const file = urlToFile(url);
        const exists = committed.files.has(file ?? "") || existsSync(path.join(root, "website", file ?? ""));
        expect(exists, `${name} -> ${url}`).toBe(true);
        const anchor = url.split("#")[1];
        if (anchor) expect(ids.get(file ?? "")?.has(anchor), `${name} -> ${url}`).toBe(true);
      }
    }
  });

  it("uses search-friendly URLs (lowercase, trailing slash folders, no query strings)", () => {
    for (const name of committed.files.keys()) {
      expect(name).toMatch(/^[a-z0-9/.-]+$/);
    }
  });
});

describe("sitemap.xml and robots.txt", () => {
  for (const [label, build] of [
    ["placeholder", committed],
    ["real domain", live],
  ] as const) {
    it(`produces a valid sitemap (${label})`, () => {
      const xml = build.files.get("sitemap.xml") ?? "";
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
      expect(xml.trim().endsWith("</urlset>")).toBe(true);
      const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>\s*<\/url>/g)];
      expect(urls.map((m) => m[1])).toEqual(["/", "/faq/", "/about/", "/privacy/"].map((p) => `${build.base}${p}`));
      expect(xml.match(/<url>/g)).toHaveLength(urls.length);
      expect(xml).not.toContain("404");
      for (const match of urls) expect(match[2]).toBe(brand.lastUpdated);
    });

    it(`references the sitemap from robots.txt (${label})`, () => {
      const robots = build.files.get("robots.txt") ?? "";
      expect(robots).toContain("User-agent: *");
      expect(robots).toContain("Allow: /");
      expect(robots).toContain(`Sitemap: ${build.base}/sitemap.xml`);
    });
  }

  it("matches each sitemap URL to a canonical URL on a real page", () => {
    const xml = live.files.get("sitemap.xml") ?? "";
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const file = urlToFile(new URL(loc ?? "").pathname) ?? "";
      expect(live.files.get(file)).toContain(`<link rel="canonical" href="${loc}">`);
    }
  });
});

describe("structured data", () => {
  const forbidden = /aggregateRating|"review"|"offers"|"price|"award|"ratingValue|"Review"|testimonial/i;
  const allowedTypes = new Set(["WebSite", "WebPage", "AboutPage", "FAQPage", "Question", "Answer", "Person"]);

  it("is valid JSON-LD with only relevant schema.org types and no ratings, reviews, prices or awards", () => {
    for (const [name, html] of indexablePages) {
      const blocks = jsonLd(html);
      expect(blocks, name).toHaveLength(1);
      const data = blocks[0] as { "@context": string; "@graph": Record<string, unknown>[] };
      expect(data["@context"]).toBe("https://schema.org");
      const text = JSON.stringify(data);
      expect(forbidden.test(text), name).toBe(false);
      for (const [, type] of text.matchAll(/"@type":"([^"]+)"/g)) expect(allowedTypes.has(type ?? ""), `${name}: ${type}`).toBe(true);
      const website = data["@graph"].find((node) => node["@type"] === "WebSite");
      expect(website?.name).toBe(brand.siteName);
    }
  });

  it("puts FAQPage markup only on the FAQ page, matching the visible questions exactly", () => {
    for (const [name, html] of indexablePages) {
      const hasFaq = JSON.stringify(jsonLd(html)).includes('"FAQPage"');
      expect(hasFaq, name).toBe(name === "faq/index.html");
    }
    const html = committed.files.get("faq/index.html") ?? "";
    const graph = (jsonLd(html)[0] as { "@graph": { "@type": string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[] })["@graph"];
    const questions = graph.find((node) => node["@type"] === "FAQPage")?.mainEntity ?? [];
    const visible = [...html.matchAll(/<h2 id="[^"]+-q">([^<]+)<\/h2>/g)].map((m) => unescape(m[1] ?? ""));
    expect(questions.map((q) => q.name)).toEqual(visible);
    expect(questions).toHaveLength(faq.items.length);
    for (const question of questions) expect(question.acceptedAnswer.text.length).toBeGreaterThan(20);
  });

  it("escapes '<' inside JSON-LD so data can never close the script tag", () => {
    for (const [, html] of pages) {
      for (const [, block] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        expect(block).not.toContain("<");
      }
    }
  });
});

describe("temporary branding and content accuracy", () => {
  it("uses the requested palette, headline and tagline", () => {
    expect(brand.colors).toMatchObject({ navy: "#14213D", teal: "#1B998B", ivory: "#F6F4EF", slate: "#667085", amber: "#F4B942" });
    expect(brand.headline).toBe("Your AI assistant for vibe coders");
    expect(brand.tagline).toBe("Build more. Automate more. Stay in control.");
    const home = committed.files.get("index.html") ?? "";
    expect(home).toContain(`<h1 id="hero-title">${escapeHtml(brand.headline)}</h1>`);
    expect(home).toContain(escapeHtml(brand.tagline));
    expect(committed.files.get("brand.css")).toContain(`--color-navy: ${brand.colors.navy};`);
  });

  it("meets WCAG AA contrast for every text colour pair the CSS uses", () => {
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };
    const c = brand.colors;
    const normalText: [string, string][] = [
      [c.navy, c.ivory],
      [c.navy, c.white],
      [c.slate, c.ivory],
      [c.slate, c.white],
      [c.tealInk, c.ivory],
      [c.tealInk, c.white],
      [c.ivory, c.navy],
      [c.navy, c.amber],
      [c.amber, c.navy],
      ["#C8CDD6", c.navy],
      ["#A3271F", "#FBEDEB"],
      ["#0E6F64", "#E5F3F0"],
    ];
    for (const [fg, bg] of normalText) expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    // Teal is used only for large text, borders and graphics, which need 3:1.
    expect(ratio(c.teal, c.ivory)).toBeGreaterThanOrEqual(3);
    expect(ratio(c.teal, c.navy)).toBeGreaterThanOrEqual(3);
  });

  it("keeps the public form options identical to the server's validation lists", () => {
    expect(content.waitlist.aiTools).toEqual(AI_TOOLS.map((t) => ({ id: t.id, label: t.label })));
    expect(content.waitlist.capabilities).toEqual(PLANNED_CAPABILITIES.map((c) => ({ id: c.id, label: c.label })));
    const home = committed.files.get("index.html") ?? "";
    for (const option of [...content.waitlist.aiTools, ...content.waitlist.capabilities]) {
      expect(home).toContain(`value="${option.id}"`);
    }
  });

  it("labels every capability with a status and never claims the product is available", () => {
    const allowed = new Set(Object.keys(content.statusLabels));
    for (const item of content.capabilities) expect(allowed.has(item.status), item.title).toBe(true);
    const home = committed.files.get("index.html") ?? "";
    expect(home.match(/class="chip chip-/g)?.length ?? 0).toBeGreaterThanOrEqual(content.capabilities.length);
    for (const [name, html] of pages) {
      expect(/available now|now available|download now|sign up now to start|trusted by|\d+\+? (users|customers|developers) use/i.test(html), name).toBe(false);
    }
    expect(home).toContain("Not available yet.");
  });

  it("states that the name is a working title", () => {
    expect(brand.nameIsTemporary).toBe(true);
    expect(committed.files.get("index.html")).toContain("is a working title");
  });
});

describe("template rendering", () => {
  it("escapes values and fails loudly on unknown placeholders", () => {
    expect(render("<p>{{ a }}</p>", { a: '<script>"x"</script>' })).toBe("<p>&lt;script&gt;&quot;x&quot;&lt;/script&gt;</p>");
    expect(render("{{{ a }}}", { a: "<b>ok</b>" })).toBe("<b>ok</b>");
    expect(() => render("{{ missing }}", {})).toThrow(/missing/);
  });

  it("does not re-scan inserted values for placeholders", () => {
    expect(render("{{ a }}", { a: "{{ b }}" })).toBe("{{ b }}");
  });

  it("treats placeholder and invalid domains as non-indexable", () => {
    expect(isPlaceholderUrl("https://your-domain.example")).toBe(true);
    expect(isPlaceholderUrl("https://site.example")).toBe(true);
    expect(isPlaceholderUrl("not a url")).toBe(true);
    expect(isPlaceholderUrl("https://example.org")).toBe(false);
  });
});
