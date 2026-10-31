# BrixoAI marketing website

A static, dependency-free landing page with an early-access waitlist form. It is separate from the Electron desktop app and from the local backend in `server/`.

## Files
- `index.html`: the page (hero, problem, solution, how it works, status, audience, waitlist, FAQ).
- `styles.css`: colour tokens on `:root`, dark mode, responsive layout.
- `app.js`: form validation, submit states and error messages. It posts JSON to `data-endpoint` (default `/api/waitlist`).

The waitlist service lives in `waitlist/` (TypeScript, Node built-ins only). It validates signups, stores them in a git-ignored file, and serves this folder for local preview.

## Run it locally

```bash
npm install
npm run site:dev
```

Then open http://127.0.0.1:8790/ in a browser. Signups are written to `waitlist-data/signups.json` in the repository folder (git-ignored). To use another folder, set `WAITLIST_DATA_DIR`.

## Admin commands (local only, never served over HTTP)

```bash
npm run waitlist:report
npm run waitlist:export
```

- `waitlist:report` prints and writes `waitlist-data/demand-report.md`. It contains counts only: signups by day, preferred AI tools, most requested planned capabilities and frustration themes. It contains no email addresses.
- `waitlist:export` writes `waitlist-data/waitlist-export.csv`. **This file contains personal data.** Keep it private and delete it when you no longer need it.

## Settings (environment variables, all optional)

| Variable | Default | Purpose |
|---|---|---|
| `WAITLIST_HOST` | `127.0.0.1` | Interface to listen on. Keep it on loopback unless the owner decides otherwise |
| `WAITLIST_PORT` | `8790` | Port |
| `WAITLIST_DATA_DIR` | `./waitlist-data` | Where signups and reports are stored |
| `WAITLIST_ALLOWED_ORIGINS` | empty | Comma-separated origins allowed to call the API from another site |
| `WEBSITE_DIR` | `./website` | Folder served as the site |

## Protections in place
- Email required, validated on the client and again on the server. Name, AI tool, frustration and planned-feature answers are optional. Consent is required.
- Honeypot field: bots that fill it get a success message and nothing is stored.
- Duplicate emails (any letter case) are not stored twice, and the response is the same, so the form does not reveal who is on the list.
- Rate limit: 5 attempts per address per 10 minutes, in memory. It resets when the service restarts.
- Body size limit (16 KB), JSON only, safe error messages, no stack traces.
- Static files are served only from `website/`, with a path-traversal guard. Other extensions return 404.
- Security headers, including a Content-Security-Policy that allows only same-origin scripts and styles.
- Writes are serialised and atomic. The data file is created with owner-only permissions where the OS supports it.

## Limits (be honest about these)
- **Not hosted.** Nothing is deployed. The hosting address, hosting provider and privacy wording need the owner's approval first.
- **Storage is a local JSON file.** It is not encrypted at rest. A hosted store, and any encryption or key management, needs a separate owner decision.
- The rate limit is per process and per IP address, and it trusts the socket address only. Behind a proxy, every visitor would share one address, so do not deploy this service behind a proxy without changing it.
- `netlify.toml` publishes this folder as a static site. It does **not** run the waitlist API. On Netlify, the form shows "not reachable" until a hosted endpoint is set up.

## Tests
`npm test` runs the service tests (`waitlist/waitlist.test.ts`) and the site safety checks (`waitlist/site-safety.test.ts`). The site safety checks fail if the public files contain secret-like values, email addresses, third-party assets, inline scripts, or `innerHTML`.
