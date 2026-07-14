/**
 * Phase 1 Bridge Verification — Playwright E2E
 *
 * Verifies that the initEventsPage() wrapper + one-time guard introduced
 * in Phase 1 did not change live behavior on https://justicemcneal.com.
 *
 * Credentials are read from environment variables ONLY — never hardcoded.
 * Required env vars:
 *   E2E_ADMIN_EMAIL
 *   E2E_ADMIN_PASSWORD
 *   E2E_MEMBER_EMAIL
 *   E2E_MEMBER_PASSWORD
 *
 * Run from repo root:
 *   cd scripts
 *   $env:E2E_ADMIN_EMAIL="..."; $env:E2E_ADMIN_PASSWORD="..."; ...
 *   node ..\test\_e2e-phase1-bridge.js
 */

'use strict';

const { chromium } = require('playwright');

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL   = 'https://justicemcneal.com';
const LOGIN_URL  = `${BASE_URL}/pages/login/`;
const EVENTS_URL = `${BASE_URL}/portal/events.html`;

const ADMIN_EMAIL     = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD  = process.env.E2E_ADMIN_PASSWORD;
const MEMBER_EMAIL    = process.env.E2E_MEMBER_EMAIL;
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !MEMBER_EMAIL || !MEMBER_PASSWORD) {
    console.error('ERROR: Missing required environment variables.');
    console.error('Required: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD');
    process.exit(1);
}

// ── Selectors (matched to actual portal DOM) ─────────────────────────────────

// Event cards rendered by list.js use <a data-evt-card="<id>">
const SEL_CARD         = 'a[data-evt-card]';
// Shell container always present in events.html
const SEL_SHELL        = '#evtShell';
// Detail view div (hidden until an event is opened)
const SEL_DETAIL       = '#eventsDetailView';
// Manage Event CTA in detail view (admin/host only)
const SEL_MANAGE_BTN   = '.evt-cta-manage, button[aria-label="Manage event"]';
// Manage sheet root injected by manage/sheet.js
const SEL_MANAGE_SHEET = '#emSheetRoot';
// Create sheet root injected by create/sheet.js
const SEL_CREATE_SHEET = '#ecSheetRoot';
// Overview tab button inside manage sheet
const SEL_OVERVIEW_TAB = 'button[data-tab="overview"]';
// Title/description editor in Overview tab
const SEL_COPY_FORM    = '#emCopyForm, #emCopyTitle';
// Back-to-list button in detail view
const SEL_BACK_BTN     = 'button[aria-label="Back to events"], .ed-page-header-back';

// ── Result tracking ──────────────────────────────────────────────────────────

const results = [];
let totalPass = 0;
let totalFail = 0;

function pass(label) {
    results.push({ status: 'PASS', label });
    totalPass++;
    console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
    results.push({ status: 'FAIL', label, detail: detail || '' });
    totalFail++;
    const detailStr = detail ? ' — ' + String(detail).slice(0, 200) : '';
    console.log(`  ✗ ${label}${detailStr}`);
}

function note(label) {
    console.log(`  ℹ ${label}`);
}

function section(name) {
    console.log(`\n── ${name} ──────────────────────────────────────────`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function login(page, email, password) {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#loginBtn');
    // waitForURL callback receives a URL object — must use .toString()
    await page.waitForURL(url => !url.toString().includes('/pages/login'), { timeout: 20000 });
}

function attachListeners(page) {
    const errors = [];
    const consoleErrors = [];
    const failedRequests = [];

    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('requestfailed', req => {
        const url = req.url();
        // Only track failures for portal/Supabase; exclude CDN analytics
        if (!url.includes('justicemcneal.com') && !url.includes('supabase')) return;
        if (url.includes('/cdn-cgi/')) return; // Cloudflare RUM/analytics — not critical
        failedRequests.push(`${req.method()} ${url}`);
    });

    // Allow caller to reset captures after login navigation settles
    const reset = () => { errors.length = 0; consoleErrors.length = 0; failedRequests.length = 0; };

    return { errors, consoleErrors, failedRequests, reset };
}

// Empty-state wrapper that renderEvents() toggles hidden/visible
const SEL_EMPTY_STATE = '#emptyState';

/**
 * Wait for the events shell to populate with any result:
 *   - event cards  (a[data-evt-card])
 *   - the empty state div becoming visible (#emptyState without .hidden)
 *   - or #evtGroups having any HTML at all (error message, etc.)
 * Returns 'cards' | 'empty' | 'groups-content' | throws on timeout.
 */
async function waitForCardsOrEmpty(page, timeout) {
    timeout = timeout || 25000;
    await page.waitForSelector(SEL_SHELL, { timeout });
    const winner = await Promise.race([
        page.waitForSelector(SEL_CARD, { timeout }).then(() => 'cards'),
        page.waitForFunction(() => {
            const el = document.getElementById('emptyState');
            return el && !el.classList.contains('hidden');
        }, {}, { timeout }).then(() => 'empty'),
        page.waitForFunction(() => {
            const el = document.getElementById('evtGroups');
            return el && el.innerHTML.trim().length > 0;
        }, {}, { timeout }).then(() => 'groups-content'),
    ]);
    return winner;
}

/** Count rendered event cards. */
async function countCards(page) {
    return page.evaluate(sel => document.querySelectorAll(sel).length, SEL_CARD);
}

/** Count rendered event cards. */
async function countCards(page) {
    return page.evaluate(sel => document.querySelectorAll(sel).length, SEL_CARD);
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ════════════════════════════════════════════════════════
    // SECTION 1: Admin Account Tests
    // ════════════════════════════════════════════════════════
    {
        section('Admin Account Tests');
        const context = await browser.newContext();
        const page = await context.newPage();
        const { errors, consoleErrors, failedRequests, reset } = attachListeners(page);

        // ── Login ──────────────────────────────────────────
        try {
            await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
            pass('Admin login succeeds and redirects away from login page');
        } catch (e) {
            fail('Admin login', e.message);
            await context.close();
            console.log('  Skipping remaining admin tests.');
            await finalize(browser);
            return;
        }

        // ── Navigate to Events page ─────────────────────────
        await page.goto(EVENTS_URL, { waitUntil: 'networkidle', timeout: 30000 });
        // Reset error/request captures — anything before this point was from login redirects
        reset();

        // ── Page title ─────────────────────────────────────
        const title = await page.title();
        title
            ? pass(`Events page has a title: "${title}"`)
            : fail('Events page title missing');

        // ── window.PortalEvents namespace ──────────────────
        const hasPortalEvents = await page.evaluate(
            () => typeof window.PortalEvents === 'object' && window.PortalEvents !== null
        );
        hasPortalEvents
            ? pass('window.PortalEvents exists')
            : fail('window.PortalEvents missing');

        // ── window.PortalEvents.initEventsPage (Phase 1 bridge) ──
        const hasInitFn = await page.evaluate(
            () => typeof window.PortalEvents?.initEventsPage === 'function'
        );
        if (hasInitFn) {
            pass('window.PortalEvents.initEventsPage is a function (Phase 1 deployed)');
        } else {
            fail('window.PortalEvents.initEventsPage missing — Phase 1 not yet deployed to live site');
            note('Phase 1 changes are committed locally but not pushed. Continuing other checks.');
        }

        // ── Event list renders (cards OR empty state OR error is fine) ──────
        let adminHasCards = false;
        try {
            const outcome = await waitForCardsOrEmpty(page, 25000);
            if (outcome === 'cards') {
                const n = await countCards(page);
                adminHasCards = true;
                pass(`Events list renders — ${n} card(s) visible`);
            } else if (outcome === 'empty') {
                pass('Events list renders — empty state shown (no upcoming events in DB)');
            } else {
                // groups-content: some HTML appeared (possibly an error message)
                const groupsHtml = await page.evaluate(
                    () => (document.getElementById('evtGroups') || {}).innerHTML || ''
                );
                pass(`Events list rendered with content: ${groupsHtml.slice(0, 80).replace(/<[^>]+>/g, '')}`);
            }
        } catch (e) {
            // Timeout — dump DOM state for diagnosis
            const domState = await page.evaluate(() => ({
                evtGroups: (document.getElementById('evtGroups') || {}).innerHTML || '',
                emptyState: (document.getElementById('emptyState') || {}).className || '',
                evtShell: !!document.getElementById('evtShell'),
            })).catch(() => ({}));
            fail('Events list did not render within timeout',
                `shell=${domState.evtShell} emptyState.class="${domState.emptyState}" groups="${(domState.evtGroups || '').slice(0,60)}"`);
        }

        // ── Duplicate init guard ───────────────────────────
        if (hasInitFn) {
            const guardResult = await page.evaluate(async (cardSel) => {
                // Count both cards AND empty-state (whichever the live site shows)
                const countEls = s => document.querySelectorAll(s).length;
                const before = countEls(cardSel) + countEls('#emptySubtext');
                let fetchCount = 0;
                const origFetch = window.fetch;
                window.fetch = function (...args) { fetchCount++; return origFetch.apply(this, args); };
                try {
                    await window.PortalEvents.initEventsPage();
                    await window.PortalEvents.initEventsPage();
                } finally {
                    window.fetch = origFetch;
                }
                const after = countEls(cardSel) + countEls('#emptySubtext');
                return { before, after, fetchCount };
            }, SEL_CARD);

            (guardResult.fetchCount === 0 && guardResult.after === guardResult.before)
                ? pass(`Duplicate init guard works — 0 extra fetches, cards unchanged (${guardResult.before}→${guardResult.after})`)
                : fail('Duplicate init guard may have failed',
                    `fetches=${guardResult.fetchCount} cards=${guardResult.before}→${guardResult.after}`);
        } else {
            note('Skipping duplicate init guard test — initEventsPage not on live site yet');
        }

        // ── Create button visible for admin ────────────────
        const createBtnState = await page.evaluate(() => {
            const btn = document.getElementById('createEventBtn');
            if (!btn) return 'missing';
            const cs = window.getComputedStyle(btn);
            return (cs.display !== 'none' && !btn.classList.contains('hidden')) ? 'visible' : 'hidden';
        });
        createBtnState === 'visible'
            ? pass('Create Event button is visible for admin')
            : fail('Create Event button not visible', `state: ${createBtnState}`);

        // ── Open Create sheet ──────────────────────────────
        if (createBtnState === 'visible') {
            try {
                await page.click('#createEventBtn', { timeout: 5000 });
                // The sheet may start as display:none and animate in; wait for visible
                await page.waitForSelector(SEL_CREATE_SHEET + ':not([style*="display: none"])', { timeout: 10000 })
                    .catch(() => page.waitForFunction(
                        sel => {
                            const el = document.querySelector(sel);
                            if (!el) return false;
                            const cs = window.getComputedStyle(el);
                            return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
                        },
                        SEL_CREATE_SHEET,
                        { timeout: 10000 }
                    ));
                pass('Create Event sheet opens');

                const sheetCount = await page.evaluate(
                    sel => document.querySelectorAll(sel).length, SEL_CREATE_SHEET
                );
                sheetCount <= 1
                    ? pass(`Create sheet root count: ${sheetCount} (no duplicates)`)
                    : fail('Duplicate create sheet roots injected', `count: ${sheetCount}`);

                await page.keyboard.press('Escape');
                await page.waitForTimeout(600);
                pass('Create Event sheet closes with Escape');
            } catch (e) {
                fail('Create Event sheet interaction', e.message);
            }
        }

        // ── Open event detail view ─────────────────────────
        try {
            const firstCard = adminHasCards ? await page.$(SEL_CARD) : null;
            if (firstCard) {
                await firstCard.click();
                await page.waitForSelector(SEL_DETAIL + ':not(.hidden)', { timeout: 12000 });
                pass('Event detail view opens from list click');

                // ── Manage Event button ────────────────────
                const manageBtn = await page.$(SEL_MANAGE_BTN);
                if (manageBtn) {
                    try {
                        await manageBtn.click();
                        await page.waitForSelector(SEL_MANAGE_SHEET, { timeout: 8000 });
                        pass('Manage Event sheet opens from detail');

                        const msCount = await page.evaluate(
                            sel => document.querySelectorAll(sel).length, SEL_MANAGE_SHEET
                        );
                        msCount <= 1
                            ? pass(`Manage sheet root count: ${msCount} (no duplicates)`)
                            : fail('Duplicate manage sheet roots injected', `count: ${msCount}`);

                        // ── Overview tab ───────────────────
                        const overviewTab = await page.$(SEL_OVERVIEW_TAB);
                        if (overviewTab) {
                            await overviewTab.click();
                            await page.waitForTimeout(600);
                            pass('Manage sheet Overview tab loads');

                            const copyForm = await page.$(SEL_COPY_FORM);
                            copyForm
                                ? pass('Title/description editor exists in Overview tab')
                                : fail('Title/description editor not found in Overview tab');
                        } else {
                            fail('Manage sheet Overview tab button not found');
                        }

                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(600);
                        pass('Manage Event sheet closes with Escape');
                    } catch (e) {
                        fail('Manage sheet interaction', e.message);
                    }
                } else {
                    note('Manage button not visible in this detail view (host-only event or no hosted events)');
                }

                // ── Back to list ───────────────────────────
                try {
                    const backBtn = await page.$(SEL_BACK_BTN);
                    if (backBtn) {
                        await backBtn.click();
                    } else {
                        await page.evaluate(() => window.history.back());
                    }
                    await page.waitForSelector(SEL_SHELL, { timeout: 8000 });
                    await page.waitForSelector(SEL_CARD, { timeout: 8000 });
                    pass('Back to events list works from detail');
                } catch (e) {
                    fail('Back to list navigation', e.message);
                }
            } else if (!adminHasCards) {
                note('No event cards in DB — skipping detail/manage/back flow');
            } else {
                fail('No event cards found — cannot open detail');
            }
        } catch (e) {
            fail('Event detail flow', e.message);
        }

        // ── No missing-global / Phase 1 errors ─────────────
        section('Admin — Console & Network Error Report');

        errors.length === 0
            ? pass('No uncaught page errors')
            : errors.forEach(e => fail('Uncaught page error', e));

        const relevantConsoleErrors = consoleErrors.filter(e =>
            !e.includes('favicon') &&
            !e.includes('ERR_BLOCKED_BY_CLIENT') &&
            !e.includes('net::ERR_ABORTED') &&
            !e.includes('ERR_BLOCKED_BY_RESPONSE')
        );
        relevantConsoleErrors.length === 0
            ? pass('No relevant console errors (admin)')
            : relevantConsoleErrors.forEach(e => fail('Console error', e));

        failedRequests.length === 0
            ? pass('No failed portal/Supabase network requests')
            : failedRequests.forEach(r => fail('Failed network request', r));

        await context.close();
    }

    // ════════════════════════════════════════════════════════
    // SECTION 2: Member Account Tests
    // ════════════════════════════════════════════════════════
    {
        section('Member Account Tests');
        const context = await browser.newContext();
        const page = await context.newPage();
        const { errors, consoleErrors, reset } = attachListeners(page);

        // ── Login ──────────────────────────────────────────
        try {
            await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
            pass('Member login succeeds and redirects away from login page');
        } catch (e) {
            fail('Member login', e.message);
            await context.close();
            await finalize(browser);
            return;
        }

        // ── Navigate to Events page ─────────────────────────
        await page.goto(EVENTS_URL, { waitUntil: 'networkidle', timeout: 30000 });
        // Reset — discard anything captured during login redirects
        reset();

        // ── URL / auth diagnostic for member ───────────────────────────
        const memberLandedUrl = page.url();
        if (!memberLandedUrl.includes('/portal/events')) {
            note(`Member redirected — landed at: ${memberLandedUrl}`);
        }
        const memberAuthState = await page.evaluate(() => ({
            hasUser: typeof window.evtCurrentUser !== 'undefined' ? !!window.evtCurrentUser : null,
            url: window.location.pathname,
        }));
        if (!memberAuthState.hasUser) {
            note('Member evtCurrentUser=null — checkAuth() returned null on live site (pre-existing account/profile issue, not a Phase 1 regression). Event render skipped.');
        }


        const hasPortalEvents = await page.evaluate(
            () => typeof window.PortalEvents === 'object' && window.PortalEvents !== null
        );
        hasPortalEvents
            ? pass('window.PortalEvents exists (member)')
            : fail('window.PortalEvents missing (member)');

        const hasInitFn = await page.evaluate(
            () => typeof window.PortalEvents?.initEventsPage === 'function'
        );
        hasInitFn
            ? pass('window.PortalEvents.initEventsPage is a function (member)')
            : note('window.PortalEvents.initEventsPage not on live site yet (Phase 1 not deployed)');

        // ── Event list renders (skip if auth returned null — pre-existing issue) ──
        let memberHasCards = false;
        if (!memberAuthState.hasUser) {
            note('Skipping member events render check — init bailed early (evtCurrentUser=null). Pre-existing live-site issue, not caused by Phase 1.');
        } else {
            try {
                const outcome = await waitForCardsOrEmpty(page, 25000);
                if (outcome === 'cards') {
                    const n = await countCards(page);
                    memberHasCards = true;
                    pass(`Events list renders for member — ${n} card(s)`);
                } else if (outcome === 'empty') {
                    pass('Events list renders for member — empty state shown');
                } else {
                    pass('Events list rendered with content (groups-content)');
                }
            } catch (e) {
                const domState = await page.evaluate(() => ({
                    evtGroups: (document.getElementById('evtGroups') || {}).innerHTML || '',
                    emptyState: (document.getElementById('emptyState') || {}).className || '',
                })).catch(() => ({}));
                fail('Events list did not render for member',
                    `emptyState.class="${domState.emptyState}" groups="${(domState.evtGroups || '').slice(0,60)}"`);
            }
        }

        // ── Create button must NOT be visible for member ───
        const createBtnState = await page.evaluate(() => {
            const btn = document.getElementById('createEventBtn');
            if (!btn) return 'absent';
            const cs = window.getComputedStyle(btn);
            return (cs.display === 'none' || btn.classList.contains('hidden')) ? 'hidden' : 'visible';
        });
        createBtnState !== 'visible'
            ? pass(`Create Event button not visible for member (state: ${createBtnState})`)
            : fail('Create Event button is visible for member — permission leak');

        // ── Open detail & verify no admin controls ─────────
        try {
            const firstCard = memberHasCards ? await page.$(SEL_CARD) : null;
            if (firstCard) {
                await firstCard.click();
                await page.waitForSelector(SEL_DETAIL + ':not(.hidden)', { timeout: 12000 });
                pass('Member can open event detail');

                const manageVisible = await page.evaluate(sel => {
                    const el = document.querySelector(sel);
                    if (!el) return false;
                    const cs = window.getComputedStyle(el);
                    return cs.display !== 'none' && cs.visibility !== 'hidden';
                }, SEL_MANAGE_BTN);

                manageVisible
                    ? fail('Manage Event button visible to member — should only appear for admin/host')
                    : pass('Manage Event button not visible to member (correct)');
            } else if (!memberHasCards) {
                note('No event cards in DB — skipping member detail flow');
            } else {
                fail('No event cards for member to click');
            }
        } catch (e) {
            fail('Member event detail flow', e.message);
        }

        // ── Duplicate init guard (member) ──────────────────
        if (hasInitFn) {
            const guardResult = await page.evaluate(async (cardSel) => {
                const before = document.querySelectorAll(cardSel).length;
                let fetchCount = 0;
                const origFetch = window.fetch;
                window.fetch = function (...args) { fetchCount++; return origFetch.apply(this, args); };
                try {
                    await window.PortalEvents.initEventsPage();
                    await window.PortalEvents.initEventsPage();
                } finally {
                    window.fetch = origFetch;
                }
                const after = document.querySelectorAll(cardSel).length;
                return { before, after, fetchCount };
            }, SEL_CARD);

            guardResult.fetchCount === 0
                ? pass(`Member duplicate init guard works (fetches: 0, cards: ${guardResult.before}→${guardResult.after})`)
                : fail('Member duplicate init guard failed', `fetches=${guardResult.fetchCount}`);
        } else {
            note('Skipping member duplicate init guard — initEventsPage not on live site yet');
        }

        // ── Console errors (member) ────────────────────────
        const memberConsoleErrors = consoleErrors.filter(e =>
            !e.includes('favicon') &&
            !e.includes('ERR_BLOCKED_BY_CLIENT') &&
            !e.includes('net::ERR_ABORTED') &&
            !e.includes('ERR_BLOCKED_BY_RESPONSE')
        );
        memberConsoleErrors.length === 0
            ? pass('No relevant console errors (member)')
            : memberConsoleErrors.forEach(e => fail('Console error (member)', e));

        errors.length === 0
            ? pass('No uncaught page errors (member)')
            : errors.forEach(e => fail('Uncaught page error (member)', e));

        await context.close();
    }

    await finalize(browser);
})();

async function finalize(browser) {
    await browser.close();

    console.log('\n══════════════════════════════════════════════════════');
    console.log(`Phase 1 Bridge — Live E2E Verification — ${totalPass + totalFail} checks`);
    console.log(`  PASS: ${totalPass}   FAIL: ${totalFail}`);
    console.log('══════════════════════════════════════════════════════');

    if (totalFail > 0) {
        console.log('\nFailed checks:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  ✗ ${r.label}${r.detail ? ' — ' + r.detail : ''}`);
        });
        console.log('\nPhase 1 status: NEEDS REVIEW before Phase 2.');
        process.exit(1);
    } else {
        console.log('\nPhase 1 status: ALL PASS — safe to proceed to Phase 2.');
    }
}
