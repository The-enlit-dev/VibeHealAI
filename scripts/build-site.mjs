#!/usr/bin/env node
// Static site generator for the public marketing website (no dependencies).
//
// Sources (edit these):
//   site/brand.json    temporary identity: name, headline, tagline, colours, logo, social image, URL
//   site/content.json  capabilities, steps, principles, status text, waitlist options
//   site/faq.json      FAQ (used by the FAQ page, the home page and FAQPage structured data)
//   site/layout.html   shared <head>, header and footer
//   site/pages/*.html  page bodies
//
// Output (generated, committed, published by Netlify as-is): website/
//   index.html, faq/index.html, about/index.html, privacy/index.html, 404.html,
//   brand.css, sitemap.xml, robots.txt, llms.txt
//
// Usage:
//   node scripts/build-site.mjs           write the generated files
//   node scripts/build-site.mjs --check   fail if the committed files are out of date
//   SITE_URL=https://example.org node scripts/build-site.mjs   override the canonical URL
//
// Template syntax: {{ path.to.value }} is HTML-escaped; {{{ path }}} inserts trusted, generated HTML.
// An unknown path is an error, so typos fail the build instead of shipping blank text.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PLACEHOLDER_HOST = "your-domain.example";

const readJson = (root, file) => JSON.parse(readFileSync(path.join(root, "site", file), "utf8"));
const readText = (root, file) => readFileSync(path.join(root, "site", file), "utf8");

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

/** Escape, then turn `code` spans into <code>. */
function inline(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Plain text for structured data: drop the backticks. */
function plain(text) {
  return String(text).replace(/`([^`]+)`/g, "$1");
}

function lookup(context, key) {
  let value = context;
  for (const part of key.split(".")) {
    if (value === null || typeof value !== "object" || !(part in value)) {
      throw new Error(`Template value not found: ${key}`);
    }
    value = value[part];
  }
  if (value === null || value === undefined || typeof value === "object") {
    throw new Error(`Template value is not text: ${key}`);
  }
  return String(value);
}

// Single pass, so inserted values are never re-scanned for placeholders.
export function render(template, context) {
  return template.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}/g, (_, rawKey, escapedKey) =>
    rawKey ? lookup(context, rawKey) : escapeHtml(lookup(context, escapedKey)),
  );
}

/** JSON-LD inside <script>: escape "<" so the data can never close the tag. */
function jsonLdScript(data) {
  const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

export function isPlaceholderUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === PLACEHOLDER_HOST || host.endsWith(".example") || host === "localhost";
  } catch {
    return true;
  }
}

function normaliseSiteUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error(`siteUrl must use https: ${raw}`);
  }
  return url.origin;
}

// ---------- HTML blocks generated from content ----------

function statusChip(status, labels) {
  const label = labels[status];
  if (!label) throw new Error(`Unknown status: ${status}`);
  return `<span class="chip chip-${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function capabilitiesBlock(content) {
  return content.capabilities
    .map(
      (item) => `        <li class="capability">
          <div class="capability-head">
            <h3>${escapeHtml(item.title)}</h3>
            ${statusChip(item.status, content.statusLabels)}
          </div>
          <p>${escapeHtml(item.body)}</p>
        </li>`,
    )
    .join("\n");
}

function stepsBlock(content) {
  return content.steps
    .map(
      (step, index) => `        <li class="step">
          <span class="step-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
          <h3>${escapeHtml(step.title)}</h3>
          <p>${escapeHtml(step.body)}</p>
        </li>`,
    )
    .join("\n");
}

function principlesBlock(content) {
  return content.principles
    .map(
      (item) => `        <li class="principle">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </li>`,
    )
    .join("\n");
}

function linksBlock(links) {
  if (!links || links.length === 0) return "";
  const items = links
    .map((link) => `<li><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></li>`)
    .join("");
  const external = links.some((link) => /^https?:/.test(link.url));
  return `<div class="faq-links"><p class="faq-links-title">${external ? "Further reading" : "Related"}</p><ul>${items}</ul></div>`;
}

function faqFullBlock(faq) {
  return faq.items
    .map(
      (item) => `      <section class="faq-item" id="${escapeHtml(item.id)}" aria-labelledby="${escapeHtml(item.id)}-q">
        <h2 id="${escapeHtml(item.id)}-q">${escapeHtml(item.question)}</h2>
        <p class="faq-short">${inline(item.short)}</p>
${item.details.map((p) => `        <p>${inline(p)}</p>`).join("\n")}
        ${linksBlock(item.links)}
      </section>`,
    )
    .join("\n");
}

function faqHomeBlock(faq) {
  return faq.items
    .filter((item) => item.home)
    .map(
      (item) => `        <details class="faq-preview">
          <summary><h3>${escapeHtml(item.question)}</h3></summary>
          <p class="faq-short">${inline(item.short)}</p>
${item.details.map((p) => `          <p>${inline(p)}</p>`).join("\n")}
          <p><a href="/faq/#${escapeHtml(item.id)}">Read this answer on the FAQ page</a></p>
        </details>`,
    )
    .join("\n");
}

function optionsBlock(options) {
  return options.map((o) => `                <option value="${escapeHtml(o.id)}">${escapeHtml(o.label)}</option>`).join("\n");
}

function checkboxesBlock(options) {
  return options
    .map(
      (o) =>
        `              <label><input type="checkbox" name="capabilities" value="${escapeHtml(o.id)}"> ${escapeHtml(o.label)}</label>`,
    )
    .join("\n");
}

// ---------- structured data ----------

// Clerk sign-in (DEC-31). The publishable key encodes the Frontend API host: pk_<env>_<base64("host$")>.
export function clerkFrontendApi(publishableKey) {
  if (!publishableKey) return null;
  const match = /^pk_(test|live)_([A-Za-z0-9+/=]+)$/.exec(publishableKey);
  if (!match) throw new Error("brand.auth.clerkPublishableKey must be a Clerk publishable key (pk_test_... or pk_live_...)");
  const decoded = Buffer.from(match[2], "base64").toString("utf8");
  const host = decoded.endsWith("$") ? decoded.slice(0, -1) : "";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) throw new Error("brand.auth.clerkPublishableKey does not contain a valid Frontend API host");
  return host;
}

export function authBlocks(brand) {
  const key = brand.auth?.clerkPublishableKey ?? "";
  const host = clerkFrontendApi(key);
  if (!host) return { controls: "", scripts: "" };
  return {
    controls: '<div id="auth-controls" class="auth-controls" aria-label="Account" role="group" hidden></div>',
    scripts: [
      `<script defer crossorigin="anonymous" src="https://${host}/npm/@clerk/ui@1/dist/ui.browser.js"></script>`,
      `<script defer crossorigin="anonymous" data-clerk-publishable-key="${escapeHtml(key)}" src="https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"></script>`,
      '<script defer src="/auth.js"></script>',
    ].join("\n  "),
  };
}

// Search-engine ownership tokens from brand.verification. Only the home page carries them.
const VERIFICATION_META = { google: "google-site-verification", bing: "msvalidate.01" };

export function verificationTags(brand) {
  const tokens = brand.verification ?? {};
  return Object.entries(VERIFICATION_META)
    .filter(([key]) => typeof tokens[key] === "string" && tokens[key].trim() !== "")
    .map(([key, name]) => {
      const token = tokens[key].trim();
      if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) {
        throw new Error(`brand.verification.${key} must be only the token (letters, digits, - and _), not a whole tag`);
      }
      return `<meta name="${name}" content="${token}">`;
    })
    .join("\n  ");
}

function websiteNode(brand, base) {
  return {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: `${base}/`,
    name: brand.siteName,
    description: brand.description,
    inLanguage: brand.language,
  };
}

function pageNode(brand, base, page) {
  const node = {
    "@type": page.schemaType,
    "@id": `${page.canonical}#webpage`,
    url: page.canonical,
    name: page.title,
    description: page.description,
    inLanguage: brand.language,
    isPartOf: { "@id": `${base}/#website` },
    dateModified: brand.lastUpdated,
  };
  if (brand.author.name) {
    node.author = { "@type": "Person", name: brand.author.name, ...(brand.author.url ? { url: brand.author.url } : {}) };
  }
  return node;
}

function faqPageNode(faq, page) {
  return {
    "@type": "FAQPage",
    "@id": `${page.canonical}#faq`,
    url: page.canonical,
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: [item.short, ...item.details].map(plain).join(" "),
      },
    })),
  };
}

// ---------- pages ----------

const PAGES = [
  {
    key: "home",
    path: "/",
    file: "index.html",
    body: "pages/home.html",
    title: (b) => `${b.siteName}: ${b.headline}`,
    description: (b) => b.description,
    schemaType: "WebPage",
    indexable: true,
    script: true,
  },
  {
    key: "faq",
    path: "/faq/",
    file: "faq/index.html",
    body: "pages/faq.html",
    title: (b) => `Questions vibe coders ask | ${b.siteName}`,
    description: (b) =>
      `Answers for vibe coders about ${b.siteName}: what this AI assistant is designed to do, what is available today, how automations and integrations are planned to work, and what to do when an AI tool breaks your project.`,
    schemaType: "WebPage",
    faqPage: true,
    indexable: true,
  },
  {
    key: "about",
    path: "/about/",
    file: "about/index.html",
    body: "pages/about.html",
    title: (b) => `About ${b.siteName}: an AI assistant for vibe coders`,
    description: (b) =>
      `About ${b.siteName}, an early-stage AI assistant for vibe coders: its principles, what exists today, what is planned and how it is being built.`,
    schemaType: "AboutPage",
    indexable: true,
  },
  {
    key: "privacy",
    path: "/privacy/",
    file: "privacy/index.html",
    body: "pages/privacy.html",
    title: (b) => `Waitlist privacy notice | ${b.siteName}`,
    description: () =>
      "What the early-access waitlist collects, why it is collected, where it is stored and how to ask for your email to be removed.",
    schemaType: "WebPage",
    indexable: true,
  },
  {
    key: "notFound",
    path: "/404.html",
    file: "404.html",
    body: "pages/404.html",
    title: (b) => `Page not found | ${b.siteName}`,
    description: () => "This page does not exist. Go to the home page or the FAQ to find what you were looking for.",
    schemaType: "WebPage",
    indexable: false,
  },
];

export function buildSite({ root = defaultRoot, siteUrl } = {}) {
  const brand = readJson(root, "brand.json");
  const content = readJson(root, "content.json");
  const faq = readJson(root, "faq.json");
  const layout = readText(root, "layout.html");

  const base = normaliseSiteUrl(siteUrl ?? brand.siteUrl);
  const placeholder = isPlaceholderUrl(base);
  const files = new Map();

  const auth = authBlocks(brand);
  const blocks = {
    authControls: auth.controls,
    capabilities: capabilitiesBlock(content),
    steps: stepsBlock(content),
    principles: principlesBlock(content),
    faqHome: faqHomeBlock(faq),
    faqFull: faqFullBlock(faq),
    faqToc: faq.items
      .map((item) => `          <li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.question)}</a></li>`)
      .join("\n"),
    aiToolOptions: optionsBlock(content.waitlist.aiTools),
    capabilityCheckboxes: checkboxesBlock(content.waitlist.capabilities),
    temporaryNameNote: brand.nameIsTemporary
      ? `<p class="footer-note">"${escapeHtml(brand.siteName)}" is a working title. The permanent name has not been decided.</p>`
      : "",
    authorLine: brand.author.name
      ? `<p>Built by ${
          brand.author.url
            ? `<a href="${escapeHtml(brand.author.url)}">${escapeHtml(brand.author.name)}</a>`
            : escapeHtml(brand.author.name)
        }.</p>`
      : "<p>It is an independent project in early development.</p>",
    contactLine: brand.contactEmail
      ? `<p>To ask for your email to be removed, write to <a href="mailto:${escapeHtml(brand.contactEmail)}">${escapeHtml(brand.contactEmail)}</a>, or reply to any email we send you.</p>`
      : "<p>To ask for your email to be removed, reply to any email we send you. A direct contact address will be published here before the waitlist opens to the public.</p>",
  };

  for (const page of PAGES) {
    const canonical = page.path === "/404.html" ? `${base}/404.html` : `${base}${page.path}`;
    const title = page.title(brand);
    const description = page.description(brand);
    const pageInfo = { canonical, title, description, schemaType: page.schemaType };

    const graph = [websiteNode(brand, base), pageNode(brand, base, pageInfo)];
    if (page.faqPage) graph.push(faqPageNode(faq, pageInfo));

    const robots = !page.indexable || placeholder ? "noindex, nofollow" : "index, follow";
    const context = {
      brand,
      content,
      blocks,
      page: {
        title,
        description,
        canonical,
        robots,
        ogUrl: canonical,
        ogImage: `${base}${brand.socialImage.path}`,
        key: page.key,
        canonicalTag: page.indexable ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : "",
        jsonLd: page.indexable ? jsonLdScript({ "@context": "https://schema.org", "@graph": graph }) : "",
        script: page.script ? '<script src="/app.js" defer></script>' : "",
        verificationTags: page.key === "home" ? verificationTags(brand) : "",
        authScripts: auth.scripts,
        socialImageWidth: String(brand.socialImage.width),
        socialImageHeight: String(brand.socialImage.height),
      },
    };
    const body = render(readText(root, page.body), context);
    files.set(page.file, render(layout, { ...context, page: { ...context.page, body } }));
  }

  // Colour tokens: the only place brand colours enter the CSS.
  const c = brand.colors;
  files.set(
    "brand.css",
    `/* Generated from site/brand.json by scripts/build-site.mjs. Do not edit by hand. */
:root {
  --color-obsidian: ${c.obsidian};
  --color-graphite: ${c.graphite};
  --color-elevated: ${c.elevated};
  --color-sidebar: ${c.sidebar};
  --color-input: ${c.input};
  --color-primary: ${c.primary};
  --color-ice: ${c.ice};
  --color-text-primary: ${c.textPrimary};
  --color-text-secondary: ${c.textSecondary};
  --color-text-muted: ${c.textMuted};
  --color-border: ${c.border};
  --color-warm-neutral: ${c.warmNeutral};
}
`,
  );

  const indexable = PAGES.filter((p) => p.indexable);
  files.set(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map((p) => `  <url>\n    <loc>${escapeXml(`${base}${p.path}`)}</loc>\n    <lastmod>${escapeXml(brand.lastUpdated)}</lastmod>\n  </url>`)
  .join("\n")}
</urlset>
`,
  );

  files.set(
    "robots.txt",
    `# Generated by scripts/build-site.mjs.\nUser-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`,
  );

  files.set(
    "llms.txt",
    `# ${brand.siteName}

> ${brand.description}

Status: early development, not available to use. ${content.status.working}

## Key pages
- [Home](${base}/): what the project is designed to do, with an honest status for each capability
- [FAQ](${base}/faq/): answers to common questions from vibe coders
- [About](${base}/about/): principles, current status and how the project is built
- [Waitlist privacy notice](${base}/privacy/): what the waitlist collects and why

## Planned capabilities
${content.capabilities.map((item) => `- ${item.title} (${content.statusLabels[item.status]}): ${item.body}`).join("\n")}
`,
  );

  return { files, placeholder, base };
}

function main() {
  const check = process.argv.includes("--check");
  const { files, placeholder, base } = buildSite({ siteUrl: process.env.SITE_URL });
  const outDir = path.join(defaultRoot, "website");
  const stale = [];

  for (const [relative, text] of files) {
    const target = path.join(outDir, relative);
    if (check) {
      if (!existsSync(target) || readFileSync(target, "utf8") !== text) stale.push(relative);
      continue;
    }
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  }

  if (check) {
    if (stale.length > 0) {
      console.error(`Generated site files are out of date: ${stale.join(", ")}. Run npm run build:site.`);
      process.exit(1);
    }
    console.log(`Generated site files are up to date (${files.size} files).`);
    return;
  }

  console.log(`Wrote ${files.size} files to website/ for ${base}`);
  if (placeholder) {
    console.warn(
      `WARNING: siteUrl is a placeholder (${base}). Every page is marked noindex until the real domain is set in site/brand.json.`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
