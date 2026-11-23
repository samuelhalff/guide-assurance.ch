#!/usr/bin/env node
// Render a JS-heavy page with headless Chromium and print the final HTML to stdout.
// Usage: node render_page.mjs <url> [waitMs] [clickSelector]
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

// Playwright : data/scripts/node_modules (npm ci dans data/scripts ; en CI, .github/actions/setup-site),
// ou le dossier node_modules désigné par PLAYWRIGHT_NODE_MODULES.
const require = createRequire(process.env.PLAYWRIGHT_NODE_MODULES ? `${process.env.PLAYWRIGHT_NODE_MODULES.replace(/\/$/, '')}/` : import.meta.url);
const { chromium } = require('playwright');

const url = process.argv[2];
const waitMs = Number(process.argv[3] || 4000);
const clickSel = process.argv[4] || '';
if (!url) { console.error('usage: render_page.mjs <url> [waitMs] [clickSelector]'); process.exit(2); }

const shell = `${homedir()}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`;
const opts = { headless: true };
if (existsSync(shell)) opts.executablePath = shell;

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const browser = await chromium.launch(opts);
try {
  const ctx = await browser.newContext({ userAgent: UA, locale: 'fr-CH', timezoneId: 'Europe/Zurich', viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'fr-CH,fr;q=0.9,de-CH;q=0.7,en;q=0.6' } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  // Dismiss common cookie banners (best effort).
  for (const sel of ['#onetrust-accept-btn-handler', 'button:has-text("Accepter")', 'button:has-text("Tout accepter")', 'button:has-text("Alle akzeptieren")', 'button:has-text("Akzeptieren")', 'button:has-text("Accept all")']) {
    try { const b = page.locator(sel).first(); if (await b.isVisible({ timeout: 500 })) { await b.click({ timeout: 2000 }); break; } } catch {}
  }
  if (clickSel) { try { await page.locator(clickSel).first().click({ timeout: 5000 }); } catch {} }
  await page.waitForTimeout(waitMs);
  process.stdout.write(await page.content());
} finally {
  await browser.close();
}
