#!/usr/bin/env node
// Static site generator for the public marketing website (no dependencies).
//
// Sources (edit these):
//   site/brand.json    temporary identity: name, headline, tagline, colours, logo, social image, URL
//   site/content.json  capabilities, steps, principles, status text, waitlist options
//   site/faq.json      FAQ (used by the FAQ page, the home page and FAQPage structured data)
//   site/layout.html   shared <head>, header and footer
//   site/pages/*.html  page bodies
//   site/blog/*.md     blog posts (front matter + a safe Markdown subset; see scripts/markdown.mjs)
//
// Output (generated, committed, published by Netlify as-is): website/
//   index.html, faq/, about/, privacy/, blog/ (index, one folder per post, feed.xml),
//   account/, members/, studio/ (signed-in pages, noindex), 404.html,
//   brand.css, sitemap.xml, robots.txt, llms.txt
//
// Usage:
//   node scripts/build-site.mjs           write the generated files
//   node scripts/build-site.mjs --check   fail if the committed files are out of date
//   SITE_URL=https://example.org node scripts/build-site.mjs   override the canonical URL
//
// Template syntax: {{ path.to.value }} is HTML-escaped; {{{ path }}} inserts trusted, generated HTML.
// An unknown path is an error, so typos fail the build instead of shipping blank text.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePost } from "./markdown.mjs";

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

const FLOW_VISUALS = [
  `<div class="flow-visual flow-visual-connect" aria-hidden="true"><span class="flow-node">Project folder</span><span class="flow-link"></span><span class="flow-node">GitHub <em>read only</em></span><span class="flow-link"></span><span class="flow-node">Other tools <em>read only</em></span></div>`,
  `<div class="flow-visual flow-visual-understand" aria-hidden="true"><span class="flow-line"><b>Setup</b><i></i></span><span class="flow-line"><b>Recent changes</b><i></i></span><span class="flow-line"><b>Errors, in plain language</b><i></i></span></div>`,
  `<div class="flow-visual flow-visual-control" aria-hidden="true"><span class="flow-action">Review change</span><span class="flow-action">Keep backup</span><span class="flow-action flow-action-primary">Undo</span></div>`,
];

/** Three-step workflow (content.steps), each with an illustration. */
function workflowBlock(content) {
  return content.steps
    .map(
      (step, i) => `          <li class="flow-step" data-step="${i}">
            <span class="flow-num" aria-hidden="true">0${i + 1}</span>
            <div class="flow-text">
              <h3>${escapeHtml(step.title)}</h3>
              <p>${escapeHtml(step.body)}</p>
            </div>
            ${FLOW_VISUALS[i] ?? ""}
          </li>`,
    )
    .join("\n");
}

/** Feature tiles (content.capabilities) with their real status. */
function featureTilesBlock(content) {
  return content.capabilities
    .map(
      (c, i) => `          <li class="feature-tile feature-tile-${i}" data-status="${escapeHtml(c.status)}">
            <div class="feature-head">
              <h3>${escapeHtml(c.title)}</h3>
              <span class="chip chip-${escapeHtml(c.status)}">${escapeHtml(content.statusLabels[c.status])}</span>
            </div>
            <p>${escapeHtml(c.body)}</p>
            <div class="feature-visual" aria-hidden="true"><span></span><span></span><span></span></div>
          </li>`,
    )
    .join("\n");
}

/** Sample provider cards for the interactive demo. Sample data, not connected to anything. */
function demoCardsBlock(content) {
  const labels = { available: "Available", coming_soon: "Coming soon" };
  return content.demo.providers
    .map((p) => {
      const initials = p.name.slice(0, 2).toUpperCase();
      const category = content.demo.categoryLabels[p.category];
      return `              <li><button type="button" class="demo-card" aria-pressed="false" data-name="${escapeHtml(p.name)}" data-category="${escapeHtml(category)}" data-summary="${escapeHtml(p.summary)}" data-status="${escapeHtml(p.status)}" data-status-label="${escapeHtml(labels[p.status])}" data-permissions="${escapeHtml((p.permissions ?? []).join("|"))}">
                <span class="monogram monogram-sm" aria-hidden="true">${escapeHtml(initials)}</span>
                <span class="demo-card-text"><span class="demo-card-name">${escapeHtml(p.name)}</span><span class="demo-card-cat">${escapeHtml(category)}</span></span>
                <span class="badge badge-${escapeHtml(p.status)}">${escapeHtml(labels[p.status])}</span>
              </button></li>`;
    })
    .join("\n");
}

/** Hero headline split into words for a staggered entrance; the full text stays readable for screen readers. */
function headlineWordsBlock(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const spans = words.map((w) => `<span class="word">${escapeHtml(w)}</span>`).join(" ");
  return `<span class="sr-only">${escapeHtml(text)}</span><span class="headline-words" aria-hidden="true">${spans}</span>`;
}

/** Sample activity rows for the demo. */
function demoActivityBlock(content) {
  return content.demo.activity
    .map(
      (a) => `              <tr><td>${escapeHtml(a.event)}</td><td>${escapeHtml(a.result)}</td></tr>`,
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

// ---------- blog ----------

/** Published posts, newest first. Drafts are skipped; any invalid post fails the build. */
export function loadPosts(root = defaultRoot) {
  const dir = path.join(root, "site", "blog");
  if (!existsSync(dir)) return [];
  const posts = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => parsePost(name, readFileSync(path.join(dir, name), "utf8")));
  const slugs = new Set();
  for (const post of posts) {
    if (slugs.has(post.slug)) throw new Error(`Two blog posts use the slug "${post.slug}"`);
    slugs.add(post.slug);
  }
  return posts.filter((p) => !p.draft).sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
}

export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d} ${months[m - 1]} ${y}`;
}

function postCard(post, headingLevel) {
  return `        <article class="post-card">
          <h${headingLevel}><a href="/blog/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a></h${headingLevel}>
          <p class="meta"><time datetime="${post.date}">${formatDate(post.date)}</time></p>
          <p>${escapeHtml(post.description)}</p>
        </article>`;
}

function blogListBlock(posts) {
  if (posts.length === 0) return '        <p class="empty-state">No posts yet.</p>';
  return `        <div class="post-list">\n${posts.map((p) => postCard(p, 2)).join("\n")}\n        </div>`;
}

function blogLatestBlock(posts) {
  if (posts.length === 0) return "          <p>No updates yet.</p>";
  return `          <ul>\n${posts
    .slice(0, 5)
    .map((p) => `            <li><a href="/blog/${escapeHtml(p.slug)}/">${escapeHtml(p.title)}</a> (<time datetime="${p.date}">${formatDate(p.date)}</time>)</li>`)
    .join("\n")}\n          </ul>`;
}

function studioPostsBlock(posts, brand) {
  if (posts.length === 0) return '          <p class="empty-state">No published posts yet.</p>';
  return `          <ul class="studio-posts">\n${posts
    .map(
      (p) =>
        `            <li><a href="/blog/${escapeHtml(p.slug)}/">${escapeHtml(p.title)}</a> <span class="meta">${formatDate(p.date)}</span> · <a href="${escapeHtml(brand.repository)}/edit/main/site/blog/${escapeHtml(p.file)}" rel="noopener">Edit on GitHub</a></li>`,
    )
    .join("\n")}\n          </ul>`;
}

function rssFeed(brand, base, posts) {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(`${base}/blog/${p.slug}/`)}</link>
      <guid isPermaLink="true">${escapeXml(`${base}/blog/${p.slug}/`)}</guid>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
${p.tags.map((t) => `      <category>${escapeXml(t)}</category>`).join("\n")}
    </item>`.replace(/\n\n/g, "\n"),
    )
    .join("\n");
  const latest = posts[0] ? new Date(`${posts[0].updated}T00:00:00Z`).toUTCString() : new Date(`${brand.lastUpdated}T00:00:00Z`).toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${brand.siteName} blog`)}</title>
    <link>${escapeXml(`${base}/blog/`)}</link>
    <description>${escapeXml(`News and notes from ${brand.siteName}.`)}</description>
    <language>${escapeXml(brand.language)}</language>
    <lastBuildDate>${latest}</lastBuildDate>
    <atom:link href="${escapeXml(`${base}/blog/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
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
    script: "/app.js",
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
    key: "blog",
    path: "/blog/",
    file: "blog/index.html",
    body: "pages/blog.html",
    title: (b) => `Blog | ${b.siteName}`,
    description: (b) =>
      `News and notes from ${b.siteName}: progress updates on the AI assistant for vibe coders, and practical advice for building with AI tools.`,
    schemaType: "Blog",
    indexable: true,
  },
  {
    key: "account",
    path: "/account/",
    file: "account/index.html",
    body: "pages/account.html",
    title: (b) => `Your account | ${b.siteName}`,
    description: () => "Manage your sign-in details, email address, password and connected accounts.",
    schemaType: "WebPage",
    indexable: false,
  },
  {
    key: "members",
    path: "/members/",
    file: "members/index.html",
    body: "pages/members.html",
    title: (b) => `Members area | ${b.siteName}`,
    description: () => "Early-access updates for signed-in members, and your waitlist status.",
    schemaType: "WebPage",
    indexable: false,
  },
  {
    key: "studio",
    path: "/studio/",
    file: "studio/index.html",
    body: "pages/studio.html",
    title: (b) => `Content studio | ${b.siteName}`,
    description: () => "Write and manage blog posts. Only accounts with the admin role can use this page.",
    schemaType: "WebPage",
    indexable: false,
    script: "/studio.js",
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
  const posts = loadPosts(root);
  const blocks = {
    blogList: blogListBlock(posts),
    blogLatest: blogLatestBlock(posts),
    studioPosts: studioPostsBlock(posts, brand),
    authControls: auth.controls,
    capabilities: capabilitiesBlock(content),
    workflow: workflowBlock(content),
    featureTiles: featureTilesBlock(content),
    demoCards: demoCardsBlock(content),
    demoActivity: demoActivityBlock(content),
    heroHeadline: headlineWordsBlock(content.hero.headline),
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

  const renderPage = ({ key, pagePath, file, bodyTemplate, title, description, schemaType, indexable, script, ogType = "website", graphExtra = [], pageNodeExtra = {}, extra = {} }) => {
    const canonical = pagePath === "/404.html" ? `${base}/404.html` : `${base}${pagePath}`;
    const pageInfo = { canonical, title, description, schemaType };
    const graph = [websiteNode(brand, base), { ...pageNode(brand, base, pageInfo), ...pageNodeExtra }, ...graphExtra];
    const robots = !indexable || placeholder ? "noindex, nofollow" : "index, follow";
    const context = {
      brand,
      content,
      blocks,
      ...extra,
      page: {
        title,
        description,
        canonical,
        robots,
        ogType,
        ogUrl: canonical,
        ogImage: `${base}${brand.socialImage.path}`,
        key,
        canonicalTag: indexable ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : "",
        jsonLd: indexable ? jsonLdScript({ "@context": "https://schema.org", "@graph": graph }) : "",
        script:
          (script ? `<script src="${escapeHtml(script)}" defer></script>` : "") +
          (key === "home" ? '\n  <script src="/landing.js" defer></script>\n  <script src="/landing-motion.js" defer></script>' : ""),
        verificationTags: key === "home" ? verificationTags(brand) : "",
        authScripts: auth.scripts,
        socialImageWidth: String(brand.socialImage.width),
        socialImageHeight: String(brand.socialImage.height),
      },
    };
    const body = render(readText(root, bodyTemplate), context);
    files.set(file, render(layout, { ...context, page: { ...context.page, body } }));
  };

  for (const page of PAGES) {
    const canonical = `${base}${page.path}`;
    renderPage({
      key: page.key,
      pagePath: page.path,
      file: page.file,
      bodyTemplate: page.body,
      title: page.title(brand),
      description: page.description(brand),
      schemaType: page.schemaType,
      indexable: page.indexable,
      script: page.script,
      graphExtra: page.faqPage ? [faqPageNode(faq, { canonical })] : [],
      pageNodeExtra:
        page.key === "blog"
          ? {
              dateModified: posts[0]?.updated ?? brand.lastUpdated,
              blogPost: posts.map((p) => ({ "@id": `${base}/blog/${p.slug}/#article` })),
            }
          : {},
    });
  }

  for (const post of posts) {
    const url = `${base}/blog/${post.slug}/`;
    const author = post.author
      ? { "@type": "Organization", name: post.author }
      : { "@type": "Organization", name: brand.siteName, url: `${base}/` };
    renderPage({
      key: "post",
      pagePath: `/blog/${post.slug}/`,
      file: `blog/${post.slug}/index.html`,
      bodyTemplate: "pages/post.html",
      title: `${post.title} | ${brand.siteName}`,
      description: post.description,
      schemaType: "WebPage",
      indexable: true,
      ogType: "article",
      pageNodeExtra: { dateModified: post.updated, mainEntity: { "@id": `${url}#article` } },
      graphExtra: [
        {
          "@type": "BlogPosting",
          "@id": `${url}#article`,
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.updated,
          url,
          mainEntityOfPage: { "@id": `${url}#webpage` },
          isPartOf: { "@id": `${base}/blog/#webpage` },
          author,
          publisher: { "@type": "Organization", name: brand.siteName, url: `${base}/` },
          image: `${base}${brand.socialImage.path}`,
          inLanguage: brand.language,
          wordCount: post.words,
          ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
        },
      ],
      extra: {
        post: {
          title: post.title,
          description: post.description,
          html: post.html,
          byline: `<time datetime="${post.date}">${formatDate(post.date)}</time>${
            post.updated !== post.date ? ` · Updated <time datetime="${post.updated}">${formatDate(post.updated)}</time>` : ""
          }${post.author ? ` · ${escapeHtml(post.author)}` : ""}`,
          tags: post.tags.length
            ? `<ul class="post-tags" aria-label="Tags">${post.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
            : "",
        },
      },
    });
  }

  files.set("blog/feed.xml", rssFeed(brand, base, posts));

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

  const sitemapEntries = [
    ...PAGES.filter((p) => p.indexable).map((p) => ({
      loc: `${base}${p.path}`,
      lastmod: p.key === "blog" && posts[0] && posts[0].updated > brand.lastUpdated ? posts[0].updated : brand.lastUpdated,
    })),
    ...posts.map((p) => ({ loc: `${base}/blog/${p.slug}/`, lastmod: p.updated })),
  ];
  files.set(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map((e) => `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>\n  </url>`)
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
- [Blog](${base}/blog/): news and notes ([RSS](${base}/blog/feed.xml))
${posts.length ? `\n## Blog posts\n${posts.map((p) => `- [${p.title}](${base}/blog/${p.slug}/) (${p.date}): ${p.description}`).join("\n")}\n` : ""}
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
