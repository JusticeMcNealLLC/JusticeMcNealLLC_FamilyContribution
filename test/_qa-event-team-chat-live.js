/**
 * Live QA: Event Team Chat UI (ca26713). Credentials from .env.local only.
 * Run: node test/_qa-event-team-chat-live.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'scripts', 'node_modules', 'playwright'));
const { createClient } = require(path.join(ROOT, 'scripts', 'node_modules', '@supabase/supabase-js'));

const EVENT_SLUG = 'yolanda-adam-and-justin-birthday-celebration-mov3ceo1';
const QA_TAG = `QA-ca26713-${Date.now()}`;

const report = {
    deploy: {},
    coordinator: {},
    admin: {},
    realtime: {},
    member: {},
    hostOnly: { skipped: true, reason: 'No E2E_HOST_ONLY credentials in .env.local' },
    console: [],
    network: [],
    testData: { messages: [], chatId: null, eventId: null },
};

function loadEnv() {
    for (const f of ['.env', '.env.local']) {
        const p = path.join(ROOT, f);
        if (!fs.existsSync(p)) continue;
        for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
            const t = line.trim();
            if (!t || t.startsWith('#')) continue;
            const eq = t.indexOf('=');
            if (eq <= 0) continue;
            const k = t.slice(0, eq).trim();
            let v = t.slice(eq + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
            if (process.env[k] === undefined) process.env[k] = v;
        }
    }
}

function pass(scope, key, ok, detail = '') {
    report[scope][key] = { ok, detail };
    console.log(`  ${ok ? 'PASS' : 'FAIL'} [${scope}] ${key}${detail ? ' — ' + detail : ''}`);
}

async function login(page, email, password) {
    const base = (process.env.E2E_BASE_URL || 'https://justicemcneal.com').replace(/\/$/, '');
    await page.goto(`${base}/auth/login.html`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#loginBtn');
    await page.waitForURL((u) => !u.toString().includes('/auth/login'), { timeout: 30000 });
}

function attachObservers(page, tag) {
    page.on('console', (msg) => {
        if (msg.type() === 'error') report.console.push(`[${tag}] ${msg.text()}`);
    });
    page.on('pageerror', (e) => report.console.push(`[${tag}] pageerror: ${e.message}`));
    page.on('response', (res) => {
        const url = res.url();
        if ((url.includes('event_chat') || url.includes('event_chats')) && res.status() >= 400) {
            report.network.push(`[${tag}] ${res.status()} ${url}`);
        }
    });
}

async function openEventDetail(page) {
    const base = (process.env.E2E_BASE_URL || 'https://justicemcneal.com').replace(/\/$/, '');
    const url = `${base}/portal/events.html?event=${EVENT_SLUG}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('#eventsDetailView, #evtShell', { timeout: 30000 }).catch(() => null);
    await page.waitForTimeout(2500);
    return url;
}

async function clickTeam(page) {
    const mobile = page.locator('#evtCtaBar .evt-cta-team').first();
    if (await mobile.isVisible().catch(() => false)) {
        await mobile.click({ timeout: 8000 });
        await page.waitForTimeout(800);
        return 'mobile';
    }
    const desktop = page.locator('.ed-rsvp-host-actions button[aria-label="Open event team tools"]').first();
    await desktop.scrollIntoViewIfNeeded();
    await desktop.click({ timeout: 8000 });
    await page.waitForTimeout(800);
    return 'desktop';
}

async function openTeamChat(page) {
    const clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.evt-team-tool-btn')].find((b) => {
            const main = b.querySelector('.evt-team-tool-main');
            return main && /Team Chat/i.test(main.textContent) && !b.disabled;
        });
        if (!btn) return false;
        btn.click();
        return true;
    });
    if (!clicked) {
        throw new Error('Team Chat row not found or disabled');
    }
    await page.waitForTimeout(1500);
}

async function chatState(page) {
    return page.evaluate(() => {
        const panel = document.getElementById('evtCtaPanel');
        const open = panel && !panel.classList.contains('hidden');
        const chat = document.querySelector('.evt-team-chat');
        const msgs = [...document.querySelectorAll('.evt-team-chat-msg-body')].map((el) => el.textContent.trim());
        const empty = document.querySelector('.evt-team-chat-empty');
        const notStarted = (panel?.innerText || '').includes('not been started yet');
        const unavailable = document.querySelector('.evt-team-chat-unavailable');
        const composer = !!document.getElementById('evtTeamChatInput');
        return {
            panelOpen: open,
            hasChatUi: !!chat,
            messages: msgs,
            empty: !!empty,
            notStarted,
            unavailable: unavailable ? unavailable.textContent.trim() : null,
            composer,
            hasEvtOpenTeamChat: typeof window.evtOpenTeamChat === 'function',
        };
    });
}

async function sendChatMessage(page, text) {
    await page.fill('#evtTeamChatInput', text);
    await page.click('#evtTeamChatSendBtn', { timeout: 5000 });
    await page.waitForTimeout(2000);
}

async function closeTeamChat(page) {
    await page.locator('.evt-cta-panel-close, .evt-team-chat-back').first().click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(500);
    await page.locator('.evt-cta-panel-close').first().click({ timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(400);
}

async function runCoordinatorFlow(browser) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    attachObservers(page, 'coordinator');
    try {
        await login(page, process.env.E2E_EVENTCOORDINATOR_EMAIL, process.env.E2E_EVENTCOORDINATOR_PASSWORD);
        pass('coordinator', 'login', true);
        await openEventDetail(page);
        pass('coordinator', 'event detail loads', page.url().includes('/portal/events'));

        const where = await clickTeam(page);
        pass('coordinator', 'Team opens', true, where);
        let st = await chatState(page);
        pass('coordinator', 'Team tools sheet', st.panelOpen && !st.hasChatUi);

        await openTeamChat(page);
        st = await chatState(page);
        for (let i = 0; i < 12 && st.hasChatUi && !st.composer && !st.notStarted && !st.unavailable; i++) {
            await page.waitForTimeout(500);
            st = await chatState(page);
        }
        pass('coordinator', 'Team Chat UI opens', st.hasChatUi && (st.composer || st.notStarted || st.unavailable),
            st.unavailable || st.notStarted || `msgs:${st.messages.length}`);

        if (st.notStarted) {
            pass('coordinator', 'chat created or loads', false, 'not started (unexpected for coordinator)');
        } else if (st.unavailable) {
            pass('coordinator', 'chat created or loads', false, st.unavailable);
        } else {
            pass('coordinator', 'chat created or loads', true, st.empty ? 'empty state' : `${st.messages.length} existing`);

            await sendChatMessage(page, QA_TAG);
            st = await chatState(page);
            const sent = st.messages.some((m) => m.includes('QA-ca26713'));
            pass('coordinator', 'send message', sent, st.messages.slice(-2).join(' | '));
            if (sent) report.testData.messages.push(QA_TAG);

            const eventId = report.testData.eventId || await page.evaluate(() => {
                const e = (window.evtAllEvents || []).find((x) => x.slug && x.slug.includes('birthday'));
                return e?.id;
            });
            await page.locator('.evt-team-chat-back').first().click({ timeout: 5000 });
            await page.waitForTimeout(600);
            await page.evaluate((id) => window.evtOpenTeamToolsPanel && window.evtOpenTeamToolsPanel(id), eventId);
            await page.waitForTimeout(600);
            await openTeamChat(page);
            st = await chatState(page);
            pass('coordinator', 'reopen persists message', st.messages.some((m) => m.includes('QA-ca26713')),
                `count ${st.messages.length}`);
        }

        report.testData.eventId = await page.evaluate(() => {
            const e = (window.evtAllEvents || []).find((x) => x.slug === 'yolanda-adam-and-justin-birthday-celebration-mov3ceo1');
            return e?.id || null;
        });
    } catch (e) {
        pass('coordinator', 'flow error', false, e.message);
    } finally {
        await ctx.close();
    }
}

async function runAdminChat(browser) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    attachObservers(page, 'admin');
    try {
        await login(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
        pass('admin', 'login', true);
        await openEventDetail(page);
        await clickTeam(page);
        await openTeamChat(page);
        const st = await chatState(page);
        pass('admin', 'Team Chat opens', st.hasChatUi && st.composer);
        pass('admin', 'sees coordinator message', st.messages.some((m) => m.includes('QA-ca26713')),
            `${st.messages.length} messages`);
    } catch (e) {
        pass('admin', 'flow error', false, e.message);
    } finally {
        await ctx.close();
    }
}

async function runRealtime(browser) {
    const base = (process.env.E2E_BASE_URL || 'https://justicemcneal.com').replace(/\/$/, '');
    const url = `${base}/portal/events.html?event=${EVENT_SLUG}`;
    const tagB = `QA-rt-${Date.now()}`;

    const ctxA = await browser.newContext({ viewport: { width: 900, height: 800 } });
    const ctxB = await browser.newContext({ viewport: { width: 900, height: 800 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    attachObservers(pageA, 'rt-A');
    attachObservers(pageB, 'rt-B');

    try {
        await login(pageA, process.env.E2E_EVENTCOORDINATOR_EMAIL, process.env.E2E_EVENTCOORDINATOR_PASSWORD);
        await login(pageB, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);

        await pageA.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await pageB.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await pageA.waitForTimeout(2500);
        await pageB.waitForTimeout(2500);

        await clickTeam(pageA);
        await openTeamChat(pageA);
        await clickTeam(pageB);
        await openTeamChat(pageB);

        const beforeB = (await chatState(pageB)).messages.length;
        await sendChatMessage(pageA, tagB);
        report.testData.messages.push(tagB);

        let rtOk = false;
        for (let i = 0; i < 12; i++) {
            await pageB.waitForTimeout(1000);
            const st = await chatState(pageB);
            if (st.messages.some((m) => m.includes(tagB))) {
                rtOk = true;
                break;
            }
        }
        if (!rtOk) {
            await pageB.reload({ waitUntil: 'networkidle' });
            await pageB.waitForTimeout(2500);
            await clickTeam(pageB);
            await openTeamChat(pageB);
            const after = await chatState(pageB);
            rtOk = after.messages.some((m) => m.includes(tagB));
            pass('realtime', 'live insert without refresh', false, 'refresh showed message — realtime follow-up');
            pass('realtime', 'message visible after refresh', rtOk, `before ${beforeB} after ${after.messages.length}`);
        } else {
            pass('realtime', 'live insert without refresh', true, tagB);
            pass('realtime', 'message visible after refresh', true, 'n/a');
        }
    } catch (e) {
        pass('realtime', 'flow error', false, e.message);
    } finally {
        await ctxA.close();
        await ctxB.close();
    }
}

async function runMemberFlow(browser) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    attachObservers(page, 'member');
    try {
        await login(page, process.env.E2E_MEMBER_EMAIL, process.env.E2E_MEMBER_PASSWORD);
        pass('member', 'login', true);
        await openEventDetail(page);

        const ui = await page.evaluate(() => ({
            teamCta: !!document.querySelector('.evt-cta-team'),
            teamHostBtn: !!document.querySelector('.ed-rsvp-host-actions button[aria-label="Open event team tools"]'),
            teamText: [...document.querySelectorAll('button')].filter((b) => /^Team$/i.test((b.textContent || '').trim())).length,
        }));
        pass('member', 'no Team CTA bar button', !ui.teamCta);
        pass('member', 'no desktop Team host action', !ui.teamHostBtn && ui.teamText === 0, `team-like buttons: ${ui.teamText}`);

        const forced = await page.evaluate(async () => {
            const e = (window.evtAllEvents || []).find((x) => x.slug && x.slug.includes('birthday'));
            if (!e || typeof window.evtOpenTeamChat !== 'function') return { ok: false, reason: 'no evtOpenTeamChat on live' };
            try {
                await window.evtOpenTeamChat(e.id);
                await new Promise((r) => setTimeout(r, 1500));
                const panel = document.getElementById('evtCtaPanel');
                const text = panel ? panel.innerText : '';
                return {
                    ok: true,
                    unavailable: /not available|not been started/i.test(text),
                    hasComposer: !!document.getElementById('evtTeamChatInput'),
                    snippet: text.slice(0, 120),
                };
            } catch (err) {
                return { ok: false, reason: err.message };
            }
        });
        pass('member', 'forced evtOpenTeamChat blocked or empty', !forced.hasComposer, forced.snippet || forced.reason || '');

        loadEnv();
        const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
            email: process.env.E2E_MEMBER_EMAIL,
            password: process.env.E2E_MEMBER_PASSWORD,
        });
        if (authErr) {
            pass('member', 'supabase chat SELECT', false, authErr.message);
        } else {
            const e = (await page.evaluate(() => {
                const ev = (window.evtAllEvents || []).find((x) => x.slug && x.slug.includes('birthday'));
                return ev?.id;
            })) || report.testData.eventId;
            const { data: chats, error: chatErr } = await sb.from('event_chats').select('id').eq('event_id', e);
            const { data: msgs, error: msgErr } = await sb.from('event_chat_messages').select('id').eq('event_id', e);
            pass('member', 'supabase event_chats RLS', !chatErr && (chats || []).length === 0, chatErr?.message || `rows ${(chats || []).length}`);
            pass('member', 'supabase event_chat_messages RLS', !msgErr && (msgs || []).length === 0, msgErr?.message || `rows ${(msgs || []).length}`);
        }
    } catch (e) {
        pass('member', 'flow error', false, e.message);
    } finally {
        await ctx.close();
    }
}

async function checkLiveDeploy() {
    const base = (process.env.E2E_BASE_URL || 'https://justicemcneal.com').replace(/\/$/, '');
    try {
        const [chatRes, detailRes, htmlRes] = await Promise.all([
            fetch(`${base}/js/portal/events/team/chat.js`, { signal: AbortSignal.timeout(15000) }),
            fetch(`${base}/js/portal/events/detail.js`, { signal: AbortSignal.timeout(15000) }),
            fetch(`${base}/portal/events.html`, { signal: AbortSignal.timeout(15000) }),
        ]);
        const chatBody = await chatRes.text();
        const detailBody = await detailRes.text();
        const htmlBody = await htmlRes.text();

        const chatTag = 'src="../js/portal/events/team/chat.js"';
        const detailTag = 'src="../js/portal/events/detail.js"';
        const chatIdx = htmlBody.indexOf(chatTag);
        const detailIdx = htmlBody.indexOf(detailTag);

        const chatImpl =
            chatRes.status === 200 &&
            chatBody.includes('evtOpenTeamChat') &&
            chatBody.includes('event_chat_messages') &&
            chatBody.includes('PortalEvents.team.chat');
        pass(
            'deploy',
            'live team/chat.js has Team Chat implementation',
            chatImpl,
            chatImpl ? `${chatRes.status}, ${chatBody.length} bytes` : `status ${chatRes.status}`,
        );

        const detailBridge =
            detailRes.status === 200 &&
            /detail\.openTeamChat\s*=\s*window\.evtOpenTeamChat/.test(detailBody) &&
            !detailBody.includes("from('event_chat_messages')");
        pass(
            'deploy',
            'live detail.js bridges Team Chat only',
            detailBridge,
            detailBridge ? 'openTeamChat bridge, no event_chat_messages queries' : 'bridge or extraction mismatch',
        );

        const loadOrder = chatIdx >= 0 && detailIdx >= 0 && chatIdx < detailIdx;
        pass(
            'deploy',
            'portal/events.html loads team/chat.js before detail.js',
            loadOrder,
            loadOrder ? 'script order ok' : 'missing or wrong script order',
        );
    } catch (e) {
        pass('deploy', 'live deploy asset fetch', false, e.message);
    }
}

async function main() {
    loadEnv();
    const required = ['E2E_EVENTCOORDINATOR_EMAIL', 'E2E_EVENTCOORDINATOR_PASSWORD', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_MEMBER_EMAIL', 'E2E_MEMBER_PASSWORD', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);

    console.log('\nEvent Team Chat live QA\n');
    console.log(`Event: ${EVENT_SLUG}`);
    console.log(`QA message tag: ${QA_TAG}\n`);

    await checkLiveDeploy();

    const browser = await chromium.launch({ headless: true });
    try {
        await runCoordinatorFlow(browser);
        await runAdminChat(browser);
        await runRealtime(browser);
        await runMemberFlow(browser);
    } finally {
        await browser.close();
    }

    console.log('\n── Summary ──');
    const fail = [];
    for (const scope of ['deploy', 'coordinator', 'admin', 'realtime', 'member']) {
        for (const [k, v] of Object.entries(report[scope])) {
            if (v && v.ok === false) fail.push(`${scope}.${k}: ${v.detail}`);
        }
    }
    if (report.console.length) {
        console.log(`Console errors: ${report.console.length}`);
        report.console.slice(0, 8).forEach((l) => console.log(`  ${l}`));
    }
    if (report.network.length) {
        console.log(`Network errors: ${report.network.length}`);
        report.network.forEach((l) => console.log(`  ${l}`));
    }
    console.log(`Test messages created: ${report.testData.messages.join(', ') || '(none)'}`);
    console.log(fail.length ? `\nFAILED checks (${fail.length}):\n${fail.map((f) => `  - ${f}`).join('\n')}` : '\nAll automated checks passed.');
    process.exit(fail.length ? 1 : 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
