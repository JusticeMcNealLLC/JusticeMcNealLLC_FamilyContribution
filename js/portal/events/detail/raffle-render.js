/* ════════════════════════════════════════════════════════════
   Portal Events — Detail raffle render helpers (Phase 5D.2)
   Classic IIFE; loads after detail/presentation.js, before detail.js.
   ════════════════════════════════════════════════════════════ */

'use strict';

function _raffleSectionHead(title) {
    return `<div class="ed-section-head"><h3>${title}</h3></div>`;
}

function evtDetailRaffleConfig(event) {
    if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
    return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
}

function evtDetailRaffleCategories(config) {
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getOrderedCategories(config);
}

function evtDetailRaffleItems(config, categoryId) {
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getItemsForCategory(config, categoryId);
}

function evtDetailRaffleWinnerCount(config, event) {
    if (window.EventsRaffleModel) return window.EventsRaffleModel.getTotalWinnerCount(config);
    return event?.raffle_winner_count || (Array.isArray(event?.raffle_prizes) ? event.raffle_prizes.length : 0);
}

function evtDetailDrawModeLabel(drawMode) {
    if (drawMode === 'random_item') return 'Random prize assigned';
    if (drawMode === 'winner_choice') return 'Winner chooses from this tier';
    return 'Drawing specific prizes';
}

function evtDetailPrizeMedia(item) {
    if (item?.image_url) return `<img src="${evtEscapeHtml(item.image_url)}" alt="" loading="lazy">`;
    return `<span>${evtEscapeHtml(item?.emoji || window.EventsRaffleModel?.DEFAULT_EMOJI || '🎁')}</span>`;
}

function evtDetailRafflePrizeItems(config) {
    return evtDetailRaffleCategories(config).flatMap(category => evtDetailRaffleItems(config, category.id));
}

function evtDetailRafflePrizesHtml(event) {
    const config = evtDetailRaffleConfig(event);
    const items = evtDetailRafflePrizeItems(config);
    if (!items.length) return '';

    return `<div class="ed-raffle-prize-rail">${items.map(item => `
    <article class="ed-raffle-prize-tile" title="${evtEscapeHtml(item.name)}">
        <div class="ed-raffle-prize-media">${evtDetailPrizeMedia(item)}</div>
        <p>${evtEscapeHtml(item.name)}</p>
    </article>
`).join('')}</div>`;
}

function evtDetailRaffleWinnersHtml(winners) {
    if (!winners.length) return '';
    const rows = winners.map(w => {
        const initials = w.profiles ? `${w.profiles.first_name?.[0] || ''}${w.profiles.last_name?.[0] || ''}`.toUpperCase() : '';
        const avatar = w.profiles?.profile_picture_url
            ? `<img src="${evtEscapeHtml(w.profiles.profile_picture_url)}" alt="" loading="lazy">`
            : `<span>${evtEscapeHtml(initials || (w.guest_token ? 'G' : 'W'))}</span>`;
        const prize = w.selection_status === 'pending_choice' ? 'Choosing later' : (w.prize_description || 'Prize pending');
        const emoji = evtEscapeHtml(w.prize_emoji || '🎁');
        return `<article class="ed-winner-card">
        <div class="ed-winner-avatar">${avatar}<b>${w.place}</b></div>
        <div class="ed-winner-copy"><span>${emoji}</span><p>${evtEscapeHtml(prize)}</p></div>
    </article>`;
    }).join('');
    return `<div class="ed-winners ed-winners-compact">${_raffleSectionHead('Winners')}<div class="ed-winner-rail">${rows}</div></div>`;
}

function evtRaffleLockedDesktopHtml(eventId, showTeamHint) {
    const mobileHint = showTeamHint
        ? `<p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the RSVP button in the bar below, or open <button type="button" class="ed-link-btn" onclick="evtOpenTeamToolsPanel('${eventId}')">Team</button> to RSVP as yourself.</p>`
        : `<p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the RSVP button in the sticky bar below, then enter the raffle.</p>`;
    return `<div class="ed-raffle-desktop-action ed-raffle-locked-block">
    <button type="button" class="ed-raffle-btn ed-raffle-btn-locked" disabled aria-disabled="true">🎟️ Enter Raffle</button>
    <p class="ed-raffle-locked-hint">RSVP first to enter the raffle</p>
</div>${mobileHint}`;
}

export const detailRaffleRenderApi = {
    config: evtDetailRaffleConfig,
    categories: evtDetailRaffleCategories,
    items: evtDetailRaffleItems,
    winnerCount: evtDetailRaffleWinnerCount,
    drawModeLabel: evtDetailDrawModeLabel,
    prizesHtml: evtDetailRafflePrizesHtml,
    winnersHtml: evtDetailRaffleWinnersHtml,
    lockedDesktopHtml: evtRaffleLockedDesktopHtml,
};

globalThis.evtDetailRaffleConfig = evtDetailRaffleConfig;
globalThis.evtDetailRaffleCategories = evtDetailRaffleCategories;
globalThis.evtDetailRaffleItems = evtDetailRaffleItems;
globalThis.evtDetailRaffleWinnerCount = evtDetailRaffleWinnerCount;
globalThis.evtDetailDrawModeLabel = evtDetailDrawModeLabel;
globalThis.evtDrawModeLabel = evtDetailDrawModeLabel;
globalThis.evtDetailRafflePrizesHtml = evtDetailRafflePrizesHtml;
globalThis.evtDetailRaffleWinnersHtml = evtDetailRaffleWinnersHtml;
globalThis.evtRaffleLockedDesktopHtml = evtRaffleLockedDesktopHtml;

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.detail = PortalEvents.detail || {};
PortalEvents.detail.raffleRender = detailRaffleRenderApi;
