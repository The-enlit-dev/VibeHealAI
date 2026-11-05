# Waitlist admin dashboard: setup and security

**Status:** implemented and tested locally on 2026-10-31 (Linux; automated tests plus a browser check). It is not deployed. It runs inside the waitlist service at `/admin/`.

> **Scope (2026-11-05):** this dashboard reads only signups stored by the local waitlist service. Signups made on the Netlify-hosted site go to Netlify Forms (DEC-29) and are viewed and exported in the Netlify dashboard (Forms > waitlist).

## What it does
- **Summary:** total signups, signups in the last 7 and 30 days, how many people answered the frustration question, the time of the latest signup, and "data as of" (when the numbers were generated).
- **Trend:** signups per day for the last 30 days (UTC), as an SVG chart with a table view. Timestamps are set by the server when a signup is stored, so they are reliable.
- **Breakdowns:** preferred AI tools, most requested planned features, and keyword-based frustration themes.
- **Signups table:**
  - searches email, name and frustration text;
  - filters by AI tool (including "not answered"), planned feature and date range;
  - sorts newest or oldest first, 25 per page;
  - a **View** button shows every stored field for one signup.
- **CSV export** of the current filter (formula-injection safe) as an attachment.
- **States:** clear empty states, error notices, and a return to sign-in when a session ends.

It collects nothing new. It shows exactly the fields the waitlist already stores.

## First-time setup (local)

1. Create a strong password (12+ characters; a long passphrase from a password manager is best).
2. Create its hash. You type the password without echo; it is never passed as a command-line argument:

   ```bash
   npm run waitlist:hash-password
   ```

3. Copy `.env.waitlist.example` to `.env.waitlist` (git-ignored) and fill in:

   ```text
   WAITLIST_ADMIN_USERNAME=your-admin-name
   WAITLIST_ADMIN_PASSWORD_HASH=scrypt:32768:8:1:...:...
   ```

4. Start the service and sign in at http://127.0.0.1:8790/admin/:

   ```bash
   npm run site:dev
   ```

To change the password, generate a new hash, replace the line and restart. Restarting signs out every session.

There is **no default password, no registration page and no account-creation API**. If either variable is missing, the admin area is disabled and every admin URL returns 404. If only one is set, or the hash is malformed, the service refuses to start.

## Security model

| Control | How |
|---|---|
| Credentials never reach the browser | The password exists only as a scrypt hash (N=32768, r=8, p=1, 16-byte random salt) in `.env.waitlist`. The admin page contains no data or secrets, and a test fails if a hash or setting name appears in any frontend file |
| Server-side protection on every endpoint | Every `/api/admin/*` route except login and logout checks the session before doing anything. Unknown admin paths also return 401 without a session. Hiding the URL is not relied on |
| Sessions | 256-bit random token in a cookie: `HttpOnly`, `SameSite=Strict`, `Path=/`, and `Secure` whenever the host is not loopback. Only its SHA-256 digest is held in memory. Idle timeout 2 hours, absolute lifetime 12 hours, logout deletes it. At most 100 sessions; the oldest is dropped |
| Cross-site protection | `SameSite=Strict`, plus refusal of requests with `Sec-Fetch-Site: cross-site` or an `Origin` whose host differs. Data endpoints accept GET only. Login requires POST with a JSON body, and logout requires POST |
| Login rate limiting | 5 failed attempts per IP address per 15 minutes, and 50 failures in total per 15 minutes; then HTTP 429, even for the correct password, until the window passes. A successful login clears that address's count |
| No user enumeration | A wrong username and a wrong password give the same message, and the password hash is always computed |
| Input validation | Login body ≤ 4 KB, with length limits. Filter parameters are allow-listed (unknown keys rejected), with enum checks, real calendar dates, a 200-character search cap and page sizes of 1–100. Signup ids must be UUIDs |
| No public exposure | Signups are readable only through these endpoints. The public site has no data route; `/api/waitlist` accepts POST only. The admin UI lives in `waitlist/admin-ui/`, outside the folder Netlify publishes |
| No indexing or caching | Admin responses carry `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` |
| No personal data in logs | The service logs only error class names. It never logs emails, passwords, tokens or request bodies |
| Same CSP as the site | `script-src 'self'; style-src 'self'; frame-ancestors 'none'`. The dashboard sets text only with `textContent` |
| HTTPS requirement | The service refuses to serve the admin area on a non-loopback address without Secure cookies |

## Before hosting the admin area (owner approval needed)
The current design is safe for local use by one owner. Before it is reachable from the internet:
1. Put it behind HTTPS (required by the Secure-cookie rule) and decide where it runs (cost decision P-10).
2. Change rate limiting to use a trusted proxy header if there is a proxy. Otherwise every visitor shares one address and one attacker can lock out everyone.
3. Consider extra protection: an IP allow-list, a VPN, or a second factor. These are not implemented.
4. Move storage to something with backups and encryption at rest, and decide data retention.
5. Sessions are in memory, so running more than one instance would need a shared session store.

## Tested
- `waitlist/admin.test.ts`:
  - hashing;
  - query validation;
  - disabled mode;
  - 401 on every endpoint without, or with a forged, session;
  - dashboard page with no data;
  - no registration routes;
  - no public exposure;
  - login messages and validation;
  - cookie flags;
  - per-IP and global rate limits;
  - cross-site refusal;
  - logout;
  - idle and absolute expiry;
  - overview numbers;
  - empty state;
  - search, filter, sort and paging;
  - detail view;
  - CSV export and its filters;
  - method restrictions.
- Browser (Playwright, local): failed sign-in, no cookie after failure, sign-in, totals, chart, table, search, detail dialog, empty state, CSV download, phone layout, sign-out, and the API refusing requests after sign-out.
