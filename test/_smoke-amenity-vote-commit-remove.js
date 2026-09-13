// Smoke test — §13.13 amenity vote count on commit / remove on never-pay
// Run: node test/_smoke-amenity-vote-commit-remove.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── §13.13 amenity vote helpers ──────────────────────────────────────────');
const voting = read('supabase/functions/_shared/amenity-voting.ts');
voting.includes('export async function commitPartyAmenityVote')
    && voting.includes("amenity_vote_status: 'counted'")
    && voting.includes('amenity_vote_committed_at')
    ? pass('commitPartyAmenityVote sets counted + committed_at')
    : fail('commitPartyAmenityVote missing');

voting.includes('export async function removePartyAmenityVoteIfUncommitted')
    && voting.includes("amenity_vote_status: 'removed'")
    && voting.includes('succeeded_installment')
    ? pass('removePartyAmenityVoteIfUncommitted for never-pay')
    : fail('removePartyAmenityVoteIfUncommitted missing');

console.log('\n── §13.13 count on plan commit ──────────────────────────────────────────');
const prep = read('supabase/functions/_shared/paid-rsvp-prep.ts');
prep.includes('commitPartyAmenityVote')
    && prep.includes('party.amenity_vote_option_id')
    && prep.includes('meta.amenity_vote_option_id || party.amenity_vote_option_id')
    ? pass('completePaidRsvpAfterCheckout falls back to party option + commits')
    : fail('checkout complete vote commit missing');

const schedule = read('supabase/functions/_shared/payment-schedule-webhook.ts');
schedule.includes('commitPartyAmenityVote')
    && schedule.includes('party_id')
    && schedule.includes('amenity_vote_committed_at')
    ? pass('applyInstallmentSucceeded commits amenity vote')
    : fail('installment success vote commit missing');

console.log('\n── §13.13 remove on checkout expired ────────────────────────────────────');
schedule.includes('removePartyAmenityVoteIfUncommitted')
    && schedule.includes('neverCommitted')
    ? pass('applyCheckoutSessionExpired removes uncommitted vote')
    : fail('checkout expired vote remove missing');

console.log('\n── §13.13 docs ──────────────────────────────────────────────────────────');
const brainstorm = read('docs/product/improvements/pages/events/000_events_system_overhaul_brainstorm.md');
brainstorm.includes('[x] **MVP** — On plan commit → count vote; on cancel/never-pay → remove vote')
    ? pass('brainstorm line 468 checked')
    : fail('brainstorm 468 not checked');

const contracts = read('docs/product/improvements/pages/events/004_event_edge_function_contracts.md');
contracts.includes('plan commit')
    || contracts.includes('amenity vote count')
    || contracts.includes('removePartyAmenityVote')
    || contracts.includes('§13.13 line 468')
    ? pass('004 notes amenity vote commit/remove')
    : fail('004 missing vote commit/remove note');

console.log(`\n${failed === 0 ? 'amenity vote commit/remove smoke: ALL PASS' : `${failed} failed`}`);
process.exit(failed > 0 ? 1 : 0);
