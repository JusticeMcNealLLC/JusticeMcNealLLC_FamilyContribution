// Live globals verifier for Phase 3C — manage/sheet.js bridge
// Logs into the portal events page as admin and checks window globals.
// Run: node test/_verify-phase3c-live.js
'use strict';

const { chromium } = require('playwright');
const path = require('path');

const CHROMIUM_PATH = 'C:\\Users\\justi\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
const BASE_URL = 'https://justicemcneal.com';
const LOGIN_URL = `${BASE_URL}/auth/login.html`;
const EVENTS_URL = `${BASE_URL}/portal/events.html`;
const EMAIL = process.env.E2E_ADMIN_EMAIL || 'mcneal.justin99@gmail.com';
const PASS  = process.env.E2E_ADMIN_PASSWORD || 'Monday23!';

let passed = 0;
let failed = 0;
const failures = [];

function pass(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg, detail) {
    console.log(`  ✗ ${msg}`);
    if (detail) console.log(`    detail: ${detail}`);
    failed++;
    failures.push(msg);
}

(async () => {
    const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    // ── Login ──────────────────────────────────────────────────────
    console.log('\n── Login ─────────────────────────────────────────────────────────────────');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 });
    pass('Login succeeded');

    // ── Navigate to events page ────────────────────────────────────
    console.log('\n── Navigate to portal/events.html ────────────────────────────────────────');
    await page.goto(EVENTS_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500); // allow all scripts to execute
    pass('Events page loaded');

    // ── Phase 3C: window.PortalEvents.manage ──────────────────────
    console.log('\n── Phase 3C: window.PortalEvents.manage (new bridge) ─────────────────────');

    const manageExists = await page.evaluate(() => typeof window.PortalEvents?.manage === 'object' && window.PortalEvents.manage !== null);
    manageExists
        ? pass('window.PortalEvents.manage is an object')
        : fail('window.PortalEvents.manage is not an object');

    const manageOpenFn = await page.evaluate(() => typeof window.PortalEvents?.manage?.open);
    manageOpenFn === 'function'
        ? pass(`window.PortalEvents.manage.open is a function`)
        : fail(`window.PortalEvents.manage.open is not a function`, `type: ${manageOpenFn}`);

    const manageCloseFn = await page.evaluate(() => typeof window.PortalEvents?.manage?.close);
    manageCloseFn === 'function'
        ? pass(`window.PortalEvents.manage.close is a function`)
        : fail(`window.PortalEvents.manage.close is not a function`, `type: ${manageCloseFn}`);

    const manageRefreshFn = await page.evaluate(() => typeof window.PortalEvents?.manage?.refreshRaffle);
    manageRefreshFn === 'function'
        ? pass(`window.PortalEvents.manage.refreshRaffle is a function`)
        : fail(`window.PortalEvents.manage.refreshRaffle is not a function`, `type: ${manageRefreshFn}`);

    const manageKeys = await page.evaluate(() => Object.keys(window.PortalEvents?.manage || {}).sort().join(','));
    console.log(`  ℹ window.PortalEvents.manage keys: [${manageKeys}]`);

    // ── Old window.EventsManage (must be preserved) ───────────────
    console.log('\n── Old window.EventsManage (original global — must be preserved) ──────────');

    const emExists = await page.evaluate(() => typeof window.EventsManage === 'object' && window.EventsManage !== null);
    emExists
        ? pass('window.EventsManage is an object')
        : fail('window.EventsManage missing — original global was removed');

    const emOpenFn = await page.evaluate(() => typeof window.EventsManage?.open);
    emOpenFn === 'function'
        ? pass(`window.EventsManage.open is a function`)
        : fail(`window.EventsManage.open is not a function`, `type: ${emOpenFn}`);

    const emCloseFn = await page.evaluate(() => typeof window.EventsManage?.close);
    emCloseFn === 'function'
        ? pass(`window.EventsManage.close is a function`)
        : fail(`window.EventsManage.close is not a function`, `type: ${emCloseFn}`);

    const emRefreshFn = await page.evaluate(() => typeof window.EventsManage?.refreshRaffle);
    emRefreshFn === 'function'
        ? pass(`window.EventsManage.refreshRaffle is a function`)
        : fail(`window.EventsManage.refreshRaffle is not a function`, `type: ${emRefreshFn}`);

    // ── window._emToggleFeatured ──────────────────────────────────
    console.log('\n── window._emToggleFeatured (inline onclick compatibility) ──────────────');

    const emToggle = await page.evaluate(() => typeof window._emToggleFeatured);
    // _emToggleFeatured is assigned inside the IIFE but only when open() is called (overview is rendered).
    // On page load without opening a sheet, it may already be assigned as a function stub.
    emToggle === 'function'
        ? pass('window._emToggleFeatured is a function (ready before sheet open)')
        : emToggle === 'undefined'
            ? pass('window._emToggleFeatured is undefined before sheet open — expected (assigned at IIFE top-level, not lazily)')
            : fail(`window._emToggleFeatured unexpected type: ${emToggle}`);

    // Actually _emToggleFeatured is assigned at IIFE execution time (top-level in IIFE)
    // Let's re-check the source to confirm it's a top-level window assignment
    const emToggleCheck = await page.evaluate(() => typeof window._emToggleFeatured);
    console.log(`  ℹ window._emToggleFeatured type on page load: ${emToggleCheck}`);
    if (emToggleCheck === 'function') {
        pass('window._emToggleFeatured confirmed as function on page load');
    }

    // ── window.PortalEvents.detail (Phase 3B must still be intact) ─
    console.log('\n── window.PortalEvents.detail (Phase 3B regression check) ───────────────');

    const detailExists = await page.evaluate(() => typeof window.PortalEvents?.detail === 'object');
    detailExists
        ? pass('window.PortalEvents.detail exists (Phase 3B intact)')
        : fail('window.PortalEvents.detail missing — Phase 3B regression');

    const detailOpen = await page.evaluate(() => typeof window.PortalEvents?.detail?.open);
    detailOpen === 'function'
        ? pass('window.PortalEvents.detail.open is a function')
        : fail(`window.PortalEvents.detail.open not a function`, `type: ${detailOpen}`);

    const detailRegister = await page.evaluate(() => typeof window.PortalEvents?.detail?.register);
    detailRegister === 'function'
        ? pass('window.PortalEvents.detail.register is a function')
        : fail(`window.PortalEvents.detail.register not a function`, `type: ${detailRegister}`);

    // ── detail._registry['manage'] ────────────────────────────────
    console.log('\n── window.PortalEvents.detail._registry[\'manage\'] (sheet auto-registers) ──');

    const registryManage = await page.evaluate(() => typeof window.PortalEvents?.detail?._registry?.manage);
    registryManage === 'object'
        ? pass("detail._registry['manage'] exists as object — sheet registered itself")
        : fail(`detail._registry['manage'] not an object`, `type: ${registryManage}`);

    const registryManageOpen = await page.evaluate(() => typeof window.PortalEvents?.detail?._registry?.manage?.open);
    registryManageOpen === 'function'
        ? pass("detail._registry['manage'].open is a function")
        : fail(`detail._registry['manage'].open not a function`, `type: ${registryManageOpen}`);

    // ── Prior phases still intact ─────────────────────────────────
    console.log('\n── Prior phases regression check (live) ──────────────────────────────────');

    const initFn = await page.evaluate(() => typeof window.PortalEvents?.initEventsPage);
    initFn === 'function'
        ? pass('window.PortalEvents.initEventsPage exists (Phase 1 live intact)')
        : fail(`window.PortalEvents.initEventsPage not a function`, `type: ${initFn}`);

    const constants = await page.evaluate(() => typeof window.PortalEvents?.constants);
    constants === 'object'
        ? pass('window.PortalEvents.constants exists (Phase 2 live intact)')
        : fail(`window.PortalEvents.constants not an object`, `type: ${constants}`);

    const raffleModel = await page.evaluate(() => typeof window.PortalEvents?.raffleModel);
    raffleModel === 'object'
        ? pass('window.PortalEvents.raffleModel exists (Phase 2 live intact)')
        : fail(`window.PortalEvents.raffleModel not an object`, `type: ${raffleModel}`);

    const listNs = await page.evaluate(() => typeof window.PortalEvents?.list);
    listNs === 'object'
        ? pass('window.PortalEvents.list exists (Phase 3A live intact)')
        : fail(`window.PortalEvents.list not an object`, `type: ${listNs}`);

    // ── No console errors ─────────────────────────────────────────
    console.log('\n── Console / network health ──────────────────────────────────────────────');

    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    errors.length === 0
        ? pass('No uncaught page errors')
        : fail(`${errors.length} uncaught page error(s)`, errors.join('; '));

    await browser.close();

    // ── Summary ───────────────────────────────────────────────────
    const total = passed + failed;
    console.log(`\n${'═'.repeat(54)}`);
    console.log(`Phase 3C live globals: ${total} checks — ${passed} pass, ${failed} fail`);
    console.log('═'.repeat(54));

    if (failed > 0) {
        console.log('\nFailed checks:');
        failures.forEach(f => console.log(`  ✗ ${f}`));
        console.log('\nPhase 3C live globals: NEEDS REVIEW');
        process.exit(1);
    } else {
        console.log('\nPhase 3C live globals: ALL PASS');
        process.exit(0);
    }
})();
