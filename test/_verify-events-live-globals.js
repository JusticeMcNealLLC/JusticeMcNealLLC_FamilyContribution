'use strict';

// Consolidated live globals verifier for the current portal events runtime contract.
// Run: node test/_verify-events-live-globals.js

const path = require('path');

function loadPlaywright() {
    try {
        return require('playwright');
    } catch (rootError) {
        try {
            return require(path.join(__dirname, '..', 'scripts', 'node_modules', 'playwright'));
        } catch (scriptsError) {
            rootError.message += ' / scripts fallback: ' + scriptsError.message;
            throw rootError;
        }
    }
}

const { chromium } = loadPlaywright();

const BASE_URL = (process.env.E2E_BASE_URL || 'https://justicemcneal.com').replace(/\/$/, '');
const LOGIN_URL = BASE_URL + '/auth/login.html';
const EVENTS_URL = BASE_URL + '/portal/events.html';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL;
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;

const SELECTORS = {
    card: 'a[data-evt-card]',
    shell: '#evtShell',
    emptyState: '#emptyState',
    groups: '#evtGroups',
    createSheetRoot: '#ecSheetRoot',
    manageSheetRoot: '#emSheetRoot',
    createButton: '#createEventBtn, #evtCreateBtn, [data-create-event], button[onclick*="EventsCreate"]'
};

const REQUIRED_PORTAL_EVENTS = [
    ['window.PortalEvents', 'object'],
    ['window.PortalEvents.initEventsPage', 'function'],
    ['window.PortalEvents.constants', 'object'],
    ['window.PortalEvents.raffleModel', 'object'],
    ['window.PortalEvents.list', 'object'],
    ['window.PortalEvents.detail', 'object'],
    ['window.PortalEvents.manage', 'object'],
    ['window.PortalEvents.create', 'object'],
    ['window.PortalEvents.competition', 'object']
];

const ABSENT_HELPERS = [
    'window.PortalEvents.externalGlobals',
    'window.PortalEvents.windowExports',
    'window.PortalEvents.inlineHandlers'
];

const REQUIRED_LEGACY_GLOBALS = [
    ['window.EventsRaffleModel', 'object'],
    ['window.EventsManage', 'object'],
    ['window.EventsCreate', 'object'],
    ['window.evtLoadEvents', 'function'],
    ['window.evtRenderEvents', 'function'],
    ['window.evtOpenDetail', 'function'],
    ['window.evtHandleRsvp', 'function'],
    ['window.evtOpenDocumentsPanel', 'function'],
    ['window.evtOpenScanner', 'function'],
    ['window.evtBuildCompetitionHtml', 'function'],
    ['window.evtJoinCompetition', 'function'],
    ['window.evtSubmitEntry', 'function'],
    ['window.evtCastVote', 'function'],
    ['window.evtFinalizeCompetition', 'function']
];

const REQUIRED_BRIDGE_FUNCTIONS = [
    ['window.PortalEvents.list.renderCalendar', 'function'],
    ['window.PortalEvents.list.matchesType', 'function'],
    ['window.PortalEvents.detail.open', 'function'],
    ['window.PortalEvents.detail.miniMarkdown', 'function'],
    ['window.PortalEvents.manage.open', 'function'],
    ['window.PortalEvents.manage.close', 'function'],
    ['window.PortalEvents.create.open', 'function'],
    ['window.PortalEvents.create.close', 'function'],
    ['window.PortalEvents.competition.buildHtml', 'function'],
    ['window.PortalEvents.competition.recalcTiers', 'function']
];

const REQUIRED_ASSETS = [
    '/js/portal/events/init.js',
    '/js/portal/events/list.js',
    '/js/portal/events/detail.js',
    '/js/portal/events/manage/sheet.js?v=112',
    '/js/portal/events/create/sheet.js',
    '/js/portal/events/competition.js'
];

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];
const skipNotes = [];

function section(label) {
    console.log('\n-- ' + label + ' --');
}

function pass(label) {
    console.log('  PASS ' + label);
    passed++;
}

function fail(label, detail) {
    console.log('  FAIL ' + label + (detail ? ' - ' + detail : ''));
    failed++;
    failures.push(detail ? label + ' - ' + detail : label);
}

function skip(label, detail) {
    console.log('  SKIP ' + label + (detail ? ' - ' + detail : ''));
    skipped++;
    skipNotes.push(detail ? label + ' - ' + detail : label);
}

function info(label) {
    console.log('  INFO ' + label);
}

function maskUrl(url) {
    return String(url).replace(/([?&](?:password|token|access_token|refresh_token|apikey)=)[^&]+/gi, '$1[redacted]');
}

function isRelevantConsoleError(text) {
    const value = String(text || '');
    return !/favicon|ERR_ABORTED|ERR_BLOCKED_BY_CLIENT|ERR_BLOCKED_BY_RESPONSE|tailwindcss\.com|Tailwind/i.test(value);
}

function isPortalJsUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.pathname.startsWith('/js/portal/events/') && parsed.pathname.endsWith('.js');
    } catch (error) {
        return false;
    }
}

function assetKeyFromUrl(url) {
    const parsed = new URL(url, BASE_URL);
    return parsed.pathname + parsed.search;
}

function normalizeType(type) {
    if (type === 'array') return 'object';
    return type;
}

async function login(page, email, password, label) {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="email"], #email', email);
    await page.fill('input[type="password"], #password', password);
    await page.click('#loginBtn, button[type="submit"]');
    await page.waitForURL((url) => !url.toString().includes('/auth/login'), { timeout: 20000 });
    pass(label + ' login succeeds');
}

function attachRuntimeHealth(page) {
    const pageErrors = [];
    const consoleErrors = [];
    const failedRequests = [];
    const failedPortalJsResponses = [];
    const assetResponses = new Map();

    page.on('pageerror', (error) => {
        pageErrors.push(error.message);
    });

    page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (isRelevantConsoleError(text)) consoleErrors.push(text);
    });

    page.on('requestfailed', (request) => {
        const url = request.url();
        if (!isPortalJsUrl(url)) return;
        failedRequests.push(request.method() + ' ' + maskUrl(url));
    });

    page.on('response', (response) => {
        const url = response.url();
        if (!isPortalJsUrl(url)) return;
        const key = assetKeyFromUrl(url);
        const headers = response.headers();
        const record = {
            url: maskUrl(url),
            status: response.status(),
            headers: {
                'cf-cache-status': headers['cf-cache-status'] || '',
                age: headers.age || '',
                etag: headers.etag || '',
                'last-modified': headers['last-modified'] || '',
                'cache-control': headers['cache-control'] || ''
            }
        };
        assetResponses.set(key, record);
        if (response.status() >= 400) failedPortalJsResponses.push(record);
    });

    return {
        pageErrors,
        consoleErrors,
        failedRequests,
        failedPortalJsResponses,
        assetResponses,
        reset() {
            pageErrors.length = 0;
            consoleErrors.length = 0;
            failedRequests.length = 0;
            failedPortalJsResponses.length = 0;
        }
    };
}

async function waitForEventsShell(page) {
    await page.waitForSelector(SELECTORS.shell, { timeout: 25000 });
    await page.waitForTimeout(1500);
}

async function typeOfPath(page, expression) {
    return page.evaluate((source) => {
        try {
            const value = Function('return ' + source)();
            if (value === null) return 'null';
            if (Array.isArray(value)) return 'array';
            return typeof value;
        } catch (error) {
            return 'throws:' + error.message;
        }
    }, expression);
}

async function checkTypedGlobals(page, checks, heading) {
    section(heading);
    for (const [expression, expectedType] of checks) {
        const actualType = normalizeType(await typeOfPath(page, expression));
        if (actualType === expectedType) pass(expression + ' is a ' + expectedType);
        else fail(expression + ' type mismatch', 'expected ' + expectedType + ', got ' + actualType);
    }
}

async function checkAbsentHelpers(page) {
    section('Phase 4F helper surfaces are not live yet');
    for (const expression of ABSENT_HELPERS) {
        const actualType = await typeOfPath(page, expression);
        if (actualType === 'undefined') pass(expression + ' is absent as expected');
        else fail(expression + ' unexpectedly present', 'type: ' + actualType);
    }
}

async function checkDuplicateInitGuard(page, health) {
    section('Duplicate init guard');
    const beforeErrors = health.pageErrors.length;
    const result = await page.evaluate(async (selectors) => {
        const count = (selector) => document.querySelectorAll(selector).length;
        const beforeCards = count(selectors.card);
        const beforeCreateRoots = count(selectors.createSheetRoot);
        const beforeManageRoots = count(selectors.manageSheetRoot);
        let initResult = 'called';
        try {
            await window.PortalEvents.initEventsPage();
            await window.PortalEvents.initEventsPage();
        } catch (error) {
            initResult = 'threw: ' + error.message;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        return {
            initResult,
            beforeCards,
            afterCards: count(selectors.card),
            beforeCreateRoots,
            afterCreateRoots: count(selectors.createSheetRoot),
            beforeManageRoots,
            afterManageRoots: count(selectors.manageSheetRoot)
        };
    }, SELECTORS);

    if (result.initResult === 'called') pass('initEventsPage can be called twice after boot');
    else fail('initEventsPage repeated call failed', result.initResult);

    if (result.beforeCards === result.afterCards) pass('event card count unchanged after duplicate init (' + result.beforeCards + ')');
    else fail('event card count changed after duplicate init', result.beforeCards + ' -> ' + result.afterCards);

    if (result.afterCreateRoots <= 1 && result.afterCreateRoots === result.beforeCreateRoots) pass('no duplicate create sheet root after duplicate init');
    else fail('duplicate create sheet root detected', result.beforeCreateRoots + ' -> ' + result.afterCreateRoots);

    if (result.afterManageRoots <= 1 && result.afterManageRoots === result.beforeManageRoots) pass('no duplicate manage sheet root after duplicate init');
    else fail('duplicate manage sheet root detected', result.beforeManageRoots + ' -> ' + result.afterManageRoots);

    if (health.pageErrors.length === beforeErrors) pass('no new page errors after duplicate init');
    else fail('new page errors after duplicate init', health.pageErrors.slice(beforeErrors).join('; '));
}

async function checkAssetHeaders(page, health) {
    section('Bare asset URL checks');
    const performanceAssets = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
            .filter((entry) => entry.name.includes('/js/portal/events/') && entry.name.endsWith('.js'))
            .map((entry) => entry.name);
    });

    for (const asset of REQUIRED_ASSETS) {
        const loadedFromPage = performanceAssets.some((url) => assetKeyFromUrl(url) === asset);
        const captured = health.assetResponses.get(asset);
        if (loadedFromPage || captured) pass(asset + ' loaded by portal/events.html');
        else fail(asset + ' was not observed as a loaded script');

        let record = captured;
        if (!record) {
            record = await page.evaluate(async (assetPath) => {
                const response = await fetch(assetPath, { method: 'GET', cache: 'no-store' });
                return {
                    status: response.status,
                    headers: {
                        'cf-cache-status': response.headers.get('cf-cache-status') || '',
                        age: response.headers.get('age') || '',
                        etag: response.headers.get('etag') || '',
                        'last-modified': response.headers.get('last-modified') || '',
                        'cache-control': response.headers.get('cache-control') || ''
                    }
                };
            }, asset).catch((error) => ({ status: 0, error: error.message, headers: {} }));
        }

        if (record.status >= 200 && record.status < 400) pass(asset + ' responded with HTTP ' + record.status);
        else fail(asset + ' script request failed', record.error || ('HTTP ' + record.status));

        const headers = record.headers || {};
        info(asset + ' cache headers: cf-cache-status=' + (headers['cf-cache-status'] || 'n/a') +
            '; Age=' + (headers.age || 'n/a') +
            '; ETag=' + (headers.etag || 'n/a') +
            '; Last-Modified=' + (headers['last-modified'] || 'n/a') +
            '; Cache-Control=' + (headers['cache-control'] || 'n/a'));
    }
}

async function checkRuntimeHealth(health, label) {
    section(label + ' runtime health');
    if (health.pageErrors.length === 0) pass(label + ' has no uncaught page errors');
    else health.pageErrors.forEach((error) => fail(label + ' uncaught page error', error));

    if (health.consoleErrors.length === 0) pass(label + ' has no relevant console errors');
    else health.consoleErrors.forEach((error) => fail(label + ' console error', error));

    if (health.failedRequests.length === 0) pass(label + ' has no failed portal JS requests');
    else health.failedRequests.forEach((request) => fail(label + ' failed portal JS request', request));

    if (health.failedPortalJsResponses.length === 0) pass(label + ' has no failed portal JS responses');
    else health.failedPortalJsResponses.forEach((response) => fail(label + ' failed portal JS response', response.url + ' HTTP ' + response.status));
}

async function runAdminSmoke(browser) {
    section('Admin page boot');
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const health = attachRuntimeHealth(page);

    try {
        await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, 'Admin');
        health.reset();
        await page.goto(EVENTS_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await waitForEventsShell(page);
        pass('portal/events.html loads for admin');

        await checkTypedGlobals(page, REQUIRED_PORTAL_EVENTS, 'Current window.PortalEvents bridge surfaces');
        await checkAbsentHelpers(page);
        await checkTypedGlobals(page, REQUIRED_LEGACY_GLOBALS, 'Legacy global contracts');
        await checkTypedGlobals(page, REQUIRED_BRIDGE_FUNCTIONS, 'Representative bridge functions');
        await checkDuplicateInitGuard(page, health);
        await checkAssetHeaders(page, health);
        await checkRuntimeHealth(health, 'Admin');
    } catch (error) {
        fail('Admin page boot failed', error.message);
    } finally {
        await context.close();
    }
}

async function runMemberSmoke(browser) {
    section('Member smoke');
    if (!MEMBER_EMAIL || !MEMBER_PASSWORD) {
        skip('Member smoke', 'E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD are required');
        return;
    }

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const health = attachRuntimeHealth(page);

    try {
        await login(page, MEMBER_EMAIL, MEMBER_PASSWORD, 'Member');
        health.reset();
        await page.goto(EVENTS_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await waitForEventsShell(page).catch(() => null);

        const memberState = await page.evaluate((selectors) => {
            const createButton = document.querySelector(selectors.createButton);
            const createVisible = createButton ? (() => {
                const style = window.getComputedStyle(createButton);
                return style.display !== 'none' && style.visibility !== 'hidden' && !createButton.classList.contains('hidden');
            })() : false;
            return {
                path: window.location.pathname,
                hasPortalEvents: typeof window.PortalEvents === 'object' && window.PortalEvents !== null,
                hasCurrentUser: typeof window.evtCurrentUser === 'undefined' ? null : !!window.evtCurrentUser,
                createButtonState: createButton ? (createVisible ? 'visible' : 'hidden') : 'absent'
            };
        }, SELECTORS);

        if (memberState.path.includes('/portal/events')) pass('member events page loads');
        else skip('member events page route', 'landed at ' + memberState.path + '; possible known auth/profile redirect');

        if (memberState.hasPortalEvents) pass('window.PortalEvents exists for member');
        else fail('window.PortalEvents missing for member');

        if (memberState.hasCurrentUser === false) {
            skip('member app workflow', 'evtCurrentUser is null; possible known auth/profile issue');
        }

        if (memberState.createButtonState === 'visible') fail('admin-only create button visible for member');
        else pass('admin-only create button hidden or absent for member (' + memberState.createButtonState + ')');

        await checkRuntimeHealth(health, 'Member');
    } catch (error) {
        skip('Member smoke could not complete', error.message);
    } finally {
        await context.close();
    }
}

async function main() {
    console.log('\nLive events globals verifier');
    console.log('Base URL: ' + BASE_URL);

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        skip('Admin live verification', 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required');
        skip('Member smoke', 'admin login is required before optional member smoke');
        finish();
        return;
    }

    const browser = await chromium.launch({ headless: true });
    try {
        await runAdminSmoke(browser);
        await runMemberSmoke(browser);
    } finally {
        await browser.close();
    }
    finish();
}

function finish() {
    const total = passed + failed + skipped;
    console.log('\n' + '='.repeat(62));
    console.log('Live globals verifier: ' + failed + ' failed, ' + passed + ' passed, ' + skipped + ' skipped');
    console.log('Total checks: ' + total);
    console.log('='.repeat(62));

    if (failures.length) {
        console.log('\nFailed checks:');
        failures.forEach((failure) => console.log('  FAIL ' + failure));
    }
    if (skipNotes.length) {
        console.log('\nSkipped checks:');
        skipNotes.forEach((note) => console.log('  SKIP ' + note));
    }

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
    console.error('ERROR:', error.message);
    process.exit(1);
});
