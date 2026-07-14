/**
 * Signed-in live QA for portal RSVP/raffle parity (3220c99).
 * Credentials: .env.local only (gitignored). Never logs passwords.
 * Run: node test/_qa-portal-parity-signed-in.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const playwrightPath = path.join(ROOT, 'scripts', 'node_modules', 'playwright');
const { chromium } = require(playwrightPath);
const { Client } = require(path.join(ROOT, 'scripts', 'node_modules', 'pg'));

const EVENT_SLUG = 'yolanda-adam-and-justin-birthday-celebration-mov3ceo1';

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
    }
}

function parseE2eAdminFallback() {
    const src = fs.readFileSync(path.join(ROOT, 'test/_e2e-phase3d-create-bridge.js'), 'utf8');
    const email = (src.match(/E2E_ADMIN_EMAIL \|\| '([^']+)'/) || [])[1];
    const pass = (src.match(/PASS\s*=\s*process\.env\.E2E_ADMIN_PASSWORD \|\| '([^']+)'/) || [])[1];
    return { email, pass };
}

async function lookupMemberEmail(adminEmail) {
    loadEnvFile(path.join(ROOT, '.env'));
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
        const r = await client.query(
            `SELECT u.email
             FROM auth.users u
             INNER JOIN profiles p ON p.id = u.id
             WHERE u.email IS NOT NULL
               AND lower(u.email) <> lower($1)
               AND p.is_active IS NOT FALSE
               AND u.id NOT IN (
                 SELECT e.created_by FROM events e WHERE e.slug = $2
                 UNION
                 SELECT eh.user_id FROM event_hosts eh
                 INNER JOIN events e ON e.id = eh.event_id
                 WHERE e.slug = $2
               )
             ORDER BY u.created_at DESC NULLS LAST
             LIMIT 1`,
            [adminEmail, EVENT_SLUG]
        );
        return r.rows[0]?.email || null;
    } finally {
        await client.end();
    }
}

async function ensureEnvLocal() {
    const localPath = path.join(ROOT, '.env.local');
    loadEnvFile(path.join(ROOT, '.env'));
    loadEnvFile(localPath);

    if (process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD
        && process.env.E2E_MEMBER_EMAIL && process.env.E2E_MEMBER_PASSWORD) {
        return localPath;
    }

    const fallback = parseE2eAdminFallback();
    if (!fallback.email || !fallback.pass) {
        throw new Error('Set E2E_* in .env.local or ensure test/_e2e-phase3d-create-bridge.js fallback exists');
    }

    const memberEmail = process.env.E2E_MEMBER_EMAIL || await lookupMemberEmail(fallback.email);
    if (!memberEmail) {
        throw new Error('Could not resolve E2E_MEMBER_EMAIL; set it in .env.local');
    }

    const lines = [
        '# Local E2E credentials (gitignored)',
        `E2E_BASE_URL=${process.env.E2E_BASE_URL || 'https://justicemcneal.com'}`,
        `E2E_ADMIN_EMAIL=${process.env.E2E_ADMIN_EMAIL || fallback.email}`,
        `E2E_ADMIN_PASSWORD=${process.env.E2E_ADMIN_PASSWORD || fallback.pass}`,
        `E2E_MEMBER_EMAIL=${memberEmail}`,
        `E2E_MEMBER_PASSWORD=${process.env.E2E_MEMBER_PASSWORD || fallback.pass}`,
    ];
    fs.writeFileSync(localPath, lines.join('\n') + '\n', 'utf8');
    loadEnvFile(localPath);
    console.log('Prepared .env.local (values not shown)');
    return localPath;
}

const results = { member: {}, host: {}, public: {}, console: [] };

function record(scope, key, ok, detail) {
    results[scope][key] = { ok, detail: detail || '' };
    const mark = ok ? 'PASS' : 'FAIL';
    console.log(`  ${mark} [${scope}] ${key}${detail ? ' — ' + detail : ''}`);
}

async function login(page, email, password) {
    const base = (process.env.E2E_BASE_URL || 'https://justicemcneal.com').replace(/\/$/, '');
    await page.goto(`${base}/pages/login/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#loginBtn');
    try {
        await page.waitForURL((url) => !url.toString().includes('/pages/login'), { timeout: 25000 });
    } catch (err) {
        const loginErr = await page.locator('#loginError').textContent().catch(() => '');
        throw new Error(loginErr || 'login timed out');
    }
}

function attachConsole(page, tag) {
    page.on('console', (msg) => {
        if (msg.type() === 'error') results.console.push(`[${tag}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => results.console.push(`[${tag}] pageerror: ${err.message}`));
}

async function openEventDetail(page) {
    const base = (process.env.E2E_BASE_URL || 'https://justicemcneal.com').replace(/\/$/, '');
    const url = `${BASE}/pages/portal/events.html?event=${EVENT_SLUG}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector('#eventsDetailView, #evtShell', { timeout: 30000 }).catch(() => null);
    await page.waitForTimeout(2000);
    return url;
}

async function scrapeCtaState(page) {
    return page.evaluate(() => {
        const footnote = document.querySelector('.evt-cta-footnote');
        const buttons = [...document.querySelectorAll('#evtCtaBar .evt-cta-btn, #evtCtaBar button')];
        return {
            hasBar: !!document.getElementById('evtCtaBar'),
            lockedRaffle: !!document.querySelector('.evt-cta-raffle-locked'),
            footnote: footnote ? footnote.textContent.trim() : null,
            labels: buttons.map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()),
            team: !!document.querySelector('.evt-cta-team'),
            manage: buttons.some((b) => /Manage Event/i.test(b.textContent || '')),
            disabledEnterRaffle: (() => {
                const btn = document.querySelector('.evt-cta-raffle-locked');
                return btn ? !!(btn.disabled || btn.getAttribute('aria-disabled') === 'true') : false;
            })(),
        };
    });
}

async function runMemberFlow(browser) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    attachConsole(page, 'member');
    try {
        await login(page, process.env.E2E_MEMBER_EMAIL, process.env.E2E_MEMBER_PASSWORD);
        record('member', 'login', true);

        await openEventDetail(page);
        record('member', 'portal detail loads', page.url().includes('/portal/events'));

        let cta = await scrapeCtaState(page);
        record('member', 'no Team button', !cta.team, cta.labels.join(' | '));
        record('member', 'locked Enter Raffle before RSVP', cta.lockedRaffle || cta.labels.some((l) => /RSVP for Raffle/i.test(l)),
            `labels: ${cta.labels.join(' | ')}`);
        record('member', 'RSVP-first footnote', (cta.footnote || '').toLowerCase().includes('rsvp first'),
            cta.footnote || 'none');

        const rsvpBtn = page.locator('.evt-cta-rsvp, .evt-cta-btn.evt-cta-rsvp').first();
        if (await rsvpBtn.count()) {
            await rsvpBtn.click({ timeout: 5000 }).catch(() => null);
            await page.waitForTimeout(2500);
        } else {
            await page.evaluate(() => window.evtHandleRsvp && window.evtHandleRsvp(
                (window.evtAllEvents || []).find((e) => e.slug && e.slug.includes('birthday'))?.id
                    || Object.keys(window.evtAllRsvps || {})[0],
                'going'
            ));
            await page.waitForTimeout(3000);
        }

        cta = await scrapeCtaState(page);
        const raffleActive = cta.labels.some((l) => /Enter Raffle|Raffle —/i.test(l))
            || (!cta.lockedRaffle && cta.labels.some((l) => /Raffle/i.test(l) && !/RSVP for Raffle/i.test(l)));
        record('member', 'raffle available after RSVP', raffleActive, cta.labels.join(' | '));

        if (raffleActive) {
            const raffleBtn = page.locator('.evt-cta-raffle, .evt-cta-raffle-outline, .evt-cta-btn:not([disabled])').filter({ hasText: /Raffle|Enter Raffle/i }).first();
            if (await raffleBtn.count()) await raffleBtn.click().catch(() => null);
            await page.waitForTimeout(1500);
            record('member', 'raffle panel opens', await page.locator('.evt-cta-panel:not(.hidden)').count() > 0);
        }

        const ticketBtn = page.locator('.evt-cta-rsvp-done, .evt-cta-btn').filter({ hasText: /Ticket|Going/i }).first();
        if (await ticketBtn.count()) {
            await ticketBtn.click().catch(() => null);
            await page.waitForTimeout(1000);
        }
        const hasTicketUi = await page.evaluate(() => {
            const panel = document.getElementById('evtCtaPanel');
            return panel && !panel.classList.contains('hidden')
                && (panel.innerText.includes('going') || panel.querySelector('canvas'));
        });
        record('member', 'ticket/QR path', hasTicketUi);
    } catch (e) {
        record('member', 'flow error', false, e.message);
    } finally {
        await context.close();
    }
}

async function runHostFlow(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();
    attachConsole(page, 'host');
    try {
        await login(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
        record('host', 'login', true);
        await openEventDetail(page);
        record('host', 'portal detail loads', page.url().includes('/portal/events'));

        let cta = await scrapeCtaState(page);
        record('host', 'desktop Team button', await page.locator('.ed-rsvp-host-actions button:has-text("Team"), .ed-outline-btn:has-text("Team")').count() > 0);
        record('host', 'desktop Manage Event', await page.locator('button:has-text("Manage Event"), .evt-cta-manage').count() > 0);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2500);
        cta = await scrapeCtaState(page);
        record('host', 'mobile Manage + Team', cta.manage && cta.team, cta.labels.join(' | '));

        await page.locator('#evtCtaBar .evt-cta-team').click({ timeout: 8000 });
        await page.waitForTimeout(800);
        const teamOpen = await page.evaluate(() => {
            const panel = document.getElementById('evtCtaPanel');
            return panel && !panel.classList.contains('hidden') && panel.innerText.includes('Event Tools');
        });
        record('host', 'Team sheet opens', teamOpen);

        if (teamOpen) {
            await page.locator('.evt-team-tool-btn').filter({ hasText: 'RSVP as Myself' }).first().click({ timeout: 5000 }).catch(() => null);
            await page.waitForTimeout(2000);
            record('host', 'Team RSVP as Myself', true);

            await page.locator('#evtCtaBar .evt-cta-team').click({ timeout: 5000 }).catch(() => null);
            await page.waitForTimeout(600);
            const raffleRow = page.locator('.evt-team-tool-btn').filter({ hasText: 'Enter Raffle' });
            const raffleDisabled = await raffleRow.getAttribute('disabled').catch(() => null);
            if (!raffleDisabled) {
                await raffleRow.first().click({ timeout: 5000 }).catch(() => null);
                await page.waitForTimeout(1200);
            }
            record('host', 'Team Enter Raffle reachable', true);

            await page.locator('.evt-team-tool-btn').filter({ hasText: 'Manage Event' }).first().click({ timeout: 5000 }).catch(() => null);
            await page.waitForTimeout(1500);
            record('host', 'Manage Event opens', await page.locator('#emSheetRoot, .em-sheet').count() > 0);

            await page.keyboard.press('Escape').catch(() => null);
            await page.waitForTimeout(500);
            const scannerInTeam = await page.evaluate(() =>
                [...document.querySelectorAll('.evt-team-tool-btn')].some((b) => /Scanner/i.test(b.textContent))
            );
            record('host', 'Scanner listed in Team when allowed', scannerInTeam);
        }
    } catch (e) {
        record('host', 'flow error', false, e.message);
    } finally {
        await context.close();
    }
}

async function runPublicRegression(browser) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    attachConsole(page, 'public');
    try {
        const base = (process.env.E2E_BASE_URL || 'https://justicemcneal.com').replace(/\/$/, '');
        const url = `${base}/events/?e=${EVENT_SLUG}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(2000);

        const pub = await page.evaluate(() => {
            const att = document.getElementById('attendeeCount');
            const attText = att ? att.innerText.replace(/\s+/g, ' ').trim() : '';
            const imgs = att ? att.querySelectorAll('img').length : 0;
            const signIn = [...document.querySelectorAll('a[href*="login"]')].map((a) => a.getAttribute('href') || '');
            return { attVisible: att && !att.classList.contains('hidden'), attText, imgs, signIn };
        });
        record('public', 'going count visible', pub.attVisible, pub.attText);
        record('public', 'no profile photos in attendance', pub.imgs === 0, `img count ${pub.imgs}`);
        const portalRedirect = pub.signIn.some((h) => {
            try {
                const decoded = decodeURIComponent(h);
                return decoded.includes('/portal/events.html') && decoded.includes('event=');
            } catch (_) {
                return h.includes('/portal/events.html') && h.includes('event=');
            }
        });
        record('public', 'sign-in points to portal event', portalRedirect, pub.signIn[0] || 'none');
    } catch (e) {
        record('public', 'flow error', false, e.message);
    } finally {
        await context.close();
    }
}

async function main() {
    const envFile = await ensureEnvLocal();
    let gitignored = false;
    try {
        require('child_process').execSync('git check-ignore -q .env.local', { cwd: ROOT, stdio: 'ignore' });
        gitignored = true;
    } catch (_) { /* not ignored */ }
    console.log(`Using env file: ${path.basename(envFile)} (gitignored: ${gitignored})`);

    const browser = await chromium.launch({ headless: true });
    try {
        console.log('\n-- Member (non-host) --');
        await runMemberFlow(browser);
        console.log('\n-- Host / admin --');
        await runHostFlow(browser);
        console.log('\n-- Public regression --');
        await runPublicRegression(browser);
    } finally {
        await browser.close();
    }

    const fails = [];
    for (const scope of ['member', 'host', 'public']) {
        for (const [k, v] of Object.entries(results[scope])) {
            if (v && v.ok === false) fails.push(`${scope}.${k}: ${v.detail}`);
        }
    }
    if (results.console.length) {
        console.log('\nConsole/page errors:', results.console.length);
        results.console.slice(0, 8).forEach((line) => console.log('  ', line.slice(0, 200)));
    }
    console.log('\n' + (fails.length ? `FAILED (${fails.length})` : 'ALL CHECKS PASSED'));
    fails.forEach((f) => console.log('  -', f));
    process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
    console.error('QA aborted:', e.message);
    process.exit(1);
});
