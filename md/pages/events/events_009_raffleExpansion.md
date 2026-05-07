# events_009 - Raffle System Expansion

**Goal:** Expand raffles from a simple entry-price plus flat prize list into a full raffle setup and drawing system. Hosts should configure prize categories, prize items, item images, winner counts, draw order, and draw behavior during event creation. Event details should show a polished attendee-facing raffle section, while winner drawing should live inside the Manage Event module.

**Primary user stories:**
- As a host creating an event, I can enable a raffle and fully configure the prizes before publishing.
- As a host, I can group prizes into ordered categories such as Medium, Large, and Grand Prize.
- As a host, I can choose whether each category draws for specific items, random items within the category, or lets winners choose from the category.
- As a host, I can add an optional prize image or choose an emoji fallback when no image is available.
- As an attendee, I can understand the raffle, prizes, categories, entry status, and winners from a clean event details section.
- As a host/admin, I draw raffle winners from Manage Event, not inline inside the public/detail page.

**Confirmed implementation assumptions:**
- Existing events are test data, so backwards compatibility should prevent broken pages but does not need to constrain the final raffle design.
- The end-game outcome matters more than preserving every interim legacy behavior.
- Prize images can use a dedicated Supabase Storage bucket such as `event-raffle-prizes` once the builder is stable.
- Each prize item should support an optional emoji fallback for hosts who do not have an image to upload.
- Winner choice should remain a later phase after category drawing and item assignment are stable.
- Category `sort_order` is the official draw order, so smaller tiers can draw before larger/grand tiers.

**Files likely in scope:**
- `js/portal/events/create/sheet.js` - current default create-event sheet
- `js/portal/events/create.js` - legacy/admin create flow with simple prize inputs
- `js/portal/events/detail.js` - portal event detail raffle section and current inline draw button
- `js/events/raffle.js` - public event raffle section
- `js/portal/events/raffle.js` - current draw modal and winner persistence
- `js/portal/events/manage/sheet.js` - Manage Event raffle tab, currently read-only for drawing
- `portal/events.html` - current `raffleDrawModal` shell
- `css/pages/portal/events/detail.css` - event detail visual raffle styles
- `css/pages/public-event.css` - public raffle section styles, if public page receives matching polish
- `supabase/migrations/*` - schema changes if winner records need prize/category metadata beyond text
- `supabase/functions/create-event-checkout/index.ts`, `stripe-webhook/index.ts`, `raffle-guest-free/index.ts` - entry creation and payment behavior should be regression-tested

---

## Current System Audit

### Event Creation

- [x] Default creation module is `js/portal/events/create/sheet.js`.
- [x] The create sheet has four steps: Basics, When & Where, Pricing, Review.
- [x] Raffle setup in the create sheet is minimal: `raffle_enabled` plus `raffle_entry_cost_dollars`.
- [x] The create sheet currently displays: "Configure prizes from the event detail page after publishing."
- [x] The create sheet does not store `raffle_type`, `raffle_draw_trigger`, `raffle_winner_count`, or `raffle_prizes`.
- [x] Validation currently requires raffle entry price to be greater than zero when raffle is enabled, which blocks free raffles from the default create sheet.
- [x] Legacy create flow in `js/portal/events/create.js` already supports a basic raffle config: `raffle_type`, `raffle_draw_trigger`, and a flat text-only `raffle_prizes` array.
- [x] Legacy prize objects are stored as `{ place, description }`.

### Database Shape

- [x] `events` has `raffle_enabled`, `raffle_type`, `raffle_draw_trigger`, `raffle_prizes JSONB`, `raffle_entry_cost_cents`, and `raffle_winner_count`.
- [x] `event_raffle_entries` tracks member/guest raffle entries and payment status.
- [x] `event_raffle_winners` stores `event_id`, `place`, `user_id`, `guest_token`, and `prize_description`.
- [x] Winner records do not currently store prize id, category id, draw mode, chosen item id, or image metadata.
- [x] Current schema can support richer prize configuration inside `events.raffle_prizes`, but winner history needs either new columns or a richer `prize_description` strategy if we want durable category/item assignment.

### Entry Flow

- [x] Member paid raffle entries go through `create-event-checkout` and `stripe-webhook`.
- [x] Member free raffle entries insert directly from portal/public JS with `paid: true`.
- [x] Guest paid raffle entries go through checkout with guest name/email metadata.
- [x] Guest free raffle entries go through `raffle-guest-free` edge function.
- [x] Current draw pool uses `event_raffle_entries.paid = true`, which is fine for both paid entries and free confirmed entries because free entries are stored as paid/valid.

### Current Draw Logic

- [x] Draw code lives in `js/portal/events/raffle.js`.
- [x] Draw UI opens from `evtOpenRaffleDraw(eventId)` using the modal in `portal/events.html`.
- [x] Draw uses crypto-random selection from eligible entries.
- [x] Previous winners are excluded by user id or guest token.
- [x] Current draw order is `place` based: place 1, place 2, place 3.
- [x] Current prize assignment uses `event.raffle_prizes[place - 1]`.
- [x] There is no category draw order, no item quantity handling, no random item within category, and no winner-choice workflow.
- [x] Current draw button appears inline in `js/portal/events/detail.js` for hosts when no winners exist.

### Manage Event Module

- [x] Manage Event has a raffle tab in `js/portal/events/manage/sheet.js`.
- [x] The raffle tab currently shows entries, revenue, prize count, winners drawn, configuration, prizes, and winners.
- [x] The raffle tab is read-only for drawing and says drawing will land in a later milestone.
- [x] This is the correct home for host/admin draw controls.

### Event Details Visual State

- [x] Portal detail raffle section is in `js/portal/events/detail.js`.
- [x] Public detail raffle section is in `js/events/raffle.js`.
- [x] Both render a flat prize list and simple pill metadata.
- [x] Current portal detail can show attendee entry state and winners.
- [x] Visual presentation is currently functional but not polished enough for a richer raffle.
- [x] Host-only draw action is currently mixed into attendee-facing detail content.

---

## Target Raffle Data Model

Use a versioned JSON shape in `events.raffle_prizes` so we can evolve without immediately splitting into multiple tables. Add columns to `event_raffle_winners` only where durable winner assignment needs to be queryable.

### Proposed `events.raffle_prizes` v2 Shape

```json
{
  "version": 2,
  "winner_count": 10,
  "categories": [
    {
      "id": "medium",
      "label": "Medium Items",
      "sort_order": 10,
      "winner_count": 7,
      "draw_mode": "random_item"
    },
    {
      "id": "large",
      "label": "Large Items",
      "sort_order": 20,
      "winner_count": 2,
      "draw_mode": "specific_item"
    },
    {
      "id": "grand",
      "label": "Grand Prize",
      "sort_order": 30,
      "winner_count": 1,
      "draw_mode": "specific_item"
    }
  ],
  "items": [
    {
      "id": "item_abc123",
      "category_id": "medium",
      "name": "Bluetooth Speaker",
      "image_url": null,
      "emoji": "🎧",
      "quantity": 1,
      "sort_order": 10
    }
  ]
}
```

### Draw Modes

- [ ] `specific_item` - draw one winner for each item/quantity slot in the category, in item sort order.
- [ ] `random_item` - draw a winner for the category, then randomly assign one available item from that category.
- [ ] `winner_choice` - draw a winner for the category, store the category win, and mark prize selection as pending.

### Winner Record Metadata

- [x] Add `prize_id TEXT NULL` to `event_raffle_winners`.
- [x] Add `category_id TEXT NULL` to `event_raffle_winners`.
- [x] Add `category_label TEXT NULL` to `event_raffle_winners`.
- [x] Add `draw_mode TEXT NULL` to `event_raffle_winners`.
- [x] Add `prize_image_url TEXT NULL` to `event_raffle_winners`.
- [x] Add `prize_emoji TEXT NULL` to `event_raffle_winners`.
- [x] Add `selection_status TEXT DEFAULT 'assigned'` with values like `assigned`, `pending_choice`, `claimed`.
- [x] Keep `prize_description` for backwards compatibility and notification text.

### Compatibility

- [x] Build a normalization helper that converts legacy flat arrays like `[{ place, description }]` into a v2-compatible structure.
- [x] Keep existing event detail and draw flows from breaking for legacy/test raffles until each renderer is upgraded.
- [x] Treat simple string prizes as specific item prizes in one default category.

---

## Progression Plan

## Phase 1 - Shared Raffle Model Helpers

- [x] Create a shared normalizer for raffle config in `js/portal/events/raffle-model.js` and load it before detail/manage/create code.
- [x] Support both legacy array prizes and v2 object config.
- [x] Add helpers for `getOrderedCategories(config)`, `getItemsForCategory(config, categoryId)`, `getTotalWinnerCount(config)`, and `getDrawQueue(config, existingWinners)`.
- [x] Define id generation for categories and items using stable client ids.
- [x] Normalize each item with `name`, `image_url`, `emoji`, `quantity`, `category_id`, and `sort_order`.
- [x] Add JS smoke checks for legacy -> v2 normalization.

## Phase 2 - Schema Migration for Winner Metadata

- [x] Add a Supabase migration for winner metadata columns.
- [x] Keep existing `event_raffle_winners` rows valid with null metadata.
- [x] Update notification trigger text to prefer `prize_description` and remain backwards compatible.
- [x] Confirm RLS still allows event creators/admins to insert winner rows with the new columns.

## Phase 3 - Event Creation Raffle Builder

- [x] Expand `STATE.form` in `js/portal/events/create/sheet.js` with raffle config: categories, items, winner count, and entry price.
- [x] Allow free raffles by permitting zero-dollar raffle entry when raffle is enabled.
- [x] Replace the current "configure prizes later" helper text with an inline builder.
- [x] Add category rows with label, sort controls, winner count, and draw mode selector.
- [x] Add prize item rows with name, emoji fallback, future image slot, category select, quantity, and sort controls.
- [x] Add an emoji picker/input for prize items as the no-image fallback.
- [x] Store image URL and emoji fallback fields on each prize item; upload/display preference lands in the image and visual phases.
- [ ] Add item image upload support after the builder is stable, using a dedicated `event-raffle-prizes` Supabase Storage bucket.
- [x] Validate that each enabled raffle has at least one category and at least one prize item unless the host explicitly marks prizes as TBD.
- [x] Validate category winner counts against available item quantity for `specific_item` and `random_item` modes.
- [x] Show a review summary grouped by category before publishing.
- [x] Store v2 config into `record.raffle_prizes` and set `raffle_winner_count`.
- [ ] Match/upgrade the legacy create flow in `js/portal/events/create.js` or route it through the same builder/normalizer so both entry points do not diverge.

## Phase 4 - Manage Event Raffle Tab Becomes Operational

- [x] Move the draw entry point from event detail into the Manage Event raffle tab.
- [x] Replace the read-only note in `js/portal/events/manage/sheet.js` with draw controls.
- [x] Show ordered category progress: entries, winners drawn, winners remaining, prize slots remaining.
- [x] Render each category as an operational panel with its configured draw mode.
- [x] Add a "Draw next winner" action that follows category sort order, drawing smaller/lower-sort categories first.
- [ ] Add category-specific draw actions if the host wants to draw a single category manually.
- [x] Prevent drawing beyond configured winner count.
- [x] Preserve crypto-random participant selection.
- [x] Assign prize metadata based on draw mode and persist it into `event_raffle_winners`.
- [x] Persist prize image URL and emoji fallback when a winner is assigned an item.
- [x] For `winner_choice`, create winner rows with `selection_status = 'pending_choice'` and category metadata but no assigned item.
- [x] Refresh Manage Event tab data after each draw.
- [x] Keep the existing modal or convert it into an embedded manage-sheet drawer; choose whichever feels cleaner in the existing Manage Event UI.

## Phase 5 - Remove Inline Host Drawing From Event Details

- [x] Remove `Draw Raffle Winners` from `js/portal/events/detail.js` attendee-facing raffle section.
- [x] If the viewer is host/admin, show a subtle `Manage raffle` link/button that opens `window.EventsManage.open(eventId, { tab: 'raffle' })`.
- [x] Keep attendee actions limited to entering, seeing entry state, viewing prize info, and viewing winners.
- [x] Ensure public event page never exposes host draw controls.

## Phase 6 - Event Detail Raffle Visual Overhaul

- [x] Redesign portal raffle section as a polished, scan-friendly card/group rather than flat rows.
- [x] Show raffle state clearly: entry cost/free, included with paid RSVP, entries open/closed, entered/not entered.
- [x] Group prizes by category in draw order.
- [x] Display optional prize images with stable aspect ratios and graceful emoji/initial fallbacks.
- [x] Display prize emoji fallbacks when an item has no uploaded image.
- [x] Show item quantity where applicable.
- [x] Display category draw mode in plain user language: "Winners choose from this tier", "Random prize assigned", or "Drawing specific prizes".
- [x] Show winners grouped by category after draw.
- [x] Show pending-choice winners differently from assigned winners.
- [x] Update mobile styles so raffle cards do not feel crowded inside the event detail page.
- [x] Apply a matching but public-safe version in `js/events/raffle.js` and `css/pages/public-event.css`.

## Phase 7 - Prize Image Upload

- [ ] Create or document the dedicated `event-raffle-prizes` Supabase Storage bucket.
- [ ] Add upload handling for prize item images after the builder model is stable.
- [ ] Store uploaded image URLs on the matching v2 prize item.
- [ ] Keep emoji fallback available even when upload fails or the host skips image upload.
- [ ] Confirm public and portal raffle renderers prefer image, then emoji, then initials.

## Phase 8 - Winner Choice Flow

- [x] Decide whether winner choice is host-managed, winner self-service, or both.
- [x] For host-managed choice, add a Manage Event action to assign an item to a pending-choice winner.
- [ ] For winner self-service, add a secure claim link or authenticated portal path.
- [x] Prevent two winners from choosing the same quantity-limited item.
- [x] Mark selected items as claimed/assigned in winner metadata.
- [x] Add UI for pending choice, chosen item, and completed claim.
- [ ] Decide whether a later self-service claim path is still needed after the host-managed assignment flow.

## Phase 9 - Tests and Regression Coverage

- [x] Add unit-style smoke tests for raffle config normalization and draw queue generation.
- [ ] Add Playwright coverage for create sheet raffle builder: categories, items, emoji fallback path, review summary, publish payload.
- [x] Browser-verify Manage Event raffle draw against a seeded v2 event: draw order, category panels, winner persistence fallback, and tab refresh.
- [ ] Add automated Playwright coverage for Manage Event raffle draw: draw order, category draw, winner persistence, duplicate-prevention.
- [ ] Regression-test paid RSVP bundled raffle entry behavior.
- [ ] Regression-test paid raffle checkout entry behavior.
- [ ] Regression-test free member and free guest raffle entry behavior.
- [ ] Regression-test legacy raffles created before v2 config.

---

## Suggested Implementation Order

1. Shared model helper and compatibility adapter with emoji/image item fields.
2. Schema migration for winner metadata.
3. Create sheet raffle builder, storing v2 config with emoji fallback support.
4. Manage Event operational draw controls.
5. Remove inline draw from event details.
6. Visual overhaul of attendee-facing raffle sections.
7. Prize image upload using a dedicated `event-raffle-prizes` bucket.
8. Winner choice workflow.
9. Full test pass and cleanup.

---

## Resolved Product Decisions

- [x] Existing events are test data, so compatibility should protect pages but not limit the final system.
- [x] Use a dedicated prize-image bucket later, after the builder and model are stable.
- [x] Add an emoji fallback for every prize item without an uploaded image.
- [x] Defer winner-choice selection until the category draw system works.
- [x] Use category sort order as the official draw order.

## Proposed Defaults Pending Confirmation

- [ ] Treat prize `quantity` as the source of available item slots.
- [ ] Let category `winner_count` cap how many winners are drawn from that category.
- [ ] If category `winner_count` is blank, default it to the sum of item quantities in that category.
- [ ] If category `winner_count` is lower than item quantity, draw only the configured winner count and leave extra quantity unused.
- [ ] If category `winner_count` is higher than item quantity for `specific_item` or `random_item`, block publish until the host adds more item quantity or lowers the winner count.

## Open Product Decisions

- [ ] Confirm whether the proposed quantity defaults above should become the official behavior.
- [ ] For the later `winner_choice` phase, should winners choose items themselves from their account/ticket page, or should hosts assign choices inside Manage Event first?

---

## First Build Slice

- [x] Implement the raffle config normalizer and draw queue helper.
- [x] Add the create sheet builder with category/item rows and review summary.
- [x] Include optional emoji fallback support in the first builder pass.
- [x] Store v2 config in `events.raffle_prizes` while keeping legacy/test renderers from breaking.
- [x] Verify a newly seeded v2 raffle event displays category/item prizes correctly after the visual overhaul.

---

## Browser Verification Notes

- [x] Seeded test event `Events 009 V2 Raffle Test mot0ti8q` with slug `events-009-v2-raffle-mot0ti8q`.
- [x] Seeded v2 raffle config with `Medium Items`, `Large Items`, and `Grand Prize` categories.
- [x] Seeded one valid paid raffle entry for the signed-in test/admin user.
- [x] Verified portal detail renders 3 categories, 4 prize items, emoji fallbacks, quantities, and `Manage raffle`.
- [x] Verified `Manage raffle` opens Manage Event directly on the Raffle tab.
- [x] Drew the first winner from the Manage raffle flow and confirmed the tab refreshed to `1/4` drawn.
- [x] Confirmed draw modal now stacks above the Manage Event sheet.
- [x] Confirmed legacy winner fallback remains usable when the live database has not applied winner metadata columns yet.
- [x] Applied migration `086_event_raffle_winner_metadata.sql` to the linked Supabase database.
- [x] Seeded a second paid guest raffle entry and drew the second winner after migration 086.
- [x] Confirmed the second winner row persisted `prize_id`, `category_id`, `category_label`, `draw_mode`, `prize_emoji`, and `selection_status` metadata.
- [x] Confirmed card footer `Details` opens event details without changing RSVP state.
- [x] Verified public event page renders the same v2 raffle categories/items/winners without draw or Manage Event controls.
- [x] Verified the actual Manage Raffle `Draw next winner` button opens the draw modal after explicit button wiring.
- [x] Drew the third winner for the `Large Items` specific-prize slot and confirmed `speaker` metadata persisted.
- [x] Drew the fourth winner for the `Grand Prize` winner-choice slot and confirmed `selection_status = pending_choice` with no assigned `prize_id`.
- [x] Confirmed Manage Raffle shows `All winners drawn` once the configured winner count is reached.
- [x] Reloaded the public event page after all draws and confirmed all four winner rows render with the pending-choice winner shown as `Choosing later`.
- [x] Applied migration `087_event_raffle_winner_choice_update.sql` so hosts/admins can update pending winner-choice rows.
- [x] Verified Manage Raffle renders an `Assign prize` selector for pending-choice winners.
- [x] Assigned the Grand Prize winner to `Grand Prize Choice` from the Manage Raffle UI.
- [x] Confirmed the assigned winner row persisted `prize_id = weekend-choice`, `prize_emoji = 🏆`, and `selection_status = assigned`.
- [x] Reloaded the public event page after assignment and confirmed the winner now shows `Grand Prize Choice` instead of `Choosing later`.

---

## First Build Implementation Notes

### Shared Raffle Model Contract

- [x] Create a browser-safe helper module at `js/portal/events/raffle-model.js`.
- [x] Expose the helper as `window.EventsRaffleModel` so non-module scripts can use it without changing the whole events bundle pattern.
- [x] Load the helper before create/detail/manage/raffle scripts in `portal/events.html`.
- [x] Keep the helper pure: no Supabase calls, DOM reads, or UI rendering.
- [x] Export/attach these functions first:
  - [x] `normalizeConfig(rawPrizes, options)`
  - [x] `createDefaultConfig()`
  - [x] `createCategory(overrides)`
  - [x] `createItem(overrides)`
  - [x] `getOrderedCategories(config)`
  - [x] `getItemsForCategory(config, categoryId)`
  - [x] `getTotalWinnerCount(config)`
  - [x] `getDrawQueue(config, existingWinners)`
  - [x] `validateConfig(config)`
- [x] Return normalized configs in the same v2 shape that will be stored in `events.raffle_prizes`.
- [x] Preserve unknown future fields when possible so later phases do not wipe data.

### Normalization Rules

- [x] Empty/null raffle prizes normalize to a v2 config with no categories and no items.
- [x] Legacy arrays of `{ place, description }` normalize into one `general` category with `specific_item` mode.
- [x] Legacy string arrays normalize into one `general` category with one item per string.
- [x] v2 configs normalize by sorting categories/items, filling missing ids, coercing numeric fields, and defaulting missing draw modes to `specific_item`.
- [x] Item quantity must be an integer of at least 1.
- [x] Category `sort_order` should decide draw order, then label/id can break ties.
- [x] Item `sort_order` should decide item order within a category, then name/id can break ties.
- [x] Missing item emoji can default to `🎁`.
- [x] Missing item image URL should stay `null`, not an empty string.

### Draw Queue Rules

- [x] The draw queue should return ordered prize slots, not winners.
- [x] A slot should include `place`, `category_id`, `category_label`, `draw_mode`, `prize_id`, `prize_name`, `prize_image_url`, `prize_emoji`, and `selection_status`.
- [x] `specific_item` should expand item quantity into one slot per available quantity.
- [x] `random_item` should create category slots up to `winner_count`, with item assignment deferred until draw time.
- [x] `winner_choice` should create category slots up to `winner_count`, with `selection_status = 'pending_choice'`.
- [x] Existing winners should remove already-drawn slots using `prize_id`/category metadata where available and `place` as a fallback.
- [x] The first queue item is what Manage Event should draw next.

### Create Sheet Builder Contract

- [x] Store the in-progress config on `STATE.form.raffle_config`.
- [x] Seed new raffle configs with Medium, Large, and Grand Prize categories as a friendly default, but allow hosts to edit/delete/reorder them.
- [x] Add controls for category label, draw mode, winner count, and order.
- [x] Add controls for item name, emoji, category, quantity, and order.
- [x] Keep the image UI as a disabled/future slot or hidden data field in this first slice so the model is ready without shipping uploads yet.
- [x] Update review step to show categories in draw order and items inside each category.
- [x] Store `record.raffle_prizes = normalizeConfig(STATE.form.raffle_config)` during submit.
- [x] Store `record.raffle_winner_count = getTotalWinnerCount(record.raffle_prizes)` during submit.
- [x] Allow `raffle_entry_cost_cents = 0` when a raffle is enabled.

### First Build Acceptance Checks

- [x] `node --check js/portal/events/raffle-model.js` passes.
- [x] `node --check js/portal/events/create/sheet.js` passes after builder edits.
- [ ] A new raffle event can be created with three categories: Medium, Large, Grand Prize.
- [ ] A host can add items with names, emoji fallbacks, category selection, and quantities.
- [ ] The saved event record includes v2 `raffle_prizes` with `version: 2`, `categories`, and `items`.
- [ ] The saved event record includes the expected `raffle_winner_count`.
- [ ] Free raffles can be published with `$0` raffle entry cost.
- [ ] Legacy/test raffle data still renders without a hard JS failure before the visual overhaul phase.
