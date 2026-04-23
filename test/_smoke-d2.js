// Smoke test for events_004 D2 swipe gestures + long-press context sheet + .ics
const fs = require('fs');
const path = 'd:/SMOJO/Online/Buisness/JusticeMcNealLLC_02';

const listJs  = fs.readFileSync(path + '/js/portal/events/list.js', 'utf8');
const cssText = require('./_events-css');
const swText  = fs.readFileSync(path + '/sw.js', 'utf8');

// Behavior probes — load list.js minimally to test ICS generator + clipboard fallback.
// Stub minimal globals.
const window = {};
global.window = window;
global.navigator = { userAgent: 'node', clipboard: undefined };
global.location = { origin: 'https://example.test', pathname: '/portal/events.html' };
global.document = {
    body: { classList: { add(){}, remove(){}, contains(){return false;}, toggle(){} } },
    addEventListener(){}, removeEventListener(){},
    getElementById(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    createElement(tag){
        return {
            tagName: tag, style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
            setAttribute(){}, appendChild(){}, removeChild(){}, click(){}, remove(){},
            querySelector(){ return null; }, querySelectorAll(){ return []; },
            addEventListener(){}, focus(){},
            set innerHTML(_){}, get innerHTML(){return '';},
            set textContent(_){}, get textContent(){return '';},
        };
    },
};

// Just probe via regex (loading the IIFE requires lots of globals).
const results = {
    // State / helpers
    d2_hidden_set:              /const _hiddenIds = new Set\(\)/.test(listJs),
    d2_swipe_threshold:         /SWIPE_THRESHOLD\s*=\s*56/.test(listJs),
    d2_longpress_ms:            /LONGPRESS_MS\s*=\s*500/.test(listJs),
    d2_is_mobile_touch_fn:      /function _isMobileTouch/.test(listJs),
    d2_prefers_reduced_fn:      /function _prefersReducedMotion/.test(listJs),
    d2_not_hidden_helper:       /function _notHidden/.test(listJs),

    // Swipe
    d2_init_swipe_fn:           /function _initSwipeGestures/.test(listJs),
    d2_ensure_action_fn:        /function _ensureSwipeAction/.test(listJs),
    d2_reset_card_fn:           /function _resetSwipeCard/.test(listJs),
    d2_swipe_action_class:      listJs.includes("'evt-swipe-action'"),
    d2_swipe_revealed_class:    listJs.includes("'evt-swipe--revealed'"),
    d2_data_swipe_cancel:       listJs.includes('data-swipe-cancel'),
    d2_swipe_wired_flag:        listJs.includes("dataset.swipeWired"),
    d2_axis_lock:               /Math\.abs\(dx\)\s*>\s*Math\.abs\(dy\)/.test(listJs),
    d2_clamps_left_only:        /Math\.max\(-SWIPE_MAX,\s*Math\.min\(0,/.test(listJs),
    d2_calls_handle_rsvp:       /window\.evtHandleRsvp\(eventId,\s*'going'\)/.test(listJs),
    d2_confirm_cancel_fn:       /function _confirmCancelRsvp/.test(listJs),

    // Long-press
    d2_longpress_timer:         /_longPressTimer\s*=\s*setTimeout/.test(listJs),
    d2_longpress_move_cancel:   /LONGPRESS_MOVE/.test(listJs),
    d2_lp_wired_flag:           listJs.includes("dataset.lpWired"),
    d2_suppress_click_after_lp: /_longPressFired[\s\S]{0,120}preventDefault/.test(listJs),

    // Context sheet + actions
    d2_ensure_ctx_sheet_fn:     /function _ensureContextSheet/.test(listJs),
    d2_open_ctx_fn:             /function _openContextSheet/.test(listJs),
    d2_close_ctx_fn:            /function _closeContextSheet/.test(listJs),
    d2_run_ctx_action_fn:       /function _runContextAction/.test(listJs),
    d2_share_action:            /data-ctx-act="share"/.test(listJs),
    d2_copy_action:             /data-ctx-act="copy"/.test(listJs),
    d2_ics_action:              /data-ctx-act="ics"/.test(listJs),
    d2_hide_action:             /data-ctx-act="hide"/.test(listJs),
    d2_navigator_share_path:   /navigator\.share/.test(listJs),

    // ICS generator
    d2_download_ics_fn:         /function _downloadIcs/.test(listJs),
    d2_ics_begin_vcalendar:     listJs.includes("'BEGIN:VCALENDAR'"),
    d2_ics_uid:                 /UID:'\s*\+\s*uid/.test(listJs),
    d2_ics_dtstart:             /'DTSTART:'\s*\+\s*_icsDate\(start\)/.test(listJs),
    d2_ics_blob_calendar:       /text\/calendar/.test(listJs),
    d2_ics_escape_fn:           /function _icsEscape/.test(listJs),
    d2_ics_date_utc:            /getUTCFullYear/.test(listJs),

    // Filter integration
    d2_not_hidden_in_normal:    /_matchesType\(e\)\s*&&\s*_matchesCategory\(e\)\s*&&\s*_matchesLifecycle\(e\)\s*&&\s*_notHidden\(e\)/.test(listJs),
    d2_not_hidden_in_search:    /_searchQuery[\s\S]{0,800}_notHidden/.test(listJs),
    d2_not_hidden_in_calendar:  /_groupEventsByDay[\s\S]{0,400}_notHidden/.test(listJs),
    d2_not_hidden_in_rail:     /_renderGoingRail[\s\S]{0,1200}_notHidden/.test(listJs),

    // Wired in onReady
    d2_init_wired_in_onready:   /_initSwipeGestures\(\)/.test(listJs),

    // Toast helper
    d2_toast_fn:                /function _toast/.test(listJs),

    // CSS
    d2_swipe_action_css:        cssText.includes('.evt-swipe-action'),
    d2_swipe_revealed_css:      cssText.includes('.evt-swipe--revealed'),
    d2_context_sheet_css:       cssText.includes('.evt-context-sheet'),
    d2_context_row_css:         cssText.includes('.evt-context-row'),
    d2_toast_css:               cssText.includes('.evt-toast'),
    d2_reduced_motion_swipe:    /prefers-reduced-motion[\s\S]*?evt-swipe-host/.test(cssText),
    d2_reduced_motion_ctx:      /prefers-reduced-motion[\s\S]*?evt-context-sheet/.test(cssText),

    // SW
    sw_bumped_past_v55:         /jm-portal-v(5[6-9]|[6-9]\d|\d{3,})/.test(swText),
    sw_no_leftover_v55:         !swText.includes("'jm-portal-v55'"),
};

console.log(JSON.stringify(results, null, 2));
const allPass = Object.values(results).every(Boolean);
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ FAIL');
process.exit(allPass ? 0 : 1);
