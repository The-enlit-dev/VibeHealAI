#!/usr/bin/env node
// Renders the social sharing image (website/assets/og-image.png, 1200x630) from site/brand.json.
// Optional tool: needs Playwright with Chromium, which is NOT a project dependency.
// Run it only after changing the brand name, tagline, colours or logo:
//   NODE_PATH="$(npm root -g)" node scripts/render-social-image.mjs
// The generated PNG is committed, so normal builds never need Playwright.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is not installed. Install it globally or set NODE_PATH to a folder that has it.");
  process.exit(1);
}

const brand = JSON.parse(readFileSync(path.join(root, "site", "brand.json"), "utf8"));
const logo = readFileSync(path.join(root, "website", brand.logo.path.replace(/^\//, "")), "utf8");
const c = brand.colors;
const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${c.ivory}; color: ${c.navy};
         font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif; }
  .frame { position: absolute; inset: 0; padding: 80px 88px; display: flex; flex-direction: column; justify-content: space-between;
           border-top: 14px solid ${c.navy}; }
  .mark svg { width: 96px; height: 96px; display: block; }
  h1 { font-size: 72px; line-height: 1.05; letter-spacing: -0.03em; font-weight: 800; max-width: 900px; }
  p { font-size: 34px; font-weight: 650; color: ${c.tealInk}; margin-top: 22px; }
  .bar { position: absolute; right: 88px; bottom: 80px; display: flex; gap: 10px; }
  .bar span { width: 26px; height: 26px; border-radius: 4px; }
</style></head><body><div class="frame">
  <div class="mark">${logo}</div>
  <div><h1>${escape(brand.headline)}</h1><p>${escape(brand.tagline)}</p></div>
</div>
<div class="bar"><span style="background:${c.navy}"></span><span style="background:${c.teal}"></span><span style="background:${c.amber}"></span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: brand.socialImage.width, height: brand.socialImage.height } });
await page.setContent(html);
const target = path.join(root, "website", brand.socialImage.path.replace(/^\//, ""));
await page.screenshot({ path: target, type: "png" });
await browser.close();
console.log(`Wrote ${path.relative(root, target)}`);
