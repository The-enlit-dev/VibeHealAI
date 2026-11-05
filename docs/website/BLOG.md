# Blog and content studio

**Status (2026-11-05):** implemented and tested (automated tests, plus browser checks with the real Clerk instance signed out and a stand-in user signed in). Decision: DEC-32. No server code, no database, no new dependencies.

## How it works
- Each post is a Markdown file in `site/blog/`, named `YYYY-MM-DD-slug.md`.
- `scripts/build-site.mjs` turns posts into:
  - `/blog/`: the blog index;
  - `/blog/<slug>/`: one page per post, with `BlogPosting` structured data;
  - `/blog/feed.xml`: an RSS feed;
  - entries in `sitemap.xml` and `llms.txt`.
- **Netlify runs the generator on every deploy** (`netlify.toml` → `[build] command`). A post committed from GitHub's web editor therefore goes live when it is merged, without a local build.
- Drafts (`draft: true`) are never published.

## Writing a post
### From the content studio (recommended)
1. Sign in on https://vibeheal.online with an account that has the **admin** role (see below), then open **Studio** in the header (`/studio/`).
2. Enter a title and a 50 to 300 character description, and choose **Open in the GitHub editor**.
3. GitHub opens a new file in `site/blog/` with the front matter filled in. Write the post.
4. Choose **Commit changes…** → **Create a new branch for this commit and start a pull request**.
5. Netlify builds a **deploy preview** for the pull request. Open it from the pull request, check the post at `/blog/<slug>/`, then merge. The post is live after the production deploy.

To edit a published post, use **Edit on GitHub** next to it in the studio, and follow the same branch and pull request steps.

### By hand, or by asking Claude Code
Create the file yourself, run `npm run build:site` and `npm run check`, and open a pull request.

## Front matter
```markdown
---
title: Introducing VibeHeal                (required, at most 90 characters)
description: One or two sentences...       (required, 50 to 300 characters)
date: 2026-11-05                           (required, must match the file name)
updated: 2026-11-06                        (optional)
author: The VibeHeal team                  (optional)
tags: news, vibe coding                    (optional, comma-separated)
draft: false                               (optional; true keeps it unpublished)
---
```
Any mistake (a bad date, an unknown field, a description that is too short) **fails the build**, so a broken post never reaches the live site. On a deploy preview, the Netlify deploy log names the file and the problem.

## Supported Markdown
`##` to `####` headings, paragraphs, `-` and `1.` lists, `>` quotes, fenced code blocks, `` `code` ``, `**bold**`, `*italic*`, `[links](/faq/)` and `---`.

For safety, raw HTML is always shown as text. Links may only point to `https://`, `http://`, `mailto:`, site paths such as `/faq/`, or `#anchors`. Images are not supported yet.

## Who can use the studio
The studio page checks the signed-in user's Clerk `publicMetadata.role`. To make an account an admin:
1. Clerk Dashboard → **Users** → choose the user → **Metadata** → **Public**.
2. Set it to `{"role": "admin"}` and save.

The studio only hides its content from non-admins. It holds no secrets, only links, so this is a convenience, not a security boundary. **The real protection is GitHub:** only people with write access to the repository can commit a post.

## Limits
- **Netlify free plan:** every production deploy (every merge) costs 15 of the 300 monthly credits, so about 20 merges a month. Deploy previews are free. Group several posts into one merge if you post often.
- No scheduled publishing and no image uploads.
- The studio does not list drafts, because drafts are never published to the site.
