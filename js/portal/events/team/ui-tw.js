'use strict';

/** Tailwind class strings for mobile CTA bar (scanned by tailwind.config.js). */

export const TW_CTA_BTN = 'evt-cta-btn flex flex-1 items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[15px] font-bold tracking-wide cursor-pointer whitespace-nowrap transition active:scale-[0.97] disabled:cursor-not-allowed [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.5]';

export const TW_CTA_BAR = [
    'evt-cta-bar',
    'hidden max-lg:flex max-lg:flex-col max-lg:gap-2',
    'max-lg:fixed max-lg:inset-x-0 max-lg:z-[49]',
    'max-lg:bg-white max-lg:border-t max-lg:border-gray-100',
    'max-lg:bottom-[calc(56px+env(safe-area-inset-bottom))]',
    'max-lg:backdrop-blur-sm',
].join(' ');

export const TW_CTA_ACTIONS = 'evt-cta-actions max-lg:flex max-lg:shrink-0 max-lg:items-center max-lg:justify-center max-lg:gap-2.5 max-lg:px-4 max-lg:py-3 max-lg:pb-[max(12px,env(safe-area-inset-bottom))] hidden';

export const TW_CTA_RSVP = 'bg-indigo-600 text-white';
export const TW_CTA_RSVP_DONE = 'bg-green-600 text-white';
export const TW_CTA_MANAGE = 'bg-indigo-600 text-white';
export const TW_CTA_TEAM = 'bg-white text-indigo-600 !border-2 !border-indigo-200';
export const TW_CTA_RAFFLE = 'bg-gradient-to-br from-amber-500 to-amber-600 text-white';
export const TW_CTA_RAFFLE_OUTLINE = 'bg-white text-amber-600 !border-2 !border-amber-300';
export const TW_CTA_RAFFLE_DONE = 'bg-green-600 text-white';
export const TW_CTA_DISABLED = 'bg-gray-200 text-gray-400';
export const TW_CTA_RAFFLE_LOCKED = 'evt-cta-raffle-locked bg-gray-100 text-gray-400 border border-gray-200 shadow-none cursor-not-allowed';

export const TW_CTA_FOOTNOTE = 'evt-cta-footnote m-0 px-4 pb-0.5 text-center text-[11px] font-semibold leading-snug text-gray-500';
