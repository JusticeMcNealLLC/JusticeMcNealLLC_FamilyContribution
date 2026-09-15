/**
 * Portal Events — ESM entry (source of truth for load order).
 * Production: npm run build:events → events.bundle.js (esbuild IIFE).
 * Local dev (optional): <script type="module" src=".../main.js"> — many requests.
 *
 * Edit import order here directly. Validate: npm run verify:events-main
 */

import '../../components/events/constants.js'; // EventsConstants (shared)
import '../../components/events/helpers.js'; // EventsHelpers (shared)
import '../../components/events/capacity.js'; // EventsCapacity (shared)
import '../../components/events/about-tabs.js'; // EventsAboutTabs (shared)
import '../../components/events/hero-tint.js'; // EventsHeroTint (banner fade)
import '../../components/events/discussion.js'; // EventsDiscussion (pane + sheet)
import '../../components/events/included-items.js'; // EventsIncludedItems (shared)
import '../../components/events/disclaimers.js'; // EventsDisclaimers (shared)
import '../../components/events/amenity-voting.js'; // EventsAmenityVoting (shared)
import '../../components/events/payment-choice.js'; // EventsPaymentChoice (shared)
import '../../components/events/invest-ack.js'; // EventsInvestAck (shared)
import '../../components/events/seat-picker.js'; // EventsSeatPicker (shared, legacy single-seat)
import '../../components/events/party-seats.js'; // EventsPartySeats (§13.9 Flow A)
import '../../components/events/attach-guests.js'; // EventsAttachGuests (§13.9 Flow E)
import '../../components/events/rsvp-wizard.js'; // EventsRsvpWizard (stepped RSVP sheet)
import '../../components/events/competition-phases.js'; // EventsCompetitionPhases (shared)
import '../../components/events/pills.js'; // EventsPills (shared)
import '../../components/events/card.js'; // EventsCard (shared)
import './index.js'; // PortalEvents namespace shell
import './core/state.js';
import './core/utils.js';
import './core/actions.js';
import './core/vendor-loader.js';
import './core/raffle-model.js';
import './list/search.js';
import './list/right-rail.js';
import './list/header.js';
import './list/filters.js';
import './list/calendar.js';
import './list/hero-rails.js';
import './list/buckets.js';
import './list/shell.js';
import './list/manage-sync.js';
import './team/ui-tw.js';
import './team/shell.js';
import './team/panels.js';
import './team/tools-list.js';
import './team/chat.js';
import './team/cta-bar.js';
import './team/sheet.js';
import './detail/presentation.js';
import './detail/raffle-render.js';
import './detail/map-overlay.js';
import './detail/fragments.js';
import './detail/data.js';
import './detail/sections.js';
import './detail/post-render.js';
import './detail/template.js';
import './detail.js';
import './detail/comments.js';
import './detail/documents.js';
import './detail/map-live.js';
import './detail/competition.js';
import './detail/scrapbook.js';
import './detail/scanner.js';
import './engagement/rsvp.js';
import './create/geocode.js';
import './create/step-basics.js';
import './create/step-about.js';
import './create/step-included.js';
import './create/step-when.js';
import './create/step-pricing.js';
import './create/step-llc.js';
import './create/step-competition.js';
import './create/step-disclaimers.js';
import './create/step-voting.js';
import './create/step-review.js';
import './create/raffle-builder.js';
import './create/submit.js';
import './create/sheet.js';
import './engagement/raffle.js';
import './manage/shell.js';
import './manage/pricing-editor.js';
import './manage/disclaimers-editor.js';
import './manage/amenity-voting.js';
import './manage/hosts.js';
import './manage/sms-invites.js';
import './manage/overview.js';
import './manage/event.js';
import './manage/images.js';
import './manage/people.js';
import './manage/ticket-handoff.js';
import './manage/docs.js';
import './manage/rsvps.js';
import './manage/notifications.js';
import './manage/money.js';
import './manage/competition.js';
import './manage/participation.js';
import './manage/raffle.js';
import './manage/danger.js';
import './compat/global-reexports.js';
import './manage/sheet.js';
import './init.js'; // boot last (DOMContentLoaded → initEventsPage)
