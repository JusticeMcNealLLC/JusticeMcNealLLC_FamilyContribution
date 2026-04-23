// Smoke test for events_004 D1 calendar view toggle
const fs = require('fs');
const path = 'd:/SMOJO/Online/Buisness/JusticeMcNealLLC_02';

const listJs  = fs.readFileSync(path + '/js/portal/events/list.js', 'utf8');
const htmlTxt = fs.readFileSync(path + '/portal/events.html', 'utf8');
const cssText = fs.readFileSync(path + '/css/pages/portal-events.css', 'utf8');
const swText  = fs.readFileSync(path + '/sw.js', 'utf8');

const results = {
    // State
    d1_active_view_state:       /let\s+_activeView\s*=\s*'list'/.test(listJs),
    d1_cal_month_state:         /let\s+_calMonth\s*=\s*null/.test(listJs),
    d1_persist_v_key:           /v:\s*_activeView/.test(listJs),
    d1_restore_v_key:           /s\.v === 'list'[\s\S]{0,30}s\.v === 'calendar'/.test(listJs),

    // Renderers
    d1_render_calendar_fn:      /function\s+_renderCalendar/.test(listJs),
    d1_group_by_day_fn:         /function\s+_groupEventsByDay/.test(listJs),
    d1_local_date_key_fn:       /function\s+_localDateKey/.test(listJs),
    d1_wire_calendar_fn:        /function\s+_wireCalendarClicks/.test(listJs),
    d1_open_day_modal_fn:       /function\s+_openDayModal/.test(listJs),
    d1_close_day_modal_fn:      /function\s+_closeDayModal/.test(listJs),
    d1_init_view_toggle_fn:     /function\s+_initViewToggle/.test(listJs),
    d1_apply_view_chrome_fn:    /function\s+_applyViewChrome/.test(listJs),

    // Integration
    d1_render_branches_cal:     /_activeView === 'calendar'[\s\S]{0,500}_renderCalendar\(\)/.test(listJs),
    d1_init_wired_in_onready:   /_initViewToggle\(\)/.test(listJs),
    d1_apply_chrome_in_restore: /_applyRestoredUi[\s\S]{0,2000}_applyViewChrome\(\)/.test(listJs),
    d1_modal_esc_handler:       /Escape[\s\S]{0,80}_closeDayModal/.test(listJs),
    d1_filters_applied_cal:     /_groupEventsByDay[\s\S]{0,400}_matchesType[\s\S]{0,200}_matchesCategory/.test(listJs),

    // HTML hooks
    d1_view_toggle_button:      /id="evtViewToggle"/.test(htmlTxt),
    d1_calendar_mount:          /id="evtCalendarMount"/.test(htmlTxt),
    d1_day_modal:               /id="evtDayModal"/.test(htmlTxt),
    d1_day_modal_title:         /id="evtDayModalTitle"/.test(htmlTxt),
    d1_day_modal_body:          /id="evtDayModalBody"/.test(htmlTxt),

    // CSS
    d1_cell_css:                cssText.includes('.evt-cal-cell'),
    d1_today_css:               cssText.includes('.evt-cal-cell--today'),
    d1_has_css:                 cssText.includes('.evt-cal-cell--has'),
    d1_dot_css:                 cssText.includes('.evt-cal-dot'),
    d1_view_body_class:         cssText.includes('body.evt-view--calendar'),
    d1_reduced_motion:          /prefers-reduced-motion[\s\S]*?evtCalendarMount/.test(cssText),

    // SW
    sw_bumped_to_v55:           swText.includes("'jm-portal-v55'"),
    sw_no_leftover_v54:         !swText.includes("'jm-portal-v54'"),
};

console.log(JSON.stringify(results, null, 2));
const allPass = Object.values(results).every(Boolean);
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ FAIL');
process.exit(allPass ? 0 : 1);
