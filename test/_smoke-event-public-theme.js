// Smoke test — §13.14 Public event + RSVP theme MVP (line 473)
// Run: node test/_smoke-event-public-theme.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.14 public event HTML theme ───────────────────────────────────────');
const html = read('events/index.html');
html.includes('viewport-fit=cover')
    ? pass('viewport-fit=cover')
    : fail('missing viewport-fit=cover');
html.includes('Theme_JMLLC001/Theme_JMLLC001.css')
    ? pass('loads Theme_JMLLC001.css')
    : fail('missing Theme_JMLLC001 link');
html.includes('theme-color" content="#13366E"')
    || html.includes("theme-color' content='#13366E'")
    || html.includes('content="#13366E"')
    ? pass('theme-color #13366E')
    : fail('theme-color not #13366E');
!html.includes('fonts.googleapis.com')
    && !html.includes('family=Inter')
    ? pass('no Inter Google Fonts link')
    : fail('still loads Inter from Google Fonts');
html.includes('public-event.css?v=192')
    && html.includes('detail.css?v=209')
    && html.includes('index.js?v=202')
    && html.includes('hero.js?v=223')
    ? pass('public CSS/JS cache bump (css v=192, portal detail v=209)')
    : fail('public ?v= not bumped');

console.log('\n── public-event.css tokens + safe-area ──────────────────────────────────');
const css = read('css/pages/public-event.css');
!css.includes('#4f46e5')
    && !css.includes('#6d28d9')
    ? pass('no indigo #4f46e5 / #6d28d9')
    : fail('indigo accents remain in public-event.css');
!css.includes("font-family: 'Inter'")
    && !css.includes('font-family: "Inter"')
    && css.includes('--font-body')
    ? pass('body uses --font-body (no Inter)')
    : fail('Inter or missing --font-body');
css.includes('--color-primary')
    && css.includes('--font-headline')
    ? pass('uses --color-primary + --font-headline')
    : fail('missing theme token usage');
css.includes('body.public-event-detail .pub-nav')
    && /body\.public-event-detail\s+\.pub-nav[\s\S]*?display:\s*none/.test(css)
    ? pass('public-event-detail hides pub-nav')
    : fail('public-event-detail pub-nav not hidden');

console.log('\n── public index.js colors ───────────────────────────────────────────────');
const js = read('js/events/index.js');
!js.includes('#4f46e5')
    && !js.includes('#e0e7ff')
    && !js.includes('#6d28d9')
    && !js.includes('#a855f7')
    ? pass('no indigo/purple hardcodes in index.js')
    : fail('indigo/purple hardcodes remain in index.js');

console.log('\n── public hero matches portal ───────────────────────────────────────────');
!js.includes('ed-hero-nav')
    && !js.includes('ed-hero-subtitle')
    && !js.includes('heroLocationPill')
    && !js.includes('heroStatusBadge')
    ? pass('public shell has no hero pills, countdown, or hosted-by line')
    : fail('public shell still has hero-only chrome');
js.includes("weekday: 'short'")
    && js.includes('location_nickname && event.location_text ? event.location_text : \'Location\'')
    ? pass('qi-bar uses weekday short + portal location subtext')
    : fail('qi-bar weekday/location copy not matched to portal');
html.includes('[data-public-signin]')
    ? pass('login redirect targets data-public-signin')
    : fail('login script missing data-public-signin selector');
const hero = read('js/events/hero.js');
hero.includes('evt-cta-signin')
    && hero.includes('data-public-signin')
    && hero.includes('aria-label="Sign in"')
    && hero.includes('!event.member_only')
    ? pass('CTA bar adds Sign In icon for guests (not member-only)')
    : fail('CTA Sign In icon missing or shown for member-only');
css.includes('.evt-cta-signin')
    ? pass('Sign In icon styles present')
    : fail('missing .evt-cta-signin styles');
!css.includes('body.public-event-detail .ed-hero {')
    && !css.includes('rgba(79,70,229')
    ? pass('public-event.css no longer restyles shared hero/surface')
    : fail('public-event.css still overrides shared event-detail chrome');
const shared = read('css/pages/portal/events/detail.css');
shared.includes('.event-detail-surface .ed-hero')
    && shared.includes('.event-detail-surface .ed-qi-bar')
    && shared.includes('.event-detail-surface .event-detail-card-tight')
    ? pass('portal detail.css scopes v2 chrome to .event-detail-surface')
    : fail('shared event-detail-surface rules missing');

console.log('\n── magic-link payments still themed ─────────────────────────────────────');
const pay = read('events/payments/index.html');
pay.includes('Theme_JMLLC001')
    && pay.includes('viewport-fit=cover')
    && pay.includes('safe-area-inset-top')
    ? pass('payments still Theme_JMLLC001 + safe areas')
    : fail('payments theme regression');

console.log('\n── Docs ─────────────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — Public event + RSVP + magic-link: Theme_JMLLC001 tokens, mobile-first, `viewport-fit=cover`, safe areas')
    ? pass('brainstorm line 473 checked')
    : fail('brainstorm 473 not checked');

console.log(`\n${failed === 0 ? 'event public theme smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
