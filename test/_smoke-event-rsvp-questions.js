// Smoke — configurable RSVP questions + persisted answers
// Run: node test/_smoke-event-rsvp-questions.js
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }
function check(label, ok) { ok ? pass(label) : fail(label); }

console.log('\n── RSVP custom questions contract ───────────────────────────────────────');
check('browser question helper exists', exists('js/components/events/rsvp-questions.js'));
if (exists('js/components/events/rsvp-questions.js')) {
    const helper = read('js/components/events/rsvp-questions.js');
    ['normalizeQuestions', 'formFieldsHtml', 'readAnswersFromRoot', 'validateAnswers', 'summaryHtml'].forEach((name) => {
        check(`browser helper exposes ${name}`, helper.includes(name));
    });
    check('helper supports yes/no type', helper.includes("yes_no"));
    check('helper supports choice and text types', helper.includes("single_choice") && helper.includes("multiple_choice") && helper.includes("short_text") && helper.includes("long_text"));

    const browserContext = {
        window: {
            EventsHelpers: {
                escapeHtml(value) { return String(value == null ? '' : value); },
            },
        },
    };
    vm.runInNewContext(helper, browserContext);
    const yesNoQuestion = [{ id: 'big-mountain', prompt: 'Do you plan on snowboarding?', type: 'yes_no', choices: [] }];
    const normalizedYesNo = browserContext.window.EventsRsvpQuestions.normalizeQuestions(yesNoQuestion);
    check('yes/no normalization keeps Yes and No choices',
        normalizedYesNo[0]?.choices?.map((choice) => choice.id).join(',') === 'yes,no');
    const yesNoHtml = browserContext.window.EventsRsvpQuestions.formFieldsHtml(yesNoQuestion);
    check('yes/no question renders selectable radio options',
        yesNoHtml.includes('type="radio"') && yesNoHtml.includes('>Yes</span>') && yesNoHtml.includes('>No</span>'));
}

check('server question helper exists', exists('supabase/functions/_shared/rsvp-questions.ts'));
if (exists('supabase/functions/_shared/rsvp-questions.ts')) {
    const server = read('supabase/functions/_shared/rsvp-questions.ts');
    check('server helper normalizes questions', server.includes('normalizeQuestions'));
    check('server helper validates answers', server.includes('validateAnswers'));
}

check('question database migration exists', exists('supabase/migrations/20261015020000_event_rsvp_questions.sql'));
if (exists('supabase/migrations/20261015020000_event_rsvp_questions.sql')) {
    const migration = read('supabase/migrations/20261015020000_event_rsvp_questions.sql');
    check('events question catalog column', migration.includes('events') && migration.includes('rsvp_questions'));
    check('member answer column', migration.includes('event_rsvps') && migration.includes('rsvp_answers'));
    check('guest answer column', migration.includes('event_guest_rsvps') && migration.includes('rsvp_answers'));
}
check('private RSVP answer migration exists', exists('supabase/migrations/20261015030000_event_rsvp_answers_private.sql'));
if (exists('supabase/migrations/20261015030000_event_rsvp_answers_private.sql')) {
    const privacyMigration = read('supabase/migrations/20261015030000_event_rsvp_answers_private.sql');
    check('private answer table is manager scoped', privacyMigration.includes('event_rsvp_answers') && privacyMigration.includes('event_rsvp_answers_manager_select'));
    check('public roster answer columns are removed', privacyMigration.includes('DROP COLUMN IF EXISTS rsvp_answers'));
}
check('RSVP question lock migration exists', exists('supabase/migrations/20261015040000_lock_event_rsvp_questions.sql'));
if (exists('supabase/migrations/20261015040000_lock_event_rsvp_questions.sql')) {
    const lockMigration = read('supabase/migrations/20261015040000_lock_event_rsvp_questions.sql');
    check('question catalog locks after an RSVP', lockMigration.includes('prevent_event_rsvp_question_changes_after_rsvp') && lockMigration.includes('event_rsvp_questions_lock'));
}

console.log('\n── Creator portal ───────────────────────────────────────────────────────');
check('creator question step exists', exists('js/portal/events/create/step-questions.js'));
if (exists('js/portal/events/create/step-questions.js')) {
    const step = read('js/portal/events/create/step-questions.js');
    check('creator step has type selector', step.includes('single_choice') && step.includes('yes_no'));
    check('creator step has required toggle', step.includes('required'));
    check('creator step has multiple question rows', step.includes('addQuestion') || step.includes('Add question'));
}
const sheet = read('js/portal/events/create/sheet.js');
check('creator state includes rsvp_questions', sheet.includes('rsvp_questions'));
check('creator sheet includes Questions step', sheet.includes("key: 'questions'") || sheet.includes('label: \'Questions\''));
const submit = read('js/portal/events/create/submit.js');
check('submit persists rsvp_questions', submit.includes('rsvp_questions'));
check('review summarizes rsvp questions', read('js/portal/events/create/step-review.js').includes('rsvp_questions'));

console.log('\n── RSVP surfaces ─────────────────────────────────────────────────────────');
const wizard = read('js/components/events/rsvp-wizard.js');
check('wizard recognizes custom questions', wizard.includes('needsRsvpQuestions') && wizard.includes("key: 'questions'"));
check('wizard stores rsvp answers', wizard.includes('rsvp_answers'));
check('wizard forwards answers to checkout', wizard.includes('rsvp_answers: STATE.form.rsvp_answers'));
const publicRsvp = read('js/events/rsvp.js');
check('public RSVP reads and validates answers', publicRsvp.includes('pubReadRsvpAnswers') && publicRsvp.includes('pubValidateRsvpAnswers'));
check('public RSVP forwards answers', publicRsvp.includes('rsvp_answers'));
const portalRsvp = read('js/portal/events/engagement/rsvp.js');
check('portal RSVP forwards answers', portalRsvp.includes('rsvp_answers'));
const main = read('js/portal/events/main.js');
check('portal imports question helper', main.includes("components/events/rsvp-questions.js"));
const publicHtml = read('events/index.html');
check('public page loads question helper', publicHtml.includes('rsvp-questions.js'));
const manageSheet = read('js/portal/events/manage/sheet.js');
check('manager roster loads private RSVP answers', manageSheet.includes('event_rsvp_answers') && manageSheet.includes('answersByMemberId'));
const manageRsvps = read('js/portal/events/manage/rsvps.js');
check('manager roster displays RSVP answers', manageRsvps.includes('rsvp_answers') && manageRsvps.includes('RSVP answers'));

console.log('\n── Server RSVP persistence ──────────────────────────────────────────────');
const memberFn = read('supabase/functions/rsvp-member-party/index.ts');
const guestFn = read('supabase/functions/rsvp-guest-free/index.ts');
const checkoutFn = read('supabase/functions/create-event-checkout/index.ts');
const webhookFn = read('supabase/functions/stripe-webhook/index.ts');
check('member edge validates and stores answers', memberFn.includes('rsvp_answers') && memberFn.includes('validateAnswers'));
check('guest edge validates and stores answers', guestFn.includes('rsvp_answers') && guestFn.includes('validateAnswers'));
check('checkout validates and passes answers without metadata', checkoutFn.includes('rsvp_answers') && checkoutFn.includes('rsvpAnswers: normalizedRsvpAnswers') && !checkoutFn.includes('metadata.rsvp_answers'));
check('shared paid prep saves private answers', read('supabase/functions/_shared/paid-rsvp-prep.ts').includes('saveRsvpAnswers'));
check('webhook does not expose answer metadata', !webhookFn.includes('session.metadata?.rsvp_answers'));

console.log('\n── Colorado event seed ──────────────────────────────────────────────────');
const colorado = read('scripts/fill-colorado-event-content-2028.sql');
check('Colorado seed has RSVP question catalog', colorado.includes('rsvp_questions'));
check('Colorado seed asks about big mountain snowboarding', colorado.includes('snowboarding on the big mountain'));
check('Colorado seed makes pass question required', colorado.includes('"type": "yes_no"') && colorado.includes('"required": true'));

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ RSVP custom questions smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
