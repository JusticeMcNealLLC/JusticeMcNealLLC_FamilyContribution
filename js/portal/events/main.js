/**
 * Portal Events — ESM entry (source of truth for load order).
 * Production: npm run build:events → events.bundle.js (esbuild IIFE).
 * Local dev (optional): <script type="module" src=".../main.js"> — many requests.
 *
 * Import order is synced from classic-chain-loader.js via: npm run sync:events-main
 */

import '../../components/events/constants.js'; // EventsConstants (shared)
import '../../components/events/helpers.js'; // EventsHelpers (shared)
import '../../components/events/pills.js'; // EventsPills (shared)
import '../../components/events/card.js'; // EventsCard (shared)
import './index.js'; // PortalEvents namespace shell
import './core/state.js';
import './core/utils.js';
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
import './team/chat.js';
import './team/tools.js';
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
import './rsvp.js';
import './create/geocode.js';
import './create/legacy-costs.js';
import './create/legacy-location.js';
import './create/legacy-preview.js';
import './create/legacy-submit.js';
import './create/step-basics.js';
import './create/step-when.js';
import './create/step-pricing.js';
import './create/step-review.js';
import './create/raffle-builder.js';
import './create/submit.js';
import './create/sheet.js';
import './raffle.js';
import './manage/shell.js';
import './manage/overview.js';
import './manage/images.js';
import './manage/docs.js';
import './manage/rsvps.js';
import './manage/money.js';
import './manage/competition.js';
import './manage/participation.js';
import './manage/raffle.js';
import './manage/danger.js';
import './compat/global-reexports.js';
import './manage/sheet.js';
import './init.js'; // boot last (DOMContentLoaded → initEventsPage)
