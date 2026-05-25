'use strict';

/** Shared Tailwind class strings for team tools + chat (scanned by tailwind.config.js). */

export const TW_CTA_BTN = 'evt-cta-btn flex flex-1 items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[15px] font-bold tracking-wide cursor-pointer whitespace-nowrap transition active:scale-[0.97] disabled:cursor-not-allowed [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.5]';

export const TW_CTA_BAR = [
    'evt-cta-bar',
    'hidden max-lg:flex max-lg:flex-col max-lg:gap-2',
    'max-lg:fixed max-lg:inset-x-0 max-lg:z-[49]',
    'max-lg:bg-white max-lg:border-t max-lg:border-gray-100',
    'max-lg:bottom-[calc(56px+env(safe-area-inset-bottom))]',
    'max-lg:backdrop-blur-sm',
].join(' ');

export const TW_CTA_BAR_EXPANDED = 'evt-cta-bar-expanded max-lg:top-[max(6px,env(safe-area-inset-top))] max-lg:bottom-[calc(56px+env(safe-area-inset-bottom))] max-lg:justify-end max-lg:gap-2.5 max-lg:overflow-hidden max-lg:overscroll-none max-lg:bg-white/95 max-lg:backdrop-blur-xl max-lg:shadow-[0_-6px_28px_rgba(15,23,42,0.1)] max-lg:border-t max-lg:border-black/5';

/** Mobile team chat — full-bleed sheet; bar itself has zero padding. */
export const TW_CTA_BAR_CHAT_MOBILE = [
    'evt-cta-bar-chat',
    'max-lg:!top-0 max-lg:inset-x-0 max-lg:rounded-none',
    'max-lg:!p-0 max-lg:gap-0',
    'max-lg:border-0 max-lg:shadow-none max-lg:backdrop-blur-none max-lg:bg-white',
    'max-lg:pt-[env(safe-area-inset-top,0px)]',
].join(' ');

export const TW_DESKTOP_OVERLAY = [
    'evt-team-tools-overlay',
    'lg:fixed lg:inset-0 lg:z-[60] lg:flex lg:items-center lg:justify-center',
    'lg:bg-slate-900/45 lg:p-6',
].join(' ');

export const TW_PANEL_BASE = 'evt-cta-panel relative flex w-full flex-col min-h-0 overflow-hidden max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none max-lg:rounded-none lg:rounded-2xl lg:border lg:border-gray-200 lg:bg-white lg:shadow-lg';

export const TW_PANEL_TOOLS = 'max-lg:p-0 max-lg:max-h-none lg:p-5 lg:max-h-[80vh] lg:w-full lg:max-w-md lg:overflow-auto lg:shadow-2xl';

export const TW_PANEL_CHAT = 'p-0 max-lg:border-0 max-lg:shadow-none lg:min-h-[28rem] lg:max-w-lg lg:overflow-hidden lg:rounded-2xl lg:shadow-2xl';

export const TW_PANEL_EXPANDED = 'flex-1 max-h-none min-h-0 max-lg:overflow-hidden max-lg:overscroll-none';

export const TW_CLOSE_BTN = 'evt-cta-panel-close absolute top-0 right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-lg font-bold leading-none text-gray-700 hover:bg-gray-50 max-lg:border-0 max-lg:bg-gray-100 lg:top-2.5 lg:right-2.5';

export const TW_PANEL_HEAD = 'evt-cta-panel-head mb-2 pr-9 max-lg:mb-2.5 max-lg:px-3 max-lg:pr-8';
export const TW_PANEL_HEAD_TITLE = 'block text-[15px] font-semibold leading-tight text-gray-900';
export const TW_PANEL_HEAD_SUB = 'mt-0.5 block text-xs leading-snug text-gray-500';

export const TW_TOOL_BTN = 'evt-team-tool-btn flex w-full flex-col items-start gap-0.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left text-sm font-semibold text-gray-900 transition hover:bg-gray-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55';
export const TW_TOOL_MAIN = 'evt-team-tool-main leading-tight';
export const TW_TOOL_SUB = 'evt-team-tool-sub text-xs font-medium leading-snug text-gray-500';

export const TW_CHAT_ROOT = 'flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white max-lg:rounded-none lg:rounded-2xl';
export const TW_CHAT_NAV = 'grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-gray-200/80 bg-gray-50/95 px-3 py-2.5 backdrop-blur-xl max-lg:rounded-none max-lg:border-x-0 max-lg:border-t-0';
export const TW_CHAT_BACK = 'justify-self-start border-0 bg-transparent py-1 text-[17px] font-normal text-[#007AFF] cursor-pointer';
export const TW_CHAT_NAV_CENTER = 'min-w-0 text-center';
export const TW_CHAT_NAV_TITLE = 'block truncate text-base font-semibold text-gray-900';
export const TW_CHAT_NAV_SUB = 'mt-0.5 block truncate text-[11px] text-gray-500';
export const TW_CHAT_THREAD = 'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain bg-white px-3.5 py-3';
export const TW_CHAT_EMPTY = 'm-auto px-4 py-6 text-center text-[15px] leading-snug text-gray-400';
export const TW_CHAT_ALERT = 'mx-4 my-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3.5 text-center text-sm leading-snug text-amber-900';
export const TW_CHAT_ROW_SENT = 'mb-0.5 flex max-w-[78%] flex-col items-end self-end';
export const TW_CHAT_ROW_RECV = 'mb-1 flex max-w-[88%] items-end gap-1.5 self-start';
export const TW_CHAT_RECV_COL = 'flex min-w-0 flex-1 flex-col items-start';
export const TW_CHAT_AVATAR = 'evt-chat-avatar flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 [&_img]:h-full [&_img]:w-full [&_img]:object-cover';
export const TW_CHAT_AVATAR_HIDDEN = 'invisible pointer-events-none';
export const TW_CHAT_SENDER = 'mb-0.5 px-3 text-[11px] font-semibold leading-tight text-gray-400';
export const TW_CHAT_BUBBLE = 'break-words whitespace-pre-wrap px-3 py-2 text-base leading-snug rounded-[18px]';
export const TW_CHAT_BUBBLE_SENT = 'rounded-br-md bg-[#007AFF] text-white';
export const TW_CHAT_BUBBLE_RECV = 'rounded-bl-md bg-[#E9E9EB] text-gray-900';
export const TW_CHAT_TIME = 'mt-0.5 px-1 text-[11px] leading-tight text-gray-400';
export const TW_CHAT_COMPOSER = 'flex shrink-0 items-end gap-2 border-t border-gray-200/80 bg-gray-50/95 px-2.5 py-2 backdrop-blur-xl pb-[max(8px,env(safe-area-inset-bottom))] max-lg:rounded-none max-lg:border-x-0';
export const TW_CHAT_INPUT_WRAP = 'flex min-h-9 flex-1 items-end rounded-full border border-gray-300/80 bg-white px-3 py-1.5';
export const TW_CHAT_TEXTAREA = 'max-h-[100px] min-h-[22px] w-full resize-none border-0 bg-transparent text-base leading-snug outline-none placeholder:text-gray-400 disabled:opacity-55';
export const TW_CHAT_SEND = 'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-0 bg-[#007AFF] p-0 text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[2.5] [&_svg]:fill-none [&_svg]:stroke-current';

export const OVERLAY_DESKTOP_CLASSES = TW_DESKTOP_OVERLAY.split(/\s+/).filter(Boolean);

export const TW_FLOATING_SHELL = 'evt-cta-floating-shell hidden lg:flex lg:flex-col lg:gap-4';

export const TW_CTA_ACTIONS = 'evt-cta-actions max-lg:flex max-lg:shrink-0 max-lg:items-center max-lg:justify-center max-lg:gap-2.5 max-lg:px-4 max-lg:py-3 max-lg:pb-[max(12px,env(safe-area-inset-bottom))] hidden';

export const TW_CTA_RSVP = 'bg-indigo-600 text-white';
export const TW_CTA_RSVP_DONE = 'bg-green-600 text-white';
export const TW_CTA_MANAGE = 'bg-indigo-600 text-white';
export const TW_CTA_TEAM = 'bg-white text-indigo-600 !border-2 !border-indigo-200';
export const TW_CTA_RAFFLE = 'bg-gradient-to-br from-amber-500 to-amber-600 text-white';
export const TW_CTA_RAFFLE_OUTLINE = 'bg-white text-amber-600 !border-2 !border-amber-300';
export const TW_CTA_RAFFLE_DONE = 'bg-green-600 text-white';
export const TW_CTA_DISABLED = 'bg-gray-200 text-gray-400';
export const TW_CTA_RAFFLE_LOCKED = 'bg-gray-100 text-gray-400 border border-gray-200 shadow-none cursor-not-allowed';

export const TW_CTA_FOOTNOTE = 'evt-cta-footnote m-0 px-4 pb-0.5 text-center text-[11px] font-semibold leading-snug text-gray-500';

export const TW_TOOL_LIST = 'flex flex-col gap-2 max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-y-contain max-lg:px-3 max-lg:pb-1';

export const TW_RAFFLE_BUY = 'evt-raffle-buy flex w-full items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-br from-amber-500 to-amber-600 px-4 py-4 text-base font-bold text-white shadow-md shadow-amber-500/30 transition hover:opacity-90';

export const TW_TICKET_CARD = 'evt-cta-ticket-card text-center [&_canvas]:mx-auto [&_canvas]:mb-2 [&_canvas]:block [&_canvas]:rounded-xl [&_p]:m-0 [&_p]:text-xs [&_p]:text-gray-500';

/** Apply panel layout classes for tools, chat, or generic CTA content. */
export function twPanelClasses(mode, { expanded = false } = {}) {
    const parts = [TW_PANEL_BASE, mode === 'chat' ? TW_PANEL_CHAT : TW_PANEL_TOOLS];
    if (mode === 'chat') parts.push('evt-team-chat-panel');
    else if (mode === 'tools') parts.push('evt-team-tools-panel');
    if (expanded) parts.push(TW_PANEL_EXPANDED);
    return parts.join(' ');
}

export function twAdd(el, ...classStrings) {
    if (!el) return;
    for (const s of classStrings) {
        for (const c of String(s).split(/\s+/)) {
            if (c) el.classList.add(c);
        }
    }
}

export function twRemove(el, ...classStrings) {
    if (!el) return;
    for (const s of classStrings) {
        for (const c of String(s).split(/\s+/)) {
            if (c) el.classList.remove(c);
        }
    }
}

let _ctaSheetScrollY = 0;

/** Lock page scroll while mobile CTA sheet is open (iOS-safe fixed-body pattern). */
export function lockCtaSheetScroll() {
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    if (document.body.dataset.evtCtaSheetLocked === '1') return;
    _ctaSheetScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.dataset.evtCtaSheetLocked = '1';
    document.documentElement.classList.add('evt-cta-sheet-open');
    document.body.classList.add('evt-cta-sheet-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_ctaSheetScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
}

export function unlockCtaSheetScroll() {
    if (document.body.dataset.evtCtaSheetLocked !== '1') return;
    delete document.body.dataset.evtCtaSheetLocked;
    document.documentElement.classList.remove('evt-cta-sheet-open');
    document.body.classList.remove('evt-cta-sheet-open');
    const y = _ctaSheetScrollY;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, y);
}

export function expandCtaSheet(bar, { chat = false } = {}) {
    if (!bar) return;
    twAdd(bar, TW_CTA_BAR_EXPANDED);
    if (chat) twAdd(bar, TW_CTA_BAR_CHAT_MOBILE);
    lockCtaSheetScroll();
}

export function collapseCtaSheet(bar) {
    if (bar) twRemove(bar, TW_CTA_BAR_EXPANDED, TW_CTA_BAR_CHAT_MOBILE);
    unlockCtaSheetScroll();
}
