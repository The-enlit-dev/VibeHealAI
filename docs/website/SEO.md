# SEO, AEO and GEO implementation

**Status:** technical foundations implemented and tested 2026-10-31. Since 2026-11-05 the canonical URL is **https://vibehealai.netlify.app** (DEC-30), and every page except the 404 page is `index, follow`. Submission to Google and Bing is an owner step ([SEARCH_CONSOLE.md](./SEARCH_CONSOLE.md)).

## Canonical production URL
- **Current value:** `https://vibehealai.netlify.app`, the free Netlify address of the `vibehealai` project. If a custom domain is bought later, change `siteUrl` and add a Netlify domain redirect.
- **Duplicate project:** the older `brixoai` Netlify project builds the same repository. `netlify.toml` redirects `https://brixoai.netlify.app/*` to the canonical site with a 301, so search engines see one copy.
- **Deploy previews** are not indexed: Netlify sends `X-Robots-Tag: noindex` on them (checked 2026-11-05 on deploy-preview-6), and their canonical tags point at the production URL.
- **Verification tokens:** `brand.verification.google` and `brand.verification.bing` add ownership meta tags to the home page only. Only a plain token is accepted.
- Set `siteUrl` in `site/brand.json` to the real origin, for example `https://www.example.org` (HTTPS, no trailing slash), then run `npm run build:site`.
- For a one-off build against another URL without editing the file: `SITE_URL=https://www.example.org npm run build:site` (do not commit that output unless the URL is final).
- **While the URL is a placeholder** (`*.example`, `localhost` or invalid), the generator marks every page `noindex, nofollow` and prints a warning. This stops a preview deploy from being indexed under a wrong canonical. Netlify deploy previews of this repository are therefore not indexable.

## SEO

| Requirement | Implementation | Checked by |
|---|---|---|
| Unique titles and descriptions | Per-page `title()`/`description()` in `scripts/build-site.mjs`. Every indexable title includes the product name | Test: unique, title ≤ 70 chars, description 50–320, name in title |
| Heading hierarchy | One `<h1>` per page, no skipped levels | Test parses every heading |
| Canonical URLs | `<link rel="canonical">` on indexable pages, built from `siteUrl` | Test: canonical = `og:url` = sitemap entry |
| Open Graph / Twitter | `og:*` and `twitter:*` with a 1200×630 PNG and alt text | Test |
| Image alt text | Decorative logo uses `alt=""` next to visible text; the social image has descriptive `og:image:alt` | Test: every `<img>` has `alt` |
| XML sitemap | `website/sitemap.xml`: home, FAQ, About, Privacy, with `lastmod` from `brand.lastUpdated`. The 404 page is excluded | Test (structure) + browser `DOMParser` (well-formed XML) |
| robots.txt | Allows all crawlers and references the sitemap | Test |
| Search-friendly URLs | `/faq/`, `/about/`, `/privacy/` (lowercase, trailing-slash folders). The preview server redirects `/faq` to `/faq/`, as Netlify's pretty URLs do | Test + preview check |
| Internal links | Header, footer and in-page links between all pages | Test: every internal link and `#anchor` resolves |
| Mobile and performance | Responsive CSS, system fonts, no third-party requests, deferred JS only on the home page | Browser check at 1280, 768, 390 and 320 px |

## AEO (answer engine optimisation)
- **Single source:** `site/faq.json` holds 14 questions phrased the way vibe coders ask them, for example "An AI tool broke my project. What should I do first?" and "Should I paste API keys or .env files into an AI chat?".
- **Answer shape:** each answer has a direct **short answer**, followed by explanation paragraphs and, where a technical claim is made, **genuine references** (Git documentation and the OWASP Secrets Management Cheat Sheet).
- **FAQ page layout:** every question is an `<h2>` with a stable anchor (`/faq/#ai-broke-project`), and a table of contents links to each one. The home page previews five questions and links to the full answers.
- **Product answers** use the same status language as the rest of the site: in development, planned or exploring.

## GEO (generative engine optimisation)
- **Consistent description:** the same `description` string is used for the home meta description, the About lead, WebSite structured data and `llms.txt`.
- **Honest status everywhere:** capability statuses come from one file (`content.json`) and appear on the home page, in the status panel and in `llms.txt`.
- **About page:** what the project is, why it exists, what exists today, principles, how it is built and who is behind it. The author fields are empty until the owner chooses to add them.
- **`/llms.txt`:** a plain-text summary with links to key pages. It follows the community proposal at llmstxt.org. It is **not a standard**, and there is no guarantee any engine reads it.
- **Crawlability:** all important content is server-rendered HTML. JavaScript only powers the form. robots.txt allows all crawlers. If the owner later wants to block AI training crawlers, add their user-agents to `robots.txt` in `scripts/build-site.mjs`.

## Structured data (JSON-LD)
Each indexable page has one `<script type="application/ld+json">` with an `@graph`:
- **`WebSite`:** name = the product name (`brand.siteName`), description, language.
- **`WebPage` or `AboutPage`:** URL, name, description, `dateModified` and `isPartOf`. It includes `author` only if `brand.author.name` is set.
- **`FAQPage`:** only on `/faq/`, with exactly the questions and answers that are visible on that page (a test enforces this).

Not used, on purpose:
- **`Organization`:** the product name is decided (DEC-28), but there is no organisation, legal entity or official profile to describe. Add it once one exists.
- **`SoftwareApplication`:** there is no released software, and Google's rich result for it expects offers or ratings, which would have to be invented.
- **Fabricated `Review`, `AggregateRating`, `Offer`, price or award data:** never added (a test enforces this).

**FAQ rich results:** Google announced in August 2023 that FAQ rich results are shown only for well-known, authoritative government and health websites. This site will not get them, and that could not be re-verified from the build environment because its network policy blocks Google's documentation hosts. The FAQPage markup is still valid schema.org data, describes visible content written by the site, and can help other engines. It can be removed with one line in `scripts/build-site.mjs` (`faqPage: true`) if the owner prefers.

**Validation done:** automated tests parse every JSON-LD block and check types, required properties, forbidden properties and FAQ/visible-content parity. **Not done:** Google's Rich Results Test and the Schema Markup Validator. Run them on the deployed URL once a domain exists.

## References used on the site (check before launch)
- https://git-scm.com/docs/git-status
- https://git-scm.com/docs/git-diff
- https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things
- https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

These are long-standing official documentation pages. The build environment's network policy blocked them, so they were not link-checked automatically.
