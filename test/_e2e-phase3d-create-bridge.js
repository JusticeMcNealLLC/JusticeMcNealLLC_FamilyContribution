// Phase 3D E2E — create/sheet.js PortalEvents.create bridge
// Verifies live portal events page after Phase 3D bridge is deployed.
// Uses the live site (or local if overridden) to check globals.
//
// Run: node test/_e2e-phase3d-create-bridge.js
'use strict';

const path = require('path');
// Resolve playwright from scripts/node_modules
const playwrightPath = path.join(__dirname, '..', 'scripts', 'node_modules', 'playwright');
const { chromium } = require(playwrightPath);

const CHROMIUM_PATH = 'C:\\Users\\justi\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
const BASE_URL = process.env.E2E_BASE_URL || 'https://justicemcneal.com';
const LOGIN_URL = `${BASE_URL}/auth/login.html`;
const EVENTS_URL = `${BASE_URL}/portal/events.html`;
const EMAIL = process.env.E2E_ADMIN_EMAIL || 'mcneal.justin99@gmail.com';
const PASS  = process.env.E2E_ADMIN_PASSWORD || 'Monday23!';

let passed = 0;
let failed = 0;
const failures = [];
const consoleErrors = [];
const uncaughtErrors = [];

function pass(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg, detail) {
    console.log(`  ✗ ${msg}${detail ? ` (${detail})` : ''}`);
    failed++;
    failures.push(msg);
}
function info(msg) { console.log(`  ℹ ${msg}`); }

(async () => {
    const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    page.on('console', msg => {
        const t = msg.type();
        const text = msg.text();
        if ((t === 'error' || t === 'warning') && !text.includes('favicon') && !text.includes('ERR_ABORTED')) {
            consoleErrors.push(`[${t}] ${text}`);
        }
    });
    page.on('pageerror', e => uncaughtErrors.push(e.message));

    // ── Login ──────────────────────────────────────────────────────
    console.log('\n── Login ─────────────────────────────────────────────────────────────────');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 });
    pass('Admin login succeeded');

    // ── Navigate to events page ────────────────────────────────────
    console.log('\n── Navigate to portal/events.html ────────────────────────────────────────');
    await page.goto(EVENTS_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const title = await page.title();
    pass(`Events page loaded (title: "${title}")`);

    // ── Prior global regressions ───────────────────────────────────
    console.log('\n── Prior globals (Phase 1–3C) regression check ───────────────────────────');

    const peExists = await page.evaluate(() => typeof window.PortalEvents === 'object');
    peExists ? pass('window.PortalEvents exists') : fail('window.PortalEvents missing');

    const initFn = await page.evaluate(() => typeof window.PortalEvents?.initEventsPage);
    initFn === 'function' ? pass('window.PortalEvents.initEventsPage is a function (Phase 1)') : fail('Phase 1 regression', `type: ${initFn}`);

    const listNs = await page.evaluate(() => typeof window.PortalEvents?.list);
    listNs === 'object' ? pass('window.PortalEvents.list exists (Phase 3A)') : fail('Phase 3A regression', `type: ${listNs}`);

    const detailNs = await page.evaluate(() => typeof window.PortalEvents?.detail);
    detailNs === 'object' ? pass('window.PortalEvents.detail exists (Phase 3B)') : fail('Phase 3B regression', `type: ${detailNs}`);

    const manageNs = await page.evaluate(() => typeof window.PortalEvents?.manage);
    manageNs === 'object' ? pass('window.PortalEvents.manage exists (Phase 3C)') : fail('Phase 3C regression', `type: ${manageNs}`);

    const emOpen = await page.evaluate(() => typeof window.EventsManage?.open);
    emOpen === 'function' ? pass('window.EventsManage.open intact (Phase 3C compat)') : fail('window.EventsManage.open missing', `type: ${emOpen}`);

    // ── window.EventsCreate (original global — must remain) ────────
    console.log('\n── window.EventsCreate (original global preserved) ───────────────────────');

    const ecExists = await page.evaluate(() => typeof window.EventsCreate === 'object' && window.EventsCreate !== null);
    ecExists ? pass('window.EventsCreate is an object') : fail('window.EventsCreate missing');

    const ecOpen = await page.evaluate(() => typeof window.EventsCreate?.open);
    ecOpen === 'function' ? pass('window.EventsCreate.open is a function') : fail('window.EventsCreate.open not a function', `type: ${ecOpen}`);

    const ecClose = await page.evaluate(() => typeof window.EventsCreate?.close);
    ecClose === 'function' ? pass('window.EventsCreate.close is a function') : fail('window.EventsCreate.close not a function', `type: ${ecClose}`);

    const ecFlag = await page.evaluate(() => typeof window.EventsCreate?.isFlagOn);
    ecFlag === 'function' ? pass('window.EventsCreate.isFlagOn is a function') : fail('window.EventsCreate.isFlagOn not a function', `type: ${ecFlag}`);

    const ecFlagVal = await page.evaluate(() => window.EventsCreate?.isFlagOn?.());
    ecFlagVal === true ? pass('window.EventsCreate.isFlagOn() returns true') : fail('isFlagOn() did not return true', `got: ${ecFlagVal}`);

    // ── window.PortalEvents.create (Phase 3D) ─────────────────────
    console.log('\n── window.PortalEvents.create (Phase 3D bridge — live after deploy) ────────');

    const createNs = await page.evaluate(() => typeof window.PortalEvents?.create);
    createNs === 'object' ? pass('window.PortalEvents.create exists (Phase 3D deployed)') : fail('window.PortalEvents.create missing', `type: ${createNs}`);
    const createOpen = await page.evaluate(() => typeof window.PortalEvents?.create?.open);
    createOpen === 'function' ? pass('window.PortalEvents.create.open is a function') : fail('window.PortalEvents.create.open not a function', `type: ${createOpen}`);
    const createClose = await page.evaluate(() => typeof window.PortalEvents?.create?.close);
    createClose === 'function' ? pass('window.PortalEvents.create.close is a function') : fail('window.PortalEvents.create.close not a function', `type: ${createClose}`);
    const createFlag = await page.evaluate(() => typeof window.PortalEvents?.create?.isFlagOn);
    createFlag === 'function' ? pass('window.PortalEvents.create.isFlagOn is a function') : fail('window.PortalEvents.create.isFlagOn not a function', `type: ${createFlag}`);
    const createFlagVal = await page.evaluate(() => window.PortalEvents?.create?.isFlagOn?.());
    createFlagVal === true ? pass('window.PortalEvents.create.isFlagOn() returns true') : fail('PortalEvents.create.isFlagOn() did not return true', `got: ${createFlagVal}`);
    const createKeys = await page.evaluate(() => Object.keys(window.PortalEvents?.create || {}).sort().join(','));
    info(`window.PortalEvents.create keys: [${createKeys}]`);

    // ── Create Event sheet (functional test) ──────────────────────
    console.log('\n── Create Event sheet functional test ────────────────────────────────────');

    const createBtn = await page.$('#evtCreateBtn, [data-create-event], button[onclick*="EventsCreate"]');
    if (!createBtn) {
        // Try to trigger via window.EventsCreate.open() directly
        info('Create button not found by selector — opening via window.EventsCreate.open()');
        await page.evaluate(() => window.EventsCreate && window.EventsCreate.open && window.EventsCreate.open());
    } else {
        await createBtn.click();
    }
    await page.waitForTimeout(600);

    const sheetOpen = await page.evaluate(() => {
        const sheet = document.getElementById('ecSheet');
        return sheet && sheet.classList.contains('ec-open');
    });
    sheetOpen ? pass('Create Event sheet opened (ec-open class present)') : fail('Create Event sheet did not open');

    const sheetRoot = await page.evaluate(() => !!document.getElementById('ecSheetRoot'));
    sheetRoot ? pass('ecSheetRoot injected into DOM') : fail('ecSheetRoot missing from DOM');

    const panelCount = await page.evaluate(() => document.querySelectorAll('#ecSheetPanel').length);
    panelCount === 1 ? pass(`Create sheet panel count: 1 (no duplicates)`) : fail(`Create sheet panel count unexpected`, `got: ${panelCount}`);

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    // Note: Escape may not close the create sheet (no Escape handler in sheet.js — it relies on backdrop/button)
    // Close via window.EventsCreate.close() instead
    await page.evaluate(() => window.EventsCreate && window.EventsCreate.close && window.EventsCreate.close());
    await page.waitForTimeout(400);
    const sheetClosed = await page.evaluate(() => {
        const sheet = document.getElementById('ecSheet');
        return !sheet || !sheet.classList.contains('ec-open');
    });
    sheetClosed ? pass('Create Event sheet closed via EventsCreate.close()') : fail('Create Event sheet did not close');

    // ── No uncaught errors ────────────────────────────────────────
    console.log('\n── Console & network health ──────────────────────────────────────────────');

    uncaughtErrors.length === 0
        ? pass('No uncaught page errors')
        : fail(`${uncaughtErrors.length} uncaught page error(s)`, uncaughtErrors.join('; '));

    const filteredConsoleErrors = consoleErrors.filter(e =>
        !e.includes('member') && !e.includes('evtCurrentUser') && !e.includes('pre-existing')
        && !e.includes('tailwindcss.com') && !e.includes('Tailwind'));
    filteredConsoleErrors.length === 0
        ? pass('No relevant console errors')
        : fail(`${filteredConsoleErrors.length} console error(s)`, filteredConsoleErrors.slice(0, 3).join('; '));

    await browser.close();

    // ── Summary ───────────────────────────────────────────────────
    const total = passed + failed;
    console.log(`\n${'═'.repeat(54)}`);
    console.log(`Phase 3D E2E: ${total} checks — ${passed} pass, ${failed} fail`);
    console.log('═'.repeat(54));

    if (failed > 0) {
        console.log('\nFailed:');
        failures.forEach(f => console.log(`  ✗ ${f}`));
        console.log('\nPhase 3D E2E: NEEDS REVIEW');
        process.exit(1);
    } else {
        console.log('\nPhase 3D E2E: ALL PASS');
        process.exit(0);
    }
})();
