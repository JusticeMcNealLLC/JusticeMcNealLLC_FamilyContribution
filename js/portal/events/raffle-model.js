// Shared raffle model helpers for event creation, details, and drawing.
(function (root) {
    'use strict';

    const VERSION = 2;
    const DEFAULT_EMOJI = '🎁';
    const DRAW_MODES = new Set(['specific_item', 'random_item', 'winner_choice']);

    function createDefaultConfig() {
        return normalizeConfig({
            version: VERSION,
            winner_count: 10,
            categories: [
                createCategory({ id: 'medium', label: 'Medium Items', sort_order: 10, winner_count: 7, draw_mode: 'random_item' }),
                createCategory({ id: 'large', label: 'Large Items', sort_order: 20, winner_count: 2, draw_mode: 'specific_item' }),
                createCategory({ id: 'grand', label: 'Grand Prize', sort_order: 30, winner_count: 1, draw_mode: 'specific_item' }),
            ],
            items: [],
        });
    }

    function createCategory(overrides = {}) {
        const label = cleanText(overrides.label) || 'Prize Tier';
        return {
            ...overrides,
            id: cleanId(overrides.id) || makeId('cat', label, Date.now()),
            label,
            sort_order: toInt(overrides.sort_order, 10),
            winner_count: toNullableInt(overrides.winner_count),
            draw_mode: DRAW_MODES.has(overrides.draw_mode) ? overrides.draw_mode : 'specific_item',
        };
    }

    function createItem(overrides = {}) {
        const name = cleanText(overrides.name) || 'Prize item';
        return {
            ...overrides,
            id: cleanId(overrides.id) || makeId('item', name, Date.now()),
            category_id: cleanId(overrides.category_id) || 'general',
            name,
            image_url: cleanText(overrides.image_url) || null,
            emoji: cleanText(overrides.emoji) || DEFAULT_EMOJI,
            quantity: Math.max(1, toInt(overrides.quantity, 1)),
            sort_order: toInt(overrides.sort_order, 10),
        };
    }

    function normalizeConfig(rawPrizes, options = {}) {
        if (!rawPrizes) return emptyConfig(options);
        if (Array.isArray(rawPrizes)) return normalizeLegacyArray(rawPrizes, options);
        if (typeof rawPrizes === 'string') return normalizeLegacyArray([rawPrizes], options);
        if (typeof rawPrizes !== 'object') return emptyConfig(options);

        const base = { ...rawPrizes, version: VERSION };
        const rawCategories = Array.isArray(rawPrizes.categories) ? rawPrizes.categories : [];
        const rawItems = Array.isArray(rawPrizes.items) ? rawPrizes.items : [];
        const categories = rawCategories.map((category, index) => normalizeCategory(category, index));
        const categoryIds = new Set(categories.map(category => category.id));
        const fallbackCategory = categories[0]?.id || 'general';
        const items = rawItems.map((item, index) => normalizeItem(item, index, categoryIds, fallbackCategory));

        return finalizeConfig({
            ...base,
            categories: sortCategories(categories),
            items: sortItems(items),
        });
    }

    function getOrderedCategories(config) {
        return sortCategories(normalizeConfig(config).categories || []);
    }

    function getItemsForCategory(config, categoryId) {
        const normalized = normalizeConfig(config);
        return getItemsForCategoryRaw(normalized, categoryId);
    }

    function getTotalWinnerCount(config) {
        const normalized = normalizeConfig(config);
        return getOrderedCategories(normalized).reduce((sum, category) => {
            return sum + getCategoryWinnerCount(normalized, category);
        }, 0);
    }

    function getDrawQueue(config, existingWinners = []) {
        const normalized = normalizeConfig(config);
        const drawn = buildDrawnIndex(existingWinners);
        const slots = [];
        let place = 1;

        getOrderedCategories(normalized).forEach(category => {
            const items = getItemsForCategory(normalized, category.id);
            const winnerCount = getCategoryWinnerCount(normalized, category);
            if (category.draw_mode === 'specific_item') {
                let emitted = 0;
                items.forEach(item => {
                    for (let copy = 1; copy <= item.quantity && emitted < winnerCount; copy++) {
                        slots.push(makeSlot(place++, category, item, 'assigned', copy));
                        emitted++;
                    }
                });
                return;
            }

            const selectionStatus = category.draw_mode === 'winner_choice' ? 'pending_choice' : 'assigned';
            for (let index = 0; index < winnerCount; index++) {
                slots.push(makeSlot(place++, category, null, selectionStatus, index + 1));
            }
        });

        return slots.filter(slot => !isSlotDrawn(slot, drawn));
    }

    function validateConfig(config) {
        const normalized = normalizeConfig(config);
        const errors = [];
        if (!normalized.categories.length) errors.push('Add at least one raffle category.');
        if (!normalized.items.length) errors.push('Add at least one raffle prize item.');

        getOrderedCategories(normalized).forEach(category => {
            const items = getItemsForCategory(normalized, category.id);
            const itemQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
            const winnerCount = getCategoryWinnerCount(normalized, category);
            if (!items.length) errors.push(`${category.label} needs at least one prize item.`);
            if ((category.draw_mode === 'specific_item' || category.draw_mode === 'random_item') && winnerCount > itemQuantity) {
                errors.push(`${category.label} has more winners than available prize quantity.`);
            }
        });

        return { valid: errors.length === 0, errors, config: normalized };
    }

    function emptyConfig(options = {}) {
        return finalizeConfig({
            version: VERSION,
            winner_count: toInt(options.winner_count, 0),
            categories: [],
            items: [],
        });
    }

    function normalizeLegacyArray(rawPrizes, options = {}) {
        const items = rawPrizes
            .map((prize, index) => legacyPrizeToItem(prize, index))
            .filter(Boolean);
        const category = createCategory({
            id: 'general',
            label: options.category_label || 'Raffle Prizes',
            sort_order: 10,
            winner_count: items.reduce((sum, item) => sum + item.quantity, 0),
            draw_mode: 'specific_item',
        });
        return finalizeConfig({
            version: VERSION,
            winner_count: category.winner_count,
            categories: items.length ? [category] : [],
            items,
        });
    }

    function legacyPrizeToItem(prize, index) {
        if (typeof prize === 'string') {
            const name = cleanText(prize);
            if (!name) return null;
            return createItem({ id: makeId('item', name, index + 1), category_id: 'general', name, sort_order: (index + 1) * 10 });
        }
        if (!prize || typeof prize !== 'object') return null;
        const name = cleanText(prize.description || prize.name || prize.prize_description);
        if (!name) return null;
        const place = toInt(prize.place, index + 1);
        return createItem({
            ...prize,
            id: cleanId(prize.id || prize.prize_id) || makeId('item', name, place),
            category_id: 'general',
            name,
            sort_order: place * 10,
        });
    }

    function normalizeCategory(category, index) {
        return createCategory({
            ...category,
            id: cleanId(category?.id) || makeId('cat', category?.label || 'category', index + 1),
            label: category?.label || `Prize Tier ${index + 1}`,
            sort_order: category?.sort_order ?? ((index + 1) * 10),
        });
    }

    function normalizeItem(item, index, categoryIds, fallbackCategory) {
        const categoryId = cleanId(item?.category_id);
        return createItem({
            ...item,
            id: cleanId(item?.id) || makeId('item', item?.name || 'item', index + 1),
            category_id: categoryIds.has(categoryId) ? categoryId : fallbackCategory,
            sort_order: item?.sort_order ?? ((index + 1) * 10),
        });
    }

    function finalizeConfig(config) {
        const categories = sortCategories(config.categories || []);
        const items = sortItems(config.items || []);
        const winnerCount = categories.reduce((sum, category) => {
            return sum + getCategoryWinnerCount({ ...config, items }, category);
        }, 0);
        return {
            ...config,
            version: VERSION,
            winner_count: toInt(config.winner_count, winnerCount) || winnerCount,
            categories,
            items,
        };
    }

    function getCategoryWinnerCount(config, category) {
        const explicit = toNullableInt(category.winner_count);
        if (explicit != null) return explicit;
        return getItemsForCategoryRaw(config, category.id).reduce((sum, item) => sum + item.quantity, 0);
    }

    function makeSlot(place, category, item, selectionStatus, copyIndex) {
        return {
            place,
            category_id: category.id,
            category_label: category.label,
            draw_mode: category.draw_mode,
            prize_id: item?.id || null,
            prize_name: item?.name || null,
            prize_image_url: item?.image_url || null,
            prize_emoji: item?.emoji || DEFAULT_EMOJI,
            selection_status: selectionStatus,
            quantity_index: copyIndex,
        };
    }

    function buildDrawnIndex(existingWinners) {
        const index = { place: new Set(), prizeCount: new Map(), categoryCount: new Map() };
        (Array.isArray(existingWinners) ? existingWinners : []).forEach(winner => {
            if (winner?.place != null) index.place.add(Number(winner.place));
            if (winner?.prize_id) {
                const key = String(winner.prize_id);
                index.prizeCount.set(key, (index.prizeCount.get(key) || 0) + 1);
            }
            if (winner?.category_id) {
                const key = String(winner.category_id);
                index.categoryCount.set(key, (index.categoryCount.get(key) || 0) + 1);
            }
        });
        return index;
    }

    function isSlotDrawn(slot, drawn) {
        if (drawn.place.has(slot.place)) return true;
        if (slot.prize_id) {
            const drawnForPrize = drawn.prizeCount.get(slot.prize_id) || 0;
            if (drawnForPrize > 0) {
                drawn.prizeCount.set(slot.prize_id, drawnForPrize - 1);
                return true;
            }
        }
        const drawnInCategory = drawn.categoryCount.get(slot.category_id) || 0;
        if (!slot.prize_id && drawnInCategory > 0) {
            drawn.categoryCount.set(slot.category_id, drawnInCategory - 1);
            return true;
        }
        return false;
    }

    function getItemsForCategoryRaw(config, categoryId) {
        return sortItems((config.items || []).filter(item => item.category_id === categoryId));
    }

    function sortCategories(categories) {
        return [...categories].sort((a, b) => sortByOrderThenText(a, b, 'label'));
    }

    function sortItems(items) {
        return [...items].sort((a, b) => sortByOrderThenText(a, b, 'name'));
    }

    function sortByOrderThenText(a, b, textKey) {
        const orderDiff = toInt(a.sort_order, 0) - toInt(b.sort_order, 0);
        if (orderDiff) return orderDiff;
        return String(a[textKey] || a.id || '').localeCompare(String(b[textKey] || b.id || ''));
    }

    function cleanText(value) {
        return value == null ? '' : String(value).trim();
    }

    function cleanId(value) {
        return cleanText(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    }

    function makeId(prefix, seed, suffix) {
        const slug = cleanText(seed).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'item';
        return cleanId(`${prefix}_${slug}_${suffix}`);
    }

    function toInt(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
    }

    function toNullableInt(value) {
        if (value === '' || value == null) return null;
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : null;
    }

    const api = {
        VERSION,
        DEFAULT_EMOJI,
        normalizeConfig,
        createDefaultConfig,
        createCategory,
        createItem,
        getOrderedCategories,
        getItemsForCategory,
        getTotalWinnerCount,
        getDrawQueue,
        validateConfig,
    };

    root.EventsRaffleModel = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);