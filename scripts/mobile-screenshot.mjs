// mobile-screenshot.mjs
// Usage: node scripts/mobile-screenshot.mjs [targetUrl] [outFile]
// Defaults: portal/events.html @ iPhone 14 Pro → .tmp/mobile.png
//
// Logs in via auth/login.html first so the Supabase session is real.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const BASE     = 'http://127.0.0.1:5500';
const TARGET   = process.argv[2] || `${BASE}/portal/events.html`;
const OUT_FILE = process.argv[3] || '.tmp/mobile.png';
const EMAIL    = process.argv[4] || 'mcneal.justin99@gmail.com';
const PASS     = process.argv[5] || 'Monday23!';

// iPhone 14 Pro
const DEVICE = {
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext(DEVICE);
const page    = await ctx.newPage();

// --- Step 1: Log in ---
console.log('Logging in…');
await page.goto(`${BASE}/auth/login.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });

// Fill email & password then submit
await page.fill('#email',    EMAIL);
await page.fill('#password', PASS);
await page.click('#loginBtn, button[type="submit"]');

// Wait until we leave the login page (Supabase redirects to portal)
await page.waitForURL(/^(?!.*\/auth\/login)/, { timeout: 20000 });
console.log('Logged in. Current URL:', page.url());

// --- Step 2: Navigate to target ---
if (!page.url().includes(TARGET.replace(BASE, ''))) {
    await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 15000 });
}

// Wait for main content to appear
await page.waitForTimeout(3000);

// --- Step 3: Screenshot ---
mkdirSync(path.dirname(OUT_FILE), { recursive: true });
await page.screenshot({ path: OUT_FILE, fullPage: false });
await browser.close();

console.log('Saved:', OUT_FILE);
