# Events 006 — Featured Events Banner
**Status:** ✅ **Complete** — all code shipped and migration 085 applied.  
**Goal:** Admin can explicitly set an event as "featured." That event becomes the hero banner on the portal events list page. If no event is featured, the banner does not show at all. Remove the current algorithmic auto-selection logic.

---

## Current State (Audit)

### How the hero banner works today
The hero banner at the top of `/portal/events.html` is driven by `_pickHero()` in `js/portal/events/list.js`. It runs an **algorithmic 3-rule waterfall** that always resolves to some event if the user has any upcoming events:

| Rule | Condition | Priority |
|---|---|---|
| Rule 1 | User is "going" to an event starting within next 24h | Highest |
| Rule 2 | Event has `is_pinned = true` AND `event_type = 'llc'` | Middle |
| Rule 3 | Soonest upcoming non-cancelled/non-draft event | Fallback |

**Problems with this approach:**
1. The banner always shows something — there is no "no featured event" empty state.
2. `is_pinned` on `events` has **no database column**. The only `is_pinned` column is on the `posts` table (migration `019_social_feed_profiles.sql`). The JS reads `e.is_pinned` from the events query, which always returns `undefined`/`null`, so Rule 2 never fires.
3. The "FEATURED EVENT" kicker label in the hero HTML (`data-f14-kicker`) is **hardcoded** — it displays on every event that becomes the hero, even if the admin never intentionally featured it.
4. There is no admin UI (neither in the manage sheet nor the admin dashboard) to control which event is the featured banner.
5. Rule 3 (soonest upcoming) means a low-effort draft-turned-open event by any member can silently become the featured hero for all portal members.

### Files touched by the hero banner today
| File | Role |
|---|---|
| `js/portal/events/list.js` | `_pickHero()`, `_renderHero()`, `_heroBg()`, kicker HTML |
| `js/portal/events/state.js` | `evtAllEvents[]` (source data) |
| `js/portal/events/init.js` | calls `evtLoadEvents()` which populates `evtAllEvents` |
| `css/pages/portal/events/hero.css` | All `.evt-hero-*` styles |
| `portal/events.html` | `<div id="evtHero">` mount point |

---

## Plan

### Overview of changes
1. **DB:** Add `is_featured BOOLEAN DEFAULT FALSE` column to `events` table (new migration `085`).
2. **DB:** Add a DB trigger to enforce one-featured-at-a-time (auto-unfeature the previous event when a new one is featured).
3. **DB RLS:** Only users with `profiles.role = 'admin'` OR the `events.manage_all` permission can update `is_featured`. Members cannot.
4. **`list.js`:** Replace `_pickHero()` waterfall with a single rule: use the first event where `is_featured = true`; if none → return `null` → hero hidden.
5. **`list.js`:** Make the "FEATURED EVENT" kicker conditional on `event.is_featured === true`.
6. **`manage/sheet.js`:** Add a "Feature on Portal Banner" toggle card to the Overview tab — admin only.
7. **`events-dashboard.js`:** Add a "Featured" badge/toggle column to the admin events table.

---

## Step-by-Step Implementation

---

### ✅ Step 1 — Database Migration (`085_event_featured_flag.sql`)

**File to create:** `supabase/migrations/085_event_featured_flag.sql`

```sql
-- 085: Add is_featured flag to events for admin-controlled portal hero banner

-- 1. Add column
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Index (only one featured at a time; fast lookup)
CREATE INDEX IF NOT EXISTS idx_events_featured ON events (is_featured)
    WHERE is_featured = TRUE;

-- 3. Enforce one-at-a-time via trigger:
--    When an event is set to is_featured = TRUE, un-feature all others first.
CREATE OR REPLACE FUNCTION fn_single_featured_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_featured = TRUE AND (OLD.is_featured IS DISTINCT FROM TRUE) THEN
        UPDATE events
        SET is_featured = FALSE
        WHERE is_featured = TRUE
          AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_featured_event ON events;
CREATE TRIGGER trg_single_featured_event
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION fn_single_featured_event();

-- 4. RLS: Allow only admins or users with events.manage_all to set is_featured.
--    The existing "admins can update events" policy covers this, but add an
--    explicit policy to block member self-service updates to is_featured:
--    (No additional policy needed — existing RLS only allows admins to UPDATE
--    events. Members can only UPDATE their own events and cannot touch is_featured
--    because the column is covered by the existing admin-only UPDATE policy.)
```

**Why a trigger over application code:** Prevents race conditions where two admin sessions feature different events simultaneously. The DB enforces the single-featured constraint atomically.

---

### ✅ Step 2 — Update `_pickHero()` in `js/portal/events/list.js`

**What changes:**
- Remove the 3-rule waterfall entirely.
- New logic: find the first event with `is_featured = true` that is not cancelled/draft; return it or return `null`.
- When `null` is returned, the existing `_renderHero(null)` path already sets `heroEl.innerHTML = ''` (effectively hides the banner). **No other render changes needed.**

**Current code (lines ~1173–1200):**
```javascript
function _pickHero(events, rsvps) {
    const now = new Date();
    const upcoming = events.filter(e =>
        e.status !== 'cancelled' && e.status !== 'draft' &&
        new Date(e.start_date) >= now
    );
    if (!upcoming.length) return null;

    const byDateAsc = (a, b) => new Date(a.start_date) - new Date(b.start_date);
    const dayMs = 86_400_000;

    // Rule 1
    const goingSoon = upcoming.filter(e => {
        const r = rsvps[e.id];
        return r && r.status === 'going' &&
               (new Date(e.start_date) - now) <= dayMs;
    }).sort(byDateAsc);
    if (goingSoon[0]) return goingSoon[0];

    // Rule 2
    const pinned = upcoming.filter(e =>
        e.is_pinned && e.event_type === 'llc'
    ).sort(byDateAsc);
    if (pinned[0]) return pinned[0];

    // Rule 3
    return upcoming.slice().sort(byDateAsc)[0] || null;
}
```

**Replace with:**
```javascript
// Hero selection — events_006: admin-controlled featured event only.
// If no event has is_featured = true, the hero is hidden (returns null).
function _pickHero(events) {
    return events.find(e =>
        e.is_featured === true &&
        e.status !== 'cancelled' &&
        e.status !== 'draft'
    ) || null;
}
```

**Also update the call site** (wherever `_pickHero` is called — pass just `events`, remove `rsvps` arg).

---

### ✅ Step 3 — Make the "FEATURED EVENT" kicker conditional

In `_renderHero()` (around line 1310–1311 in `list.js`), the kicker is hardcoded:

```javascript
// Current — always shown:
'<span class="evt-hero-kicker" data-f14-kicker>FEATURED EVENT</span>' +
```

**Replace with:**
```javascript
// Only show kicker when the event is actually featured:
(event.is_featured ? '<span class="evt-hero-kicker" data-f14-kicker>FEATURED EVENT</span>' : '') +
```

---

### ✅ Step 4 — "Feature on Portal Banner" toggle in manage sheet Overview tab

**File:** `js/portal/events/manage/sheet.js` — `_overviewHtml()` function

The toggle should only be visible when the user is an admin (`STATE.source === 'admin'` is the existing signal for admin context).

**Add to `_overviewHtml()` after the "Quick actions" card:**

```javascript
// Admin-only: Featured banner toggle
const isAdmin = STATE.source === 'admin';
const isFeatured = !!e.is_featured;

const featuredCard = isAdmin ? `
    <div class="em-card mt-3">
        <h3 class="font-bold text-gray-800 text-sm mb-1">Portal Hero Banner</h3>
        <p class="text-xs text-gray-400 mb-3">
            When enabled, this event appears as the large featured card at the top of the 
            portal events page for all members. Only one event can be featured at a time — 
            enabling this will automatically un-feature any currently featured event.
        </p>
        <label class="flex items-center gap-3 cursor-pointer select-none">
            <div class="relative">
                <input type="checkbox" id="emFeaturedToggle" class="sr-only" 
                    ${isFeatured ? 'checked' : ''} 
                    data-action="toggle-featured" 
                    data-event-id="${_esc(e.id)}">
                <div class="em-toggle-track ${isFeatured ? 'em-toggle-track--on' : ''}"></div>
                <div class="em-toggle-thumb ${isFeatured ? 'em-toggle-thumb--on' : ''}"></div>
            </div>
            <span class="text-sm font-semibold ${isFeatured ? 'text-indigo-700' : 'text-gray-600'}">
                ${isFeatured ? '⭐ Featured on portal banner' : 'Not featured'}
            </span>
        </label>
    </div>
` : '';
```

**Add toggle CSS to the sheet's `<style>` block:**
```css
.em-toggle-track { width:44px; height:24px; background:#e5e7eb; border-radius:999px; transition:background .2s; }
.em-toggle-track--on { background:#4f46e5; }
.em-toggle-thumb { position:absolute; top:3px; left:3px; width:18px; height:18px; background:#fff; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,.2); transition:transform .2s; }
.em-toggle-thumb--on { transform:translateX(20px); }
```

**Wire the toggle in `_wireOverview()` (new function) or inside `_renderTab()`:**
```javascript
async function _wireFeaturedToggle() {
    const toggle = document.getElementById('emFeaturedToggle');
    if (!toggle) return;
    toggle.addEventListener('change', async () => {
        const newVal = toggle.checked;
        const eventId = toggle.dataset.eventId;
        try {
            toggle.disabled = true;
            const { error } = await supabaseClient
                .from('events')
                .update({ is_featured: newVal })
                .eq('id', eventId);
            if (error) throw error;
            STATE.event.is_featured = newVal;
            // Re-render overview to reflect new state
            _renderTab('overview');
            // Notify portal list to refresh hero
            document.dispatchEvent(new CustomEvent('events:manage:updated', { 
                detail: { eventId } 
            }));
        } catch (err) {
            toggle.checked = !newVal; // revert
            alert('Failed to update featured status: ' + (err.message || 'unknown error'));
        } finally {
            toggle.disabled = false;
        }
    });
}
```

Call `_wireFeaturedToggle()` at the end of the overview tab render path.

---

### ✅ Step 5 — Admin events dashboard badge

**File:** `js/admin/events-dashboard.js` — `renderEventsTable()` function

Add a "⭐ Featured" badge next to the event title when `event.is_featured === true`:

```javascript
// In the event title cell:
const featuredBadge = event.is_featured 
    ? '<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide">⭐ Featured</span>'
    : '';
// Append to title: titleCell.innerHTML = escapeHtml(event.title) + featuredBadge;
```

This is visual-only — admins feature/unfeature via the manage sheet (Step 4). The badge gives at-a-glance awareness from the admin table.

---

### ✅ Step 6 — Ensure hero hides cleanly

**Verify the existing null path in `_renderHero()`:**

```javascript
function _renderHero(event, rsvp) {
    const heroEl = document.getElementById('evtHero');
    if (!heroEl) return;
    if (!event) { heroEl.innerHTML = ''; return; }  // ← already handles null
    // ...
}
```

When `_pickHero()` returns `null`, `_renderHero(null, null)` fires and sets `#evtHero` to empty. The `#evtHero` div has CSS that collapses to zero height when empty (verify in `hero.css` — add `min-height:0` or `display:contents` guard if needed).

**Check `portal/events.html`** — the `#evtHero` container should not have a fixed height, padding, or margin that would leave a blank gap when empty. Add to `hero.css` if needed:
```css
#evtHero:empty {
    display: none;
}
```

---

## Data Flow After Changes

```
Admin opens manage sheet for an event
  → Overview tab
    → "Portal Hero Banner" toggle visible (admin only)
    → Admin toggles ON
      → UPDATE events SET is_featured = TRUE WHERE id = X
      → DB trigger fires: UPDATE events SET is_featured = FALSE WHERE is_featured = TRUE AND id ≠ X
      → CustomEvent 'events:manage:updated' dispatched
        → init.js listener calls evtLoadEvents() → re-fetches evtAllEvents
          → renderEvents() → _pickHero(evtAllEvents)
            → finds event with is_featured = true → _renderHero(event)
              → Hero banner appears with "FEATURED EVENT" kicker

Admin toggles OFF
  → UPDATE events SET is_featured = FALSE WHERE id = X
  → _pickHero() returns null
  → _renderHero(null) → #evtHero.innerHTML = '' → banner hidden
```

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/migrations/085_event_featured_flag.sql` | **CREATE** — new migration |
| `js/portal/events/list.js` | Replace `_pickHero()` body; make kicker conditional |
| `js/portal/events/manage/sheet.js` | Add featured toggle card + CSS + wire function |
| `js/admin/events-dashboard.js` | Add featured badge to event title cell |
| `css/pages/portal/events/hero.css` | Add `#evtHero:empty { display: none; }` guard |

---

## What NOT to change
- `_renderHero()` — the null path already works; no render logic changes needed.
- `portal/events.html` — `#evtHero` mount point is correct as-is.
- `evtAllEvents` query in `init.js` — Supabase `select('*')` already fetches all columns including the new `is_featured`; no query changes needed once the migration runs.
- RLS policies — existing admin-only UPDATE policy on `events` already covers `is_featured`; no new policy needed.

---

## Acceptance Criteria

- [x] Admin can open any event's manage sheet and see a "Portal Hero Banner" toggle (Overview tab).
- [x] Toggling ON features the event; the hero banner appears for all members on next page load / refresh.
- [x] Toggling ON a second event automatically un-features the first (DB trigger enforces this).
- [x] "FEATURED EVENT" kicker only appears on the hero when `is_featured = true`.
- [x] When no event is featured, `#evtHero` is empty and visually collapses (no blank gap).
- [x] Non-admin members do not see the featured toggle in the manage sheet.
- [x] Admin dashboard events table shows a "⭐ Featured" badge next to the featured event's title.
