// Tests for the static site generator and the SEO, AEO and GEO foundations it produces.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { authBlocks, buildSite, clerkFrontendApi, escapeHtml, isPlaceholderUrl, loadPosts, render, verificationTags } from "./build-site.mjs";
import { AI_TOOLS, PLANNED_CAPABILITIES } from "../waitlist/validation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brand = JSON.parse(readFileSync(path.join(root, "site", "brand.json"), "utf8"));
const content = JSON.parse(readFileSync(path.join(root, "site", "content.json"), "utf8"));
const faq = JSON.parse(readFileSync(path.join(root, "site", "faq.json"), "utf8"));

const committed = buildSite();
const live = buildSite({ siteUrl: "https://example.org" });
const pages = [...committed.files.entries()].filter(([name]) => name.endsWith(".html"));
// Signed-in pages and the 404 page are noindex and carry no canonical or structured data.
const NOINDEX = new Set(["404.html", "account/index.html", "members/index.html", "studio/index.html"]);
const indexablePages = pages.filter(([name]) => !NOINDEX.has(name));
const posts = loadPosts();

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
      expect(metaName(html, "robots"), name).toBe(NOINDEX.has(name) ? "noindex, nofollow" : "index, follow");
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
      const expected = [
        ...["/", "/faq/", "/about/", "/privacy/", "/blog/"].map((p) => `${build.base}${p}`),
        ...posts.map((p) => `${build.base}/blog/${p.slug}/`),
      ];
      expect(urls.map((m) => m[1])).toEqual(expected);
      expect(xml.match(/<url>/g)).toHaveLength(urls.length);
      expect(xml).not.toContain("404");
      expect(xml).not.toMatch(/account|members|studio/);
      for (const match of urls) {
        const post = posts.find((p) => match[1] === `${build.base}/blog/${p.slug}/`);
        const isBlogIndex = match[1] === `${build.base}/blog/`;
        const blogLastmod = posts[0] && posts[0].updated > brand.lastUpdated ? posts[0].updated : brand.lastUpdated;
        expect(match[2], match[1]).toBe(post ? post.updated : isBlogIndex ? blogLastmod : brand.lastUpdated);
      }
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
  const allowedTypes = new Set(["WebSite", "WebPage", "AboutPage", "FAQPage", "Question", "Answer", "Person", "Blog", "BlogPosting", "Organization"]);

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

describe("branding and content accuracy", () => {
  it("uses the requested palette, headline and tagline", () => {
    expect(brand.colors).toMatchObject({ navy: "#14213D", teal: "#1B998B", ivory: "#F6F4EF", slate: "#667085", amber: "#F4B942" });
    expect(brand.headline).toBe("Your AI assistant for vibe coders");
    expect(brand.tagline).toBe("Just vibeheal it.");
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

  it("registers the waitlist form with Netlify Forms and posts every field the script sends", () => {
    const home = committed.files.get("index.html") ?? "";
    const formTag = home.match(/<form\b[^>]*id="waitlist-form"[^>]*>/)?.[0] ?? "";
    expect(formTag).toContain('name="waitlist"');
    expect(formTag).toContain('method="POST"');
    expect(formTag).toContain('data-netlify="true"');
    expect(formTag).toContain('netlify-honeypot="company"');
    expect(home).toContain('<input type="hidden" name="form-name" value="waitlist">');
    // Netlify only stores fields that exist in the deployed form, so each name app.js sends must be in it.
    const appJs = readFileSync(path.join(root, "website", "app.js"), "utf8");
    const sent = [...appJs.matchAll(/params\.append\("([^"]+)"/g)].map((m) => m[1]);
    expect(sent.length).toBeGreaterThan(0);
    for (const field of sent) expect(home, field).toContain(`name="${field}"`);
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

  it("puts the product name in every indexable page title", () => {
    for (const [name, html] of pages) {
      if (name === "404.html") continue;
      expect(html.match(/<title>([^<]+)<\/title>/)?.[1], name).toContain(brand.siteName);
    }
  });

  it("adds search-engine verification tags only when a valid token is set, and only on the home page", () => {
    expect(verificationTags({})).toBe("");
    expect(verificationTags({ verification: { google: "", bing: " " } })).toBe("");
    expect(verificationTags({ verification: { google: "abc_DEF-1234567890", bing: "0123456789ABCDEF" } })).toBe(
      '<meta name="google-site-verification" content="abc_DEF-1234567890">\n  <meta name="msvalidate.01" content="0123456789ABCDEF">',
    );
    expect(() => verificationTags({ verification: { google: '<meta name="google-site-verification" content="x">' } })).toThrow();
    for (const [name, html] of pages) {
      if (name !== "index.html") expect(html, name).not.toMatch(/google-site-verification|msvalidate\.01/);
    }
  });

  it("redirects the free Netlify addresses to the canonical domain", () => {
    const toml = readFileSync(path.join(root, "netlify.toml"), "utf8");
    expect(brand.siteUrl).toBe("https://vibeheal.online");
    for (const host of ["vibehealai.netlify.app", "brixoai.netlify.app"]) {
      expect(toml).toMatch(new RegExp(`from = "https://${host.replace(/\./g, "\\.")}/\\*"\\s+to = "${brand.siteUrl.replace(/\./g, "\\.")}/:splat"\\s+status = 301\\s+force = true`));
    }
  });

  it("derives Clerk's Frontend API host from the publishable key and rejects anything else", () => {
    expect(clerkFrontendApi("")).toBeNull();
    expect(clerkFrontendApi("pk_live_Y2xlcmsudmliZWhlYWwub25saW5lJA")).toBe("clerk.vibeheal.online");
    expect(clerkFrontendApi(`pk_test_${Buffer.from("happy-cat-1.clerk.accounts.dev$").toString("base64")}`)).toBe("happy-cat-1.clerk.accounts.dev");
    expect(() => clerkFrontendApi("sk_live_abc")).toThrow();
    expect(() => clerkFrontendApi(`pk_test_${Buffer.from("evil.com/x$").toString("base64")}`)).toThrow();
    expect(authBlocks({})).toEqual({ controls: "", scripts: "" });
  });

  it("loads Clerk on every page, from the host the CSP in netlify.toml allows", () => {
    const host = clerkFrontendApi(brand.auth?.clerkPublishableKey ?? "");
    if (!host) return;
    for (const [name, html] of pages) {
      expect(html, name).toContain('id="auth-controls"');
      expect(html, name).toContain(`src="https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"`);
      expect(html, name).toContain(`src="https://${host}/npm/@clerk/ui@1/dist/ui.browser.js"`);
      expect(html, name).toContain('<script defer src="/auth.js"></script>');
    }
    const csp = readFileSync(path.join(root, "netlify.toml"), "utf8").match(/Content-Security-Policy = "([^"]+)"/)?.[1] ?? "";
    const directive = (name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? "";
    expect(directive("script-src")).toContain(`https://${host}`);
    expect(directive("connect-src")).toContain(`https://${host}`);
    expect(directive("frame-src")).toContain("https://challenges.cloudflare.com");
    expect(directive("img-src")).toContain("https://img.clerk.com");
    expect(directive("script-src")).not.toContain("'unsafe-inline'");
    expect(directive("script-src")).not.toContain("'unsafe-eval'");
  });

  it("publishes every non-draft post with BlogPosting data, and lists it on the blog, RSS feed and studio", () => {
    expect(posts.length).toBeGreaterThan(0);
    const index = committed.files.get("blog/index.html") ?? "";
    const feed = committed.files.get("blog/feed.xml") ?? "";
    const studio = committed.files.get("studio/index.html") ?? "";
    expect(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"')).toBe(true);
    expect(feed).toContain(`<atom:link href="${committed.base}/blog/feed.xml" rel="self" type="application/rss+xml"/>`);
    for (const post of posts) {
      const html = committed.files.get(`blog/${post.slug}/index.html`) ?? "";
      expect(html, post.slug).toContain(`<h1 id="post-title">${escapeHtml(post.title)}</h1>`);
      expect(metaProperty(html, "og:type")).toBe("article");
      const graph = (jsonLd(html)[0] as { "@graph": Record<string, unknown>[] })["@graph"];
      const article = graph.find((n) => n["@type"] === "BlogPosting");
      expect(article).toMatchObject({ headline: post.title, datePublished: post.date, dateModified: post.updated });
      expect(index).toContain(`href="/blog/${post.slug}/"`);
      expect(feed).toContain(`<link>${committed.base}/blog/${post.slug}/</link>`);
      expect(studio).toContain(`${brand.repository}/edit/main/site/blog/${post.file}`);
    }
    for (const [, html] of pages) expect(html).toContain('<link rel="alternate" type="application/rss+xml"');
  });

  it("never publishes drafts", () => {
    const dir = path.join(root, "site", "blog");
    const drafts = readdirSync(dir).filter((f) => /^draft:\s*true\s*$/m.test(readFileSync(path.join(dir, f), "utf8")));
    for (const file of drafts) {
      const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
      expect(committed.files.has(`blog/${slug}/index.html`), file).toBe(false);
    }
  });

  it("keeps signed-in pages out of search and gates the studio on the admin role", () => {
    for (const file of ["account/index.html", "members/index.html", "studio/index.html"]) {
      const html = committed.files.get(file) ?? "";
      expect(metaName(html, "robots"), file).toBe("noindex, nofollow");
      expect(html, file).not.toContain('rel="canonical"');
      expect(html, file).toMatch(/data-auth-page="(account|members|studio)"/);
    }
    const studio = committed.files.get("studio/index.html") ?? "";
    expect(studio).toMatch(/data-auth-content data-requires-role="admin" hidden/);
    expect(studio).toContain('<script src="/studio.js" defer></script>');
    expect(committed.files.get("members/index.html")).toMatch(/data-auth-content hidden/);
  });

  it("uses the final product name, not a working title", () => {
    expect(brand.nameIsTemporary).toBe(false);
    for (const [name, html] of pages) {
      expect(html, name).not.toContain("is a working title");
      expect(html, name).toContain(brand.siteName);
    }
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
