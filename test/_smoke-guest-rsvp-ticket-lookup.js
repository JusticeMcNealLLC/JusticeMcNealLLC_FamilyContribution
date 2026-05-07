const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const publicIndex = fs.readFileSync(path.join(root, 'js/events/index.js'), 'utf8');
const rsvpJs = fs.readFileSync(path.join(root, 'js/events/rsvp.js'), 'utf8');
const ticketJs = fs.readFileSync(path.join(root, 'js/events/ticket.js'), 'utf8');
const freeRsvpFn = fs.readFileSync(path.join(root, 'supabase/functions/rsvp-guest-free/index.ts'), 'utf8');
const checkoutFn = fs.readFileSync(path.join(root, 'supabase/functions/create-event-checkout/index.ts'), 'utf8');
const webhookFn = fs.readFileSync(path.join(root, 'supabase/functions/stripe-webhook/index.ts'), 'utf8');

assert(publicIndex.includes("Already RSVP'd? Look up your ticket"), 'public event page should expose clear ticket lookup copy');
assert(publicIndex.includes('const guestTicketToken = !pubCurrentUser && ticketToken ? ticketToken : null'), 'guest ticket links should restore guest RSVP state for non-members');
assert(ticketJs.includes('function pubNormalizeGuestEmail'), 'ticket lookup should normalize guest emails');
assert(ticketJs.includes('async function pubFindGuestRsvpByEmail'), 'ticket lookup should share a reusable email lookup helper');
assert(ticketJs.includes('async function pubUseExistingGuestRsvp'), 'existing guest RSVPs should reuse the ticket display flow');
assert(rsvpJs.includes('const existingGuest = await pubFindGuestRsvpByEmail(email)'), 'guest RSVP should check for an existing RSVP before creating one');
assert(rsvpJs.includes("You already RSVP\\'d. Here is your ticket."), 'duplicate RSVP should show existing ticket copy');
assert(freeRsvpFn.includes(".ilike('guest_email', emailLower)"), 'free RSVP edge function should check existing guests case-insensitively');
assert(freeRsvpFn.includes('insertErr.code === \'23505\''), 'free RSVP edge function should recover from unique conflicts');
assert(freeRsvpFn.includes('guest_rsvp: existingGuest'), 'free RSVP edge function should return existing RSVP details');
assert(checkoutFn.includes('guestEmailNormalized'), 'paid checkout should normalize guest email metadata and checks');
assert(checkoutFn.includes(".ilike('guest_email', guestEmailNormalized!)"), 'paid checkout should check existing guest RSVP case-insensitively');
assert(webhookFn.includes('guest_email?.trim().toLowerCase()'), 'paid RSVP webhook should persist normalized guest email');

console.log('guest RSVP ticket lookup smoke: all pass');