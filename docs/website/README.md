# Public website, waitlist and admin dashboard

**Status:** last updated 2026-10-31. Nothing is deployed. The site runs locally, and Netlify builds deploy previews of `website/` for pull requests (that connection was set up by the owner outside this repository).

## Documents in this folder

| Document | What it covers |
|---|---|
| [DESIGN.md](./DESIGN.md) | Visual direction, palette, contrast rules, layout and component decisions |
| [BRANDING.md](./BRANDING.md) | How the temporary identity works and how to rename the site later |
| [SEO.md](./SEO.md) | SEO, AEO and GEO implementation, structured data and the canonical URL |
| [SEARCH_CONSOLE.md](./SEARCH_CONSOLE.md) | Google Search Console setup the owner completes after a domain is chosen |
| [ADMIN.md](./ADMIN.md) | Admin dashboard setup, security model and operations |

## How the pieces fit

```text
site/                  SOURCE for the public website (edit these)
  brand.json           temporary name, headline, tagline, colours, logo, social image, canonical URL
  content.json         capabilities and their status, steps, principles, waitlist options
  faq.json             FAQ: one source for the FAQ page, the home page preview and FAQPage data
  layout.html          shared <head>, header and footer
  pages/*.html         page bodies
scripts/build-site.mjs generator (no dependencies) -> writes website/
scripts/render-social-image.mjs  optional: re-renders website/assets/og-image.png (needs Playwright)
website/               GENERATED + hand-written assets. Netlify publishes this folder as-is.
  index.html, faq/, about/, privacy/, 404.html, brand.css, sitemap.xml, robots.txt, llms.txt  (generated)
  styles.css, app.js, assets/                                                              (hand-written)
waitlist/              Node service (built-ins only): signup API, static preview, admin API
  admin-ui/            admin dashboard page. Served only by the waitlist service, never published by Netlify
```

## Commands

| Command | What it does |
|---|---|
| `npm run build:site` | Regenerates `website/` from `site/` |
| `npm run check:site` | Fails if `website/` is out of date with `site/` (also part of `npm run check`) |
| `npm run site:dev` | Serves the site, the signup API and (if configured) `/admin/` on http://127.0.0.1:8790/ |
| `npm run waitlist:hash-password` | Creates an admin password hash (see [ADMIN.md](./ADMIN.md)) |
| `npm run waitlist:report` | Private counts-only summary in `waitlist-data/demand-report.md` |
| `npm run waitlist:export` | Private CSV with email addresses in `waitlist-data/` |
| `npm run check` | Typecheck, lint, site freshness, all tests and the full build |

## Run it locally

```bash
npm install
npm run build:site
npm run site:dev
```

Open http://127.0.0.1:8790/. To enable the admin dashboard, follow [ADMIN.md](./ADMIN.md).

## Known limitations and unfinished work

- **Not deployed.** No hosting, domain or production waitlist endpoint exists. On a Netlify deploy, the static pages work, but the signup form shows "not reachable", because the waitlist service is not hosted there.
- **Placeholder domain.** `site/brand.json` uses `https://your-domain.example`. While it is a placeholder, every page is `noindex` and the canonical, sitemap and social URLs point at the placeholder. Set the real domain before launch (see [SEO.md](./SEO.md)).
- **Storage** is a local JSON file, not encrypted at rest. Hosting the waitlist needs a storage, backup and key-management decision.
- **Admin sessions** live in memory: restarting the service signs the admin out. There is one admin account and no password reset flow (create a new hash instead).
- **Rate limits** are in-memory and keyed by the socket address. Behind a shared proxy every visitor would share one address. Change this before hosting behind a proxy.
- **External references** in the FAQ (Git documentation and the OWASP cheat sheet) could not be link-checked from the build environment, because its network policy blocks those hosts. Check them in a browser before launch.
- **Privacy notice** says the retention period and contact address are not decided yet. The owner must decide both, and should review the wording, before the waitlist is public.
- **Structured data** was validated by automated tests for structure and content rules, not with Google's Rich Results Test or the Schema Markup Validator (both need network access and should be run after deployment).
- **Positioning conflict to resolve:** the new headline says "AI assistant", while `docs/planning/DECISIONS.md` (DEC-06, DEC-24) records "no built-in AI". The site copy states that no built-in AI exists today and that this is undecided. The owner should record a decision.
- **Marketing drafts** in `marketing/` still use the earlier BrixoAI name and the narrower "safety net" positioning. Review them before posting.
