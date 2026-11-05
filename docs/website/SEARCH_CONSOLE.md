# Google Search Console and Bing Webmaster Tools (owner steps)

**Status (2026-11-05):** the site's canonical address is **https://vibeheal.online** (DEC-31). The `*.netlify.app` addresses redirect there. Pages are indexable, and `robots.txt` and `sitemap.xml` point at that address. Nothing has been submitted to Google or Bing yet: that needs the owner's own Google and Microsoft accounts. Both tools are free.

## Quick path for vibeheal.online
The simplest option is a **URL prefix** property with the **HTML tag** method. (A **Domain** property with DNS verification also works, because the domain uses Netlify DNS: see the full guide below.)

1. Sign in at https://search.google.com/search-console and choose **Add property** > **URL prefix**. Enter `https://vibeheal.online/`.
2. Choose **HTML tag**. Google shows a tag like `<meta name="google-site-verification" content="AbC123...">`. Copy **only** the `content` value.
3. Paste it into `site/brand.json` as `verification.google`, then run `npm run build:site` and `npm run check`. The tag is added to the home page only. The token is not a secret.
4. Merge and let Netlify deploy, then press **Verify** in Search Console.
5. Open **Sitemaps**, submit `sitemap.xml`, and check the status becomes **Success** with 4 pages.
6. Use **URL inspection** on `https://vibeheal.online/` and choose **Request indexing** (see section 4 below).
7. **Bing:** at https://www.bing.com/webmasters you can import the verified site from Search Console (no token needed). Or choose the meta tag method and paste its `content` value into `verification.bing`. Then submit the same sitemap. Bing also feeds DuckDuckGo and several AI answer engines.

Indexing is never guaranteed and usually takes days to weeks for a new site. 

## Full guide (Domain property with DNS verification)

## 0. Before you start
1. Choose and register the domain (a separate cost decision).
2. Set `siteUrl` in `site/brand.json` to the final HTTPS origin, run `npm run build:site`, run `npm run check`, and confirm that pages now say `index, follow`:

   ```bash
   grep -h 'name="robots"' website/index.html website/faq/index.html
   ```

3. Deploy the approved build, then confirm these open in a browser:
   - `https://YOUR-DOMAIN/robots.txt` (its last line names the sitemap);
   - `https://YOUR-DOMAIN/sitemap.xml`;
   - `https://YOUR-DOMAIN/faq/`.

## 1. Add a property
1. Sign in at https://search.google.com/search-console with the Google account that will own the site.
2. Choose **Add property**.
3. Pick a property type:
   - **Domain** (recommended): covers `https`, `http`, `www` and all subdomains. It needs DNS verification.
   - **URL prefix**: covers one exact origin such as `https://www.example.org/`. It allows other verification methods.

## 2. Verify ownership with DNS (Domain property)
1. Search Console shows a TXT record value that starts with `google-site-verification=`.
2. In your domain registrar's or DNS provider's dashboard, add a **TXT** record:
   - **Host / name:** `@` (the root of the domain). Some providers want the bare domain or leave it blank.
   - **Value:** the full `google-site-verification=...` string.
   - **TTL:** the default is fine.
3. Save, wait for DNS to update (minutes to a day or two), then press **Verify** in Search Console.
4. Leave the TXT record in place permanently. Removing it can un-verify the property.

The verification token is not a secret, but it belongs in DNS, not in this repository.

## 3. Submit the sitemap
1. In the verified property, open **Sitemaps**.
2. Enter `sitemap.xml` (the full URL is `https://YOUR-DOMAIN/sitemap.xml`) and submit.
3. Check that the status becomes **Success** and that the discovered page count matches the sitemap: currently 4 pages (home, FAQ, About and Privacy).
4. When pages change, update `brand.lastUpdated`, rebuild and redeploy. You do not need to resubmit the sitemap for normal updates.

## 4. URL inspection and indexing checks
1. Use **URL inspection** with `https://YOUR-DOMAIN/`.
2. Run **Test live URL**. Confirm:
   - "URL is available to Google";
   - **Indexing allowed** says yes. If it says "No: 'noindex' detected", the placeholder `siteUrl` is still set;
   - the **user-declared canonical** matches the URL;
   - **View tested page** shows the full content, which proves the content is crawlable without JavaScript.
3. Choose **Request indexing** for the home page and `/faq/`. Indexing is not guaranteed and can take days or weeks.
4. Repeat for `/about/` and `/privacy/` if they are not discovered on their own.

## 5. Ongoing checks
- **Pages** report: look for "Excluded by noindex", "Duplicate without user-selected canonical" or "Not found (404)".
- **Enhancements:** structured data issues, if Google reports any.
- After any redesign or domain change, re-run URL inspection on the home page.

## What not to do
- Don't buy SEO tools or paid indexing services. Search Console is free.
- Don't submit the placeholder domain or Netlify deploy-preview URLs.
- Don't paste a whole meta tag into `brand.json`: only the token. The build refuses anything else.
- Don't submit the `*.netlify.app` addresses: they redirect to the canonical site.
