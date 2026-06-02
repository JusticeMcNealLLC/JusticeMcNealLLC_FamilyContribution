/* Portal Events — production bundle from main.js (esbuild); do not edit */
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // js/portal/events/core/raffle-model.js
  var require_raffle_model = __commonJS({
    "js/portal/events/core/raffle-model.js"(exports, module) {
      (function(root2) {
        "use strict";
        const VERSION = 2;
        const DEFAULT_EMOJI = "\u{1F381}";
        const DRAW_MODES = /* @__PURE__ */ new Set(["specific_item", "random_item", "winner_choice"]);
        function createDefaultConfig() {
          return normalizeConfig({
            version: VERSION,
            winner_count: 10,
            categories: [
              createCategory({ id: "medium", label: "Medium Items", sort_order: 10, winner_count: 7, draw_mode: "random_item" }),
              createCategory({ id: "large", label: "Large Items", sort_order: 20, winner_count: 2, draw_mode: "specific_item" }),
              createCategory({ id: "grand", label: "Grand Prize", sort_order: 30, winner_count: 1, draw_mode: "specific_item" })
            ],
            items: []
          });
        }
        function createCategory(overrides = {}) {
          const label = cleanText(overrides.label) || "Prize Tier";
          return {
            ...overrides,
            id: cleanId(overrides.id) || makeId("cat", label, Date.now()),
            label,
            sort_order: toInt(overrides.sort_order, 10),
            winner_count: toNullableInt(overrides.winner_count),
            draw_mode: DRAW_MODES.has(overrides.draw_mode) ? overrides.draw_mode : "specific_item"
          };
        }
        function createItem(overrides = {}) {
          const name = cleanText(overrides.name) || "Prize item";
          return {
            ...overrides,
            id: cleanId(overrides.id) || makeId("item", name, Date.now()),
            category_id: cleanId(overrides.category_id) || "general",
            name,
            image_url: cleanText(overrides.image_url) || null,
            emoji: cleanText(overrides.emoji) || DEFAULT_EMOJI,
            quantity: Math.max(1, toInt(overrides.quantity, 1)),
            sort_order: toInt(overrides.sort_order, 10)
          };
        }
        function normalizeConfig(rawPrizes, options = {}) {
          if (!rawPrizes) return emptyConfig(options);
          if (Array.isArray(rawPrizes)) return normalizeLegacyArray(rawPrizes, options);
          if (typeof rawPrizes === "string") return normalizeLegacyArray([rawPrizes], options);
          if (typeof rawPrizes !== "object") return emptyConfig(options);
          const base = { ...rawPrizes, version: VERSION };
          const rawCategories = Array.isArray(rawPrizes.categories) ? rawPrizes.categories : [];
          const rawItems = Array.isArray(rawPrizes.items) ? rawPrizes.items : [];
          const categories = rawCategories.map((category, index) => normalizeCategory(category, index));
          const categoryIds = new Set(categories.map((category) => category.id));
          const fallbackCategory = categories[0]?.id || "general";
          const items = rawItems.map((item, index) => normalizeItem(item, index, categoryIds, fallbackCategory));
          return finalizeConfig({
            ...base,
            categories: sortCategories(categories),
            items: sortItems(items)
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
          getOrderedCategories(normalized).forEach((category) => {
            const items = getItemsForCategory(normalized, category.id);
            const winnerCount = getCategoryWinnerCount(normalized, category);
            if (category.draw_mode === "specific_item") {
              let emitted = 0;
              items.forEach((item) => {
                for (let copy = 1; copy <= item.quantity && emitted < winnerCount; copy++) {
                  slots.push(makeSlot(place++, category, item, "assigned", copy));
                  emitted++;
                }
              });
              return;
            }
            const selectionStatus = category.draw_mode === "winner_choice" ? "pending_choice" : "assigned";
            for (let index = 0; index < winnerCount; index++) {
              slots.push(makeSlot(place++, category, null, selectionStatus, index + 1));
            }
          });
          return slots.filter((slot) => !isSlotDrawn(slot, drawn));
        }
        function validateConfig(config) {
          const normalized = normalizeConfig(config);
          const errors = [];
          if (!normalized.categories.length) errors.push("Add at least one raffle category.");
          if (!normalized.items.length) errors.push("Add at least one raffle prize item.");
          getOrderedCategories(normalized).forEach((category) => {
            const items = getItemsForCategory(normalized, category.id);
            const itemQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
            const winnerCount = getCategoryWinnerCount(normalized, category);
            if (!items.length) errors.push(`${category.label} needs at least one prize item.`);
            if ((category.draw_mode === "specific_item" || category.draw_mode === "random_item") && winnerCount > itemQuantity) {
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
            items: []
          });
        }
        function normalizeLegacyArray(rawPrizes, options = {}) {
          const items = rawPrizes.map((prize, index) => legacyPrizeToItem(prize, index)).filter(Boolean);
          const category = createCategory({
            id: "general",
            label: options.category_label || "Raffle Prizes",
            sort_order: 10,
            winner_count: items.reduce((sum, item) => sum + item.quantity, 0),
            draw_mode: "specific_item"
          });
          return finalizeConfig({
            version: VERSION,
            winner_count: category.winner_count,
            categories: items.length ? [category] : [],
            items
          });
        }
        function legacyPrizeToItem(prize, index) {
          if (typeof prize === "string") {
            const name2 = cleanText(prize);
            if (!name2) return null;
            return createItem({ id: makeId("item", name2, index + 1), category_id: "general", name: name2, sort_order: (index + 1) * 10 });
          }
          if (!prize || typeof prize !== "object") return null;
          const name = cleanText(prize.description || prize.name || prize.prize_description);
          if (!name) return null;
          const place = toInt(prize.place, index + 1);
          return createItem({
            ...prize,
            id: cleanId(prize.id || prize.prize_id) || makeId("item", name, place),
            category_id: "general",
            name,
            sort_order: place * 10
          });
        }
        function normalizeCategory(category, index) {
          return createCategory({
            ...category,
            id: cleanId(category?.id) || makeId("cat", category?.label || "category", index + 1),
            label: category?.label || `Prize Tier ${index + 1}`,
            sort_order: category?.sort_order ?? (index + 1) * 10
          });
        }
        function normalizeItem(item, index, categoryIds, fallbackCategory) {
          const categoryId = cleanId(item?.category_id);
          return createItem({
            ...item,
            id: cleanId(item?.id) || makeId("item", item?.name || "item", index + 1),
            category_id: categoryIds.has(categoryId) ? categoryId : fallbackCategory,
            sort_order: item?.sort_order ?? (index + 1) * 10
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
            items
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
            quantity_index: copyIndex
          };
        }
        function buildDrawnIndex(existingWinners) {
          const index = { place: /* @__PURE__ */ new Set(), prizeCount: /* @__PURE__ */ new Map(), categoryCount: /* @__PURE__ */ new Map() };
          (Array.isArray(existingWinners) ? existingWinners : []).forEach((winner) => {
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
          return sortItems((config.items || []).filter((item) => item.category_id === categoryId));
        }
        function sortCategories(categories) {
          return [...categories].sort((a, b) => sortByOrderThenText(a, b, "label"));
        }
        function sortItems(items) {
          return [...items].sort((a, b) => sortByOrderThenText(a, b, "name"));
        }
        function sortByOrderThenText(a, b, textKey) {
          const orderDiff = toInt(a.sort_order, 0) - toInt(b.sort_order, 0);
          if (orderDiff) return orderDiff;
          return String(a[textKey] || a.id || "").localeCompare(String(b[textKey] || b.id || ""));
        }
        function cleanText(value) {
          return value == null ? "" : String(value).trim();
        }
        function cleanId(value) {
          return cleanText(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
        }
        function makeId(prefix, seed, suffix) {
          const slug = cleanText(seed).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "item";
          return cleanId(`${prefix}_${slug}_${suffix}`);
        }
        function toInt(value, fallback) {
          const number = Number(value);
          return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
        }
        function toNullableInt(value) {
          if (value === "" || value == null) return null;
          const number = Number(value);
          return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : null;
        }
        const api19 = {
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
          validateConfig
        };
        root2.EventsRaffleModel = api19;
        if (typeof module !== "undefined" && module.exports) module.exports = api19;
        if (typeof root2.PortalEvents === "undefined") root2.PortalEvents = {};
        root2.PortalEvents.raffleModel = api19;
      })(typeof globalThis !== "undefined" ? globalThis : window);
    }
  });

  // js/components/events/constants.js
  (function() {
    "use strict";
    const CATEGORY_EMOJI = {
      party: "\u{1F389}",
      birthday: "\u{1F382}",
      hangout: "\u{1F91D}",
      game_night: "\u{1F3AE}",
      cookout: "\u{1F356}",
      trip: "\u{1F3D4}\uFE0F",
      retreat: "\u{1F3D6}\uFE0F",
      dinner: "\u{1F37D}\uFE0F",
      holiday: "\u{1F384}",
      investment: "\u{1F4BC}",
      annual: "\u{1F4C5}",
      other: "\u{1F4CC}"
    };
    const CATEGORY_TAG = {
      birthday: { cls: "evt-tag--pink", label: "Birthday" },
      party: { cls: "evt-tag--orange", label: "Party" },
      hangout: { cls: "evt-tag--green", label: "Hangout" },
      game_night: { cls: "evt-tag--purple", label: "Game Night" },
      cookout: { cls: "evt-tag--orange", label: "Cookout" },
      trip: { cls: "evt-tag--teal", label: "Trip" },
      retreat: { cls: "evt-tag--teal", label: "Retreat" },
      dinner: { cls: "evt-tag--blue", label: "Dinner" },
      holiday: { cls: "evt-tag--blue", label: "Holiday" },
      investment: { cls: "evt-tag--blue", label: "Investment" },
      annual: { cls: "evt-tag--purple", label: "Annual" }
    };
    const DEFAULT_TAG = { cls: "evt-tag--purple", label: "Event" };
    const CATEGORY_GRADIENT = {
      birthday: "linear-gradient(135deg,#831843,#ec4899)",
      // wine → rose
      party: "linear-gradient(135deg,#1e1b4b,#6366f1)",
      // deep indigo → brand
      hangout: "linear-gradient(135deg,#14532d,#4ade80)",
      // forest → light green
      game_night: "linear-gradient(135deg,#0f172a,#475569)",
      // slate
      cookout: "linear-gradient(135deg,#7c2d12,#f97316)",
      // rust → amber
      trip: "linear-gradient(135deg,#0c4a6e,#0ea5e9)",
      // deep teal → sky
      retreat: "linear-gradient(135deg,#0c4a6e,#0ea5e9)",
      // deep teal → sky
      dinner: "linear-gradient(135deg,#422006,#d97706)",
      // umber → amber
      holiday: "linear-gradient(135deg,#052e16,#16a34a)",
      // forest → green
      investment: "linear-gradient(135deg,#0f172a,#475569)",
      // slate
      annual: "linear-gradient(135deg,#1e1b4b,#6366f1)",
      // deep indigo → brand
      celebration: "linear-gradient(135deg,#4a044e,#d946ef)",
      // deep purple → fuchsia
      competition: "linear-gradient(135deg,#052e16,#16a34a)",
      // forest → green
      fundraiser: "linear-gradient(135deg,#422006,#d97706)",
      // umber → amber
      volunteer: "linear-gradient(135deg,#14532d,#4ade80)",
      // forest → light green
      meeting: "linear-gradient(135deg,#0f172a,#475569)",
      // slate
      other: "linear-gradient(135deg,#1f2937,#6b7280)"
      // charcoal
    };
    const DEFAULT_GRADIENT = "linear-gradient(135deg,#1f2937,#6b7280)";
    const TYPE_COLORS_PORTAL = {
      llc: { bg: "bg-amber-100", text: "text-amber-700", label: "LLC" },
      member: { bg: "bg-brand-100", text: "text-brand-700", label: "Member" },
      competition: { bg: "bg-rose-100", text: "text-rose-700", label: "Competition" }
    };
    const TYPE_COLORS_PUBLIC = {
      llc: { bg: "#f7f7f7", color: "#222", label: "LLC Event" },
      member: { bg: "#f7f7f7", color: "#222", label: "Member Event" },
      competition: { bg: "#f7f7f7", color: "#222", label: "Competition" }
    };
    const STATUS_COLORS = {
      draft: "bg-gray-100 text-gray-600",
      open: "bg-emerald-100 text-emerald-700",
      confirmed: "bg-blue-100 text-blue-700",
      active: "bg-violet-100 text-violet-700",
      completed: "bg-gray-100 text-gray-500",
      cancelled: "bg-red-100 text-red-600"
    };
    const EVENT_DOC_TYPES = [
      { value: "plane_ticket", label: "\u2708\uFE0F Plane Ticket", perMember: true },
      { value: "group_ticket", label: "\u{1F3AB} Group Ticket / Pass", perMember: false },
      { value: "itinerary", label: "\u{1F4CB} Itinerary", perMember: false },
      { value: "receipt", label: "\u{1F9FE} Receipt", perMember: false },
      { value: "other", label: "\u{1F4CE} Other", perMember: false }
    ];
    const PRICING_MODES = {
      fully_paid: { label: "Fully Paid" },
      free_event_paid_raffle: { label: "Free Event \xB7 Paid Raffle" },
      fully_free: { label: "Fully Free" }
    };
    const EventsConstants = {
      CATEGORY_EMOJI,
      CATEGORY_TAG,
      DEFAULT_TAG,
      CATEGORY_GRADIENT,
      DEFAULT_GRADIENT,
      TYPE_COLORS_PORTAL,
      TYPE_COLORS_PUBLIC,
      STATUS_COLORS,
      EVENT_DOC_TYPES,
      PRICING_MODES
    };
    window.EventsConstants = EventsConstants;
  })();

  // js/components/events/helpers.js
  (function() {
    "use strict";
    function escapeHtml(str) {
      if (str == null) return "";
      const div = document.createElement("div");
      div.textContent = String(str);
      return div.innerHTML;
    }
    function miniMarkdown(text, escapeFirst = false) {
      if (!text) return "";
      let html5 = escapeFirst ? escapeHtml(text) : text;
      html5 = html5.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      );
      html5 = html5.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html5 = html5.replace(/\*(.+?)\*/g, "<em>$1</em>");
      return html5;
    }
    function formatMoney(cents, opts = {}) {
      const n = Number(cents) || 0;
      const dollars = n / 100;
      const showCents = opts.showCents !== false && dollars % 1 !== 0;
      return "$" + dollars.toLocaleString("en-US", {
        minimumFractionDigits: showCents ? 2 : 0,
        maximumFractionDigits: showCents ? 2 : 0
      });
    }
    function formatDate(input, mode = "short") {
      if (!input) return "";
      const d = input instanceof Date ? input : new Date(input);
      if (isNaN(d)) return "";
      if (mode === "time") {
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      }
      if (mode === "long") {
        return d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        });
      }
      if (mode === "datetime") {
        const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return `${date} \xB7 ${time}`;
      }
      if (mode === "relative") {
        return relativeTime(d);
      }
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    function relativeTime(d) {
      const ms = d - /* @__PURE__ */ new Date();
      const future = ms > 0;
      const abs = Math.abs(ms);
      const min = 6e4, hr = 36e5, day = 864e5;
      if (abs < min) return future ? "in moments" : "just now";
      if (abs < hr) {
        const m = Math.round(abs / min);
        return future ? `in ${m}m` : `${m}m ago`;
      }
      if (abs < day) {
        const h = Math.round(abs / hr);
        return future ? `in ${h}h` : `${h}h ago`;
      }
      const days = Math.round(abs / day);
      if (days === 0) return "today";
      if (days === 1) return future ? "tomorrow" : "yesterday";
      if (days < 7) return future ? `in ${days} days` : `${days} days ago`;
      return formatDate(d, "short");
    }
    function ordinal(n) {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    function generateSlug(title) {
      return String(title || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").substring(0, 60) + "-" + Date.now().toString(36);
    }
    function openLightbox(imgUrl) {
      if (!imgUrl) return;
      let lb = document.querySelector(".evt-lightbox");
      if (!lb) {
        lb = document.createElement("div");
        lb.className = "evt-lightbox";
        lb.setAttribute("role", "dialog");
        lb.setAttribute("aria-label", "Image preview");
        lb.innerHTML = '<button class="evt-lightbox-close" aria-label="Close preview"><svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button><img src="" alt="Event banner full size">';
        const close4 = () => {
          lb.classList.remove("active");
          document.body.style.overflow = "";
          setTimeout(() => {
            if (!lb.classList.contains("active")) lb.remove();
          }, 250);
        };
        lb.addEventListener("click", (e) => {
          if (e.target === lb || e.target.closest(".evt-lightbox-close")) close4();
        });
        document.body.appendChild(lb);
      }
      lb.querySelector("img").src = imgUrl;
      requestAnimationFrame(() => lb.classList.add("active"));
      document.body.style.overflow = "hidden";
    }
    function startLiveCountdown(startDate, badgeEl, opts = {}) {
      if (!badgeEl) return () => {
      };
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const liveClass = opts.liveClass || "evt-status-badge evt-status-live";
      const dotClass = opts.dotClass || "evt-status-dot";
      let timer = null;
      let stopped = false;
      function render() {
        const ms = start - /* @__PURE__ */ new Date();
        if (ms <= 0) {
          badgeEl.className = liveClass;
          badgeEl.innerHTML = `<span class="${dotClass} pulse"></span>Live`;
          stop();
          return;
        }
        const d = Math.floor(ms / 864e5);
        const h = Math.floor(ms % 864e5 / 36e5);
        const m = Math.floor(ms % 36e5 / 6e4);
        const s = Math.floor(ms % 6e4 / 1e3);
        let lbl;
        if (d > 0) lbl = `${d}d ${h}h`;
        else if (h > 0) lbl = `${h}h ${m}m`;
        else lbl = `${m}m ${s}s`;
        const inner = `<span class="${dotClass}${d === 0 ? " pulse" : ""}"></span>${lbl}`;
        const inner_badge = badgeEl.querySelector?.(".evt-status-badge");
        if (inner_badge) inner_badge.innerHTML = inner;
        else badgeEl.innerHTML = inner;
      }
      function schedule() {
        if (stopped) return;
        const ms = start - /* @__PURE__ */ new Date();
        const interval = ms <= 36e5 ? 1e3 : 6e4;
        timer = setInterval(() => {
          render();
          const remaining = start - /* @__PURE__ */ new Date();
          if (remaining <= 36e5 && interval === 6e4) {
            clearInterval(timer);
            schedule();
          }
        }, interval);
      }
      function stop() {
        stopped = true;
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
      render();
      schedule();
      return stop;
    }
    function toast(message, opts = {}) {
      const el = document.createElement("div");
      el.textContent = message;
      const variant = opts.variant || "default";
      const variants = {
        default: "bg-gray-900 text-white",
        success: "bg-emerald-600 text-white",
        error: "bg-red-600 text-white"
      };
      el.className = "fixed top-6 left-1/2 -translate-x-1/2 " + (variants[variant] || variants.default) + " text-sm font-semibold px-4 py-2 rounded-xl shadow-lg z-[70] transition-opacity duration-300";
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 300);
      }, opts.duration || 1500);
    }
    function relativeDate(input) {
      if (!input) return "";
      const d = input instanceof Date ? input : new Date(input);
      if (isNaN(d)) return "";
      const now = /* @__PURE__ */ new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayDiff = Math.round((startOfDay - startOfToday) / 864e5);
      if (dayDiff === 0) {
        return d.getHours() >= 17 ? "Tonight" : "Today";
      }
      if (dayDiff === 1) return "Tomorrow";
      if (dayDiff === -1) return "Yesterday";
      if (dayDiff > 1 && dayDiff <= 6) return `in ${dayDiff} days`;
      return formatDate(d, "short");
    }
    function groupByBucket(events, mode = "upcoming") {
      const list = Array.isArray(events) ? events : [];
      const now = /* @__PURE__ */ new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const schema = {
        upcoming: ["Tonight", "This week", "This month", "Later"],
        past: ["Last week", "Last month", "Earlier"],
        going: ["Tonight", "This week", "Later"]
      };
      const labels = schema[mode] || schema.upcoming;
      const buckets = Object.fromEntries(labels.map((l) => [l, []]));
      function bucketOf(e) {
        const raw = e?.start_at || e?.start_date || e?.starts_at;
        if (!raw) return labels[labels.length - 1];
        const d = new Date(raw);
        if (isNaN(d)) return labels[labels.length - 1];
        const dayDiff = Math.round((d - startOfToday) / 864e5);
        if (mode === "past") {
          if (dayDiff >= -7) return "Last week";
          if (dayDiff >= -30) return "Last month";
          return "Earlier";
        }
        if (dayDiff <= 0) return "Tonight";
        if (dayDiff <= 7) return "This week";
        if (mode === "going") return "Later";
        if (dayDiff <= 30) return "This month";
        return "Later";
      }
      for (const e of list) {
        const b = bucketOf(e);
        if (buckets[b]) buckets[b].push(e);
      }
      return labels.map((label) => ({ label, events: buckets[label] })).filter((g2) => g2.events.length > 0);
    }
    function toggleModal(id, show) {
      const modal = document.getElementById(id);
      if (!modal) return;
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    }
    const EventsHelpers = {
      escapeHtml,
      miniMarkdown,
      formatMoney,
      formatDate,
      relativeTime,
      relativeDate,
      groupByBucket,
      ordinal,
      generateSlug,
      openLightbox,
      startLiveCountdown,
      toast,
      toggleModal
    };
    window.EventsHelpers = EventsHelpers;
  })();

  // js/components/events/pills.js
  (function() {
    "use strict";
    const C7 = window.EventsConstants || {};
    function statusPill(status) {
      const cls = C7.STATUS_COLORS && C7.STATUS_COLORS[status] || "bg-gray-100 text-gray-600";
      const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "";
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}">${label}</span>`;
    }
    function statePill(event) {
      if (!event) return "";
      const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap";
      if (event.status === "cancelled") {
        return `<span class="${base} bg-red-50 text-red-700">Cancelled</span>`;
      }
      const now = /* @__PURE__ */ new Date();
      const startRaw = event.start_date || event.start_at || event.starts_at;
      const endRaw = event.end_date || event.end_at || event.ends_at;
      const start = startRaw ? new Date(startRaw) : null;
      const end = endRaw ? new Date(endRaw) : null;
      if (!start || isNaN(start)) return "";
      if (start <= now && (!end || end >= now)) {
        return `<span class="${base} bg-rose-50 text-rose-700"><span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>Live</span>`;
      }
      if (end && end < now) {
        return `<span class="${base} bg-gray-100 text-gray-500">Past</span>`;
      }
      const ms = start - now;
      if (ms <= 864e5) {
        return `<span class="${base} bg-amber-50 text-amber-700">Soon</span>`;
      }
      return "";
    }
    function countdownChip(event) {
      if (!event || event.status === "cancelled") return "";
      const startRaw = event.start_date || event.start_at || event.starts_at;
      if (!startRaw) return "";
      const start = new Date(startRaw);
      if (isNaN(start)) return "";
      const ms = start - /* @__PURE__ */ new Date();
      if (ms <= 0) return "";
      if (ms > 72 * 36e5) return "";
      const hours = ms / 36e5;
      let label;
      if (hours < 1) {
        const m = Math.max(1, Math.round(ms / 6e4));
        label = `Starts in ${m}m`;
      } else if (hours < 24) {
        label = `Starts in ${Math.round(hours)}h`;
      } else {
        const days = Math.round(hours / 24);
        label = days === 1 ? "Tomorrow" : `In ${days} days`;
      }
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-brand-50 text-brand-700"><svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>${label}</span>`;
    }
    function typePill(eventType, flavor = "portal") {
      if (flavor === "public") {
        const tc2 = C7.TYPE_COLORS_PUBLIC && C7.TYPE_COLORS_PUBLIC[eventType] || C7.TYPE_COLORS_PUBLIC?.llc || { bg: "#f7f7f7", color: "#222", label: "Event" };
        return `<span class="evt-tag" style="background:${tc2.bg};color:${tc2.color}">${tc2.label}</span>`;
      }
      const tc = C7.TYPE_COLORS_PORTAL && C7.TYPE_COLORS_PORTAL[eventType] || C7.TYPE_COLORS_PORTAL?.llc || { bg: "bg-gray-100", text: "text-gray-700", label: "Event" };
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${tc.bg} ${tc.text} whitespace-nowrap">${tc.label}</span>`;
    }
    function categoryTag(category) {
      const tag = C7.CATEGORY_TAG && C7.CATEGORY_TAG[category] || C7.DEFAULT_TAG || { cls: "evt-tag--purple", label: "Event" };
      return `<span class="evt-tag ${tag.cls}">${tag.label}</span>`;
    }
    function rsvpChip(rsvp) {
      if (!rsvp || !rsvp.status) return "";
      const map = {
        going: { cls: "bg-brand-50 text-brand-700", label: "\u2713 Going" },
        maybe: { cls: "bg-amber-50 text-amber-700", label: "~ Maybe" },
        not_going: { cls: "bg-gray-100 text-gray-500", label: "Not going" },
        waitlist: { cls: "bg-violet-50 text-violet-700", label: "Waitlisted" },
        cancelled: { cls: "bg-red-50 text-red-600", label: "Cancelled" }
      };
      const m = map[rsvp.status];
      if (!m) return "";
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${m.cls}">${m.label}</span>`;
    }
    const EventsPills = {
      statusPill,
      statePill,
      typePill,
      categoryTag,
      rsvpChip,
      countdownChip
    };
    window.EventsPills = EventsPills;
  })();

  // js/components/events/card.js
  (function() {
    "use strict";
    const C7 = window.EventsConstants || {};
    const H6 = window.EventsHelpers || {};
    const P3 = window.EventsPills || {};
    function _startDate(event) {
      const raw = event.start_date || event.start_at || event.starts_at;
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d) ? null : d;
    }
    function _bannerBg(event) {
      if (event.banner_url) {
        return `background:linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.45)),url('${H6.escapeHtml(event.banner_url)}') center/cover`;
      }
      const grad = C7.CATEGORY_GRADIENT && C7.CATEGORY_GRADIENT[event.category] || C7.DEFAULT_GRADIENT || "linear-gradient(135deg,#1f2937,#6b7280)";
      return `background:${grad}`;
    }
    function _emptyBannerEmoji(event) {
      if (event.banner_url) return "";
      const emoji = C7.CATEGORY_EMOJI && C7.CATEGORY_EMOJI[event.category] || "\u{1F4C5}";
      return `<div class="absolute inset-0 flex items-center justify-center text-6xl opacity-40 pointer-events-none select-none">${emoji}</div>`;
    }
    function _categoryChip(event) {
      if (!event || !event.category) return "";
      const emoji = C7.CATEGORY_EMOJI && C7.CATEGORY_EMOJI[event.category] || "\u{1F4C5}";
      const label = C7.CATEGORY_TAG && C7.CATEGORY_TAG[event.category]?.label || event.category;
      const esc10 = H6.escapeHtml || ((s) => String(s == null ? "" : s));
      return `<button type="button" data-evt-cat="${esc10(event.category)}"
            class="evt-cat-chip absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center text-base leading-none hover:scale-110 active:scale-95 transition-transform"
            aria-label="Filter by ${esc10(label)}" title="Filter by ${esc10(label)}">${emoji}</button>`;
    }
    function _dateStamp(event) {
      const d = _startDate(event);
      if (!d) return '<div class="w-11"></div>';
      const day = d.getDate();
      const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      const isPinnedLlc = event && event.is_pinned && event.event_type === "llc";
      const pin = isPinnedLlc ? '<span class="evt-date-pin" aria-label="Pinned LLC event" title="Pinned">\u{1F4CC}</span>' : "";
      const dow = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      return `<div class="relative shrink-0 text-center min-w-[44px]">
            ${pin}
            <div class="text-[20px] leading-none font-extrabold text-gray-900">${day}</div>
            <div class="text-[10px] tracking-wider font-bold text-brand-600 mt-0.5">${mon}</div>
            <div class="evt-date-stamp-dow text-[9px] tracking-wider font-semibold text-gray-400 mt-0.5">${dow}</div>
        </div>`;
    }
    function _relativeLabel(event) {
      const d = _startDate(event);
      if (!d || !H6.relativeDate) return "";
      const lbl = H6.relativeDate(d);
      if (!lbl) return "";
      return `<span class="text-[12px] font-semibold text-gray-500">${lbl}</span>`;
    }
    function _meta(event) {
      const parts = [];
      const catLabel = C7.CATEGORY_TAG && C7.CATEGORY_TAG[event.category]?.label || null;
      if (catLabel) parts.push(catLabel);
      const tc = C7.TYPE_COLORS_PORTAL && C7.TYPE_COLORS_PORTAL[event.event_type];
      if (tc?.label) parts.push(tc.label);
      const loc = event.location_nickname || event.location_text;
      if (loc) parts.push(H6.escapeHtml ? H6.escapeHtml(loc) : loc);
      const time = _startDate(event);
      if (time && H6.formatDate) parts.push(H6.formatDate(time, "time"));
      if (!parts.length) return "";
      return `<p class="text-[13px] text-gray-500 truncate mt-1" data-evt-legacy-meta>${parts.join(" \xB7 ")}</p>`;
    }
    function _avatarStack(attendees) {
      const list = Array.isArray(attendees) ? attendees : [];
      if (!list.length) return "";
      const visible = list.slice(0, 4);
      const overflow = Math.max(0, list.length - 4);
      const pieces = visible.map((a) => {
        const name = H6.escapeHtml ? H6.escapeHtml(a.first_name || "") : a.first_name || "";
        if (a.profile_picture_url) {
          const url = H6.escapeHtml ? H6.escapeHtml(a.profile_picture_url) : a.profile_picture_url;
          return `<img src="${url}" alt="${name}" loading="lazy" class="w-7 h-7 rounded-full ring-2 ring-white object-cover bg-gray-100">`;
        }
        const initial = (a.first_name || "?").trim().charAt(0).toUpperCase() || "?";
        return `<span class="w-7 h-7 rounded-full ring-2 ring-white bg-brand-100 text-brand-700 text-[11px] font-bold inline-flex items-center justify-center">${initial}</span>`;
      });
      if (overflow > 0) {
        pieces.push(`<span class="w-7 h-7 rounded-full ring-2 ring-white bg-gray-100 text-gray-600 text-[11px] font-bold inline-flex items-center justify-center">+${overflow}</span>`);
      }
      return `<div class="flex -space-x-2">${pieces.join("")}</div>`;
    }
    function _goingRibbon(rsvp) {
      if (!rsvp || rsvp.status !== "going") return "";
      return `<div class="evt-going-ribbon bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider px-4 py-1 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>You're going
        </div>`;
    }
    function _adminFooter(event, adminMeta) {
      const rsvps = adminMeta?.rsvps ?? 0;
      const revenue = adminMeta?.revenue ?? 0;
      const revStr = H6.formatMoney ? H6.formatMoney(revenue) : `$${(revenue / 100).toFixed(0)}`;
      return `<div class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
            <span class="font-semibold text-gray-700">${rsvps}</span> RSVPs
            <span class="text-gray-300">\xB7</span>
            <span class="font-semibold text-gray-700">${revStr}</span> revenue
            <span class="ml-auto">${P3.statusPill ? P3.statusPill(event.status) : ""}</span>
        </div>`;
    }
    function render(event, opts = {}) {
      if (!event) return "";
      const variant = opts.variant || "portal";
      const href = opts.href || `?event=${encodeURIComponent(event.slug || "")}`;
      const title = H6.escapeHtml ? H6.escapeHtml(event.title || "Untitled event") : event.title || "";
      const stateP = P3.statePill ? P3.statePill(event) : "";
      const countP = variant === "portal" && P3.countdownChip ? P3.countdownChip(event) : "";
      const ribbon = variant === "portal" ? _goingRibbon(opts.rsvp) : "";
      const stack = variant === "portal" ? _avatarStack(opts.attendees) : "";
      const _d = _startDate(event);
      const _day = _d ? _d.getDate() : "";
      const _mon = _d ? _d.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "";
      const _dow = _d ? _d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() : "";
      const dataDate = _d ? ` data-evt-day="${_day}" data-evt-mon="${_mon}"` : "";
      const dateChipOverlay = _d ? `<div class="evt-card-date-chip" aria-hidden="true"><span class="evt-card-date-mon">${_mon}</span><span class="evt-card-date-day">${_day}</span><span class="evt-card-date-dow" data-f15-dow>${_dow}</span></div>` : "";
      const isGoing = !!(opts.rsvp && opts.rsvp.status === "going");
      const rsvpFooter = variant === "portal" ? `<button type="button" data-evt-card-rsvp="${event.id}" class="evt-card-rsvp${isGoing ? " evt-card-rsvp--on" : ""}" aria-pressed="${isGoing ? "true" : "false"}">${isGoing ? "\u2713 Going" : "Details"}</button>` : "";
      const _tcLabel = C7.TYPE_COLORS_PORTAL && C7.TYPE_COLORS_PORTAL[event.event_type]?.label || "";
      const _catLabel = C7.CATEGORY_TAG && C7.CATEGORY_TAG[event.category]?.label || "";
      const f15TypeHost = _tcLabel || _catLabel ? `<p class="evt-card-f15-type" data-f15-type>${[_tcLabel, _catLabel].filter(Boolean).map((s) => H6.escapeHtml ? H6.escapeHtml(s) : s).join(" \xB7 ")}</p>` : "";
      const _f15Loc = event.location_nickname || event.location_text || "";
      const _f15Time = _d && H6.formatDate ? H6.formatDate(_d, "time") : "";
      const f15LocRow = _f15Loc ? `<p class="evt-card-f15-row" data-f15-loc><svg class="evt-card-f15-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg><span class="truncate">${H6.escapeHtml ? H6.escapeHtml(_f15Loc) : _f15Loc}</span></p>` : "";
      const f15TimeRow = _f15Time ? `<p class="evt-card-f15-row" data-f15-time><svg class="evt-card-f15-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3 2"/></svg><span>${H6.escapeHtml ? H6.escapeHtml(_f15Time) : _f15Time}</span></p>` : "";
      const f15Body = f15TypeHost || f15LocRow || f15TimeRow ? `<div class="evt-card-f15" data-f15>${f15TypeHost}${f15LocRow}${f15TimeRow}</div>` : "";
      const _goingCount = opts.goingCount != null ? opts.goingCount : Array.isArray(opts.attendees) ? opts.attendees.length : 0;
      const f15GoingLabel = _goingCount > 0 ? `<span class="evt-card-f15-going">${_goingCount} going</span>` : "";
      const f15RsvpPill = variant === "portal" ? `<button type="button" data-evt-card-rsvp="${event.id}" data-f15-rsvp class="evt-card-f15-rsvp${isGoing ? " evt-card-f15-rsvp--on" : ""}" aria-pressed="${isGoing ? "true" : "false"}">${isGoing ? "\u2713 Going" : "Details"}</button>` : "";
      const f15Footer = variant === "portal" ? `<div class="evt-card-f15-foot" data-f15-foot><div class="evt-card-f15-foot__left">${stack}${f15GoingLabel}</div>${f15RsvpPill}</div>` : "";
      return `<a href="${href}" data-evt-card="${event.id}"${dataDate} class="group block bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition md:hover:shadow-md md:hover:-translate-y-0.5">
            ${ribbon}
            <div class="px-4 pt-3 pb-2 flex items-center gap-3 evt-card-header-row">
                ${_dateStamp(event)}
                <div class="flex-1 min-w-0 flex items-center justify-end">
                    ${_relativeLabel(event)}
                </div>
            </div>
            <div class="relative w-full aspect-[16/9] evt-card-banner" style="${_bannerBg(event)}">
                ${_emptyBannerEmoji(event)}
                ${dateChipOverlay}
                ${_categoryChip(event)}
                ${stateP ? `<div class="absolute top-3 right-3">${stateP}</div>` : ""}
            </div>
            <div class="p-4">
                <h3 class="text-base font-bold text-gray-900 line-clamp-2 leading-snug">${title}</h3>
                ${f15Body}
                ${_meta(event)}
                ${stack || countP ? `<div class="mt-3 flex items-center justify-between gap-3" data-evt-legacy-stack>
                    <div class="min-w-0">${stack}</div>
                    <div class="shrink-0">${countP}</div>
                </div>` : ""}
                ${rsvpFooter}
                ${f15Footer}
                ${variant === "admin" ? _adminFooter(event, opts.adminMeta) : ""}
            </div>
        </a>`;
    }
    function skeleton() {
      return `<div class="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden animate-pulse">
            <div class="px-4 pt-3 pb-2 flex items-center gap-3">
                <div class="w-11 h-9 bg-gray-100 rounded"></div>
                <div class="flex-1"></div>
                <div class="w-14 h-3 bg-gray-100 rounded"></div>
            </div>
            <div class="w-full aspect-[16/9] bg-gray-100"></div>
            <div class="p-4 space-y-2">
                <div class="h-4 bg-gray-100 rounded w-3/4"></div>
                <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                <div class="h-7 bg-gray-100 rounded-full w-1/3 mt-3"></div>
            </div>
        </div>`;
    }
    window.EventsCard = { render, skeleton };
  })();

  // js/portal/events/index.js
  var PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
  var C = globalThis.EventsConstants || {};
  var portalEventsConstants = {
    CATEGORY_EMOJI: C.CATEGORY_EMOJI,
    TYPE_COLORS: C.TYPE_COLORS_PORTAL,
    STATUS_COLORS: C.STATUS_COLORS
  };
  PortalEvents.constants = portalEventsConstants;
  if (typeof window !== "undefined") window.PortalEvents = globalThis.PortalEvents;

  // js/portal/events/core/state.js
  var EventsState = {
    evtCurrentUser: null,
    evtCurrentUserRole: null,
    evtActiveTab: "upcoming",
    evtBannerFile: null,
    evtEmbedImageFile: null,
    evtAllEvents: [],
    evtAllRsvps: {},
    // event_id → rsvp record
    evtScannerStream: null,
    evtScannerAnimFrame: null
  };
  for (const key of Object.keys(EventsState)) {
    Object.defineProperty(globalThis, key, {
      get() {
        return EventsState[key];
      },
      set(v) {
        EventsState[key] = v;
      },
      enumerable: true,
      configurable: true
    });
  }

  // js/portal/events/core/utils.js
  var EVT_BADGE_EMOJI = { founding_member: "\u{1F3C5}", shutterbug: "\u{1F4F8}", streak_master: "\u{1F525}", streak_legend: "\u26A1", first_seed: "\u{1F331}", four_figures: "\u{1F4B5}", quest_champion: "\u{1F3AF}", fidelity_linked: "\u{1F3E6}", birthday_vip: "\u{1F382}" };
  function evtBadgeChip2(badgeKey) {
    if (!badgeKey) return "";
    if (typeof buildNavBadgeOverlay === "function") return buildNavBadgeOverlay(badgeKey);
    return `<div class="badge-chip-overlay">${EVT_BADGE_EMOJI[badgeKey] || "\u2753"}</div>`;
  }
  function evtToggleModal(id, show) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (show) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    } else {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }
  function evtGenerateSlug2(title) {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").substring(0, 60) + "-" + Date.now().toString(36);
  }
  function evtEscapeHtml2(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function evtHandleBannerSelect() {
    const file = document.getElementById("bannerFile").files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5 MB.");
      return;
    }
    globalThis.evtBannerFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("bannerPreview").src = e.target.result;
      document.getElementById("bannerPreviewWrap").classList.remove("hidden");
      document.getElementById("bannerUploadHint").classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }
  function evtHandleEmbedImageSelect() {
    const file = document.getElementById("embedImageFile").files[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      alert("Please choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5 MB.");
      return;
    }
    globalThis.evtEmbedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("embedImagePreview").src = e.target.result;
      document.getElementById("embedImagePreviewWrap").classList.remove("hidden");
      document.getElementById("embedImageUploadHint").classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }
  function evtNavigateToEvent(slug) {
    if (slug && typeof slug === "object") slug = slug.slug || slug.id || "";
    if (!slug) return;
    const url = new URL(window.location);
    url.searchParams.set("event", slug);
    history.pushState({ view: "detail", slug }, "", url);
    globalThis.evtRouteByUrl();
  }
  function evtNavigateToList() {
    const url = new URL(window.location);
    url.searchParams.delete("event");
    history.pushState({ view: "list" }, "", url);
    globalThis.evtRouteByUrl();
  }
  function evtRouteByUrl() {
    const slug = new URLSearchParams(window.location.search).get("event");
    const listView = document.getElementById("eventsListView");
    const detailView = document.getElementById("eventsDetailView");
    if (!listView || !detailView) return;
    if (slug) {
      listView.classList.add("hidden");
      detailView.classList.remove("hidden");
      detailView.innerHTML = '<div class="flex items-center justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent"></div></div>';
      globalThis.evtLoadDetailBySlug(slug);
    } else {
      detailView.classList.add("hidden");
      detailView.innerHTML = "";
      listView.classList.remove("hidden");
      document.title = "Events | Justice McNeal LLC";
      if (typeof evtCleanupMap === "function") evtCleanupMap();
      if (typeof evtCleanupBottomNav === "function") evtCleanupBottomNav();
    }
  }
  async function evtLoadDetailBySlug(slug) {
    let event = globalThis.evtAllEvents.find((e) => e.slug === slug);
    if (event) {
      globalThis.evtOpenDetail(event.id);
      return;
    }
    const { data, error } = await supabaseClient.from("events").select("*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)").eq("slug", slug).maybeSingle();
    if (error || !data) {
      const detailView = document.getElementById("eventsDetailView");
      if (detailView) {
        detailView.innerHTML = `
                <div class="max-w-md mx-auto text-center py-20 px-4">
                    <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <h2 class="text-lg font-bold text-gray-900 mb-1">Event not found</h2>
                    <p class="text-sm text-gray-500 mb-6">This event may have been removed or the link is incorrect.</p>
                    <button onclick="globalThis.evtNavigateToList()" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        Back to Events
                    </button>
                </div>`;
      }
      document.title = "Event Not Found | Justice McNeal LLC";
      return;
    }
    if (!globalThis.evtAllEvents.find((e) => e.id === data.id)) {
      globalThis.evtAllEvents.push(data);
    }
    globalThis.evtOpenDetail(data.id);
  }
  function evtPublicEventInviteUrl(slug) {
    if (!slug) return "";
    return `https://justicemcneal.com/events/?e=${encodeURIComponent(slug)}`;
  }
  function evtCopyShareUrl(slug) {
    const url = slug ? evtPublicEventInviteUrl(slug) : document.getElementById("shareUrl")?.value;
    if (!url) return;
    if (navigator.share) {
      navigator.share({ title: "Check out this event", url }).catch(() => {
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        const toast = document.createElement("div");
        toast.textContent = "Link copied!";
        toast.className = "fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg z-[999] transition-opacity duration-300";
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => toast.remove(), 300);
        }, 1500);
      });
    }
  }
  function evtDownloadIcs(eventId2) {
    const e = (globalThis.evtAllEvents || []).find((ev) => ev.id === eventId2);
    if (!e) return;
    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 72e5);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const uid = `${e.id}@justicemcnealllc.com`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//JusticeMcNealLLC//Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${e.title.replace(/[,;\\]/g, "")}`,
      `DESCRIPTION:${(e.description || "").replace(/\n/g, "\\n").slice(0, 500)}`,
      `LOCATION:${(e.location_text || "").replace(/[,;\\]/g, "")}`,
      `URL:${window.location.origin}/events/?e=${e.slug}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.slug || "event"}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  var _utilsGlobal = {
    evtBadgeChip: evtBadgeChip2,
    evtToggleModal,
    evtGenerateSlug: evtGenerateSlug2,
    evtEscapeHtml: evtEscapeHtml2,
    evtHandleBannerSelect,
    evtHandleEmbedImageSelect,
    evtNavigateToEvent,
    evtNavigateToList,
    evtRouteByUrl,
    evtLoadDetailBySlug,
    evtPublicEventInviteUrl,
    evtCopyShareUrl,
    evtDownloadIcs
  };
  for (const [name, fn] of Object.entries(_utilsGlobal)) {
    globalThis[name] = fn;
  }

  // js/portal/events/core/actions.js
  function evtDataAction(action, ...args) {
    if (!action) return "";
    let attrs = `data-evt-action="${String(action).replace(/"/g, "&quot;")}"`;
    if (args.length) {
      const json = JSON.stringify(args);
      attrs += ` data-evt-args="${json.replace(/"/g, "&quot;")}"`;
    }
    return attrs;
  }
  var _delegateInstalled = false;
  function installEvtActionDelegate() {
    if (_delegateInstalled) return;
    _delegateInstalled = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-evt-action]");
      if (!el) return;
      const action = el.getAttribute("data-evt-action");
      if (!action) return;
      const fn = globalThis[action];
      if (typeof fn !== "function") {
        console.warn(`[events actions] ${action} is not a function`);
        return;
      }
      let args = [];
      const raw = el.getAttribute("data-evt-args");
      if (raw) {
        try {
          args = JSON.parse(raw);
        } catch (_) {
          console.warn("[events actions] invalid data-evt-args on", el);
          return;
        }
      }
      fn(...args);
    });
  }
  globalThis.evtDataAction = evtDataAction;
  installEvtActionDelegate();

  // js/portal/events/core/vendor-loader.js
  var SRC = {
    qrcode: "https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js",
    jsqr: "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js",
    leafletJs: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    leafletCss: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  };
  var scriptPromises = {};
  function loadScript(src, isReady) {
    if (isReady()) return Promise.resolve(isReady());
    if (!scriptPromises[src]) {
      scriptPromises[src] = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        const script = existing || document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => isReady() ? resolve(isReady()) : reject(new Error(`Vendor did not initialize: ${src}`));
        script.onerror = () => reject(new Error(`Vendor failed to load: ${src}`));
        if (!existing) document.head.appendChild(script);
      });
    }
    return scriptPromises[src];
  }
  var leafletCssPromise = null;
  function loadLeafletCss() {
    if (document.querySelector(`link[href="${SRC.leafletCss}"]`)) return Promise.resolve();
    if (!leafletCssPromise) {
      leafletCssPromise = new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = SRC.leafletCss;
        link.crossOrigin = "";
        link.onload = () => resolve();
        link.onerror = () => reject(new Error("Leaflet CSS failed to load"));
        document.head.appendChild(link);
      });
    }
    return leafletCssPromise;
  }
  async function ensureQRCode() {
    return loadScript(SRC.qrcode, () => globalThis.QRCode);
  }
  async function ensureJsQR() {
    return loadScript(SRC.jsqr, () => globalThis.jsQR);
  }
  async function ensureLeaflet() {
    await loadLeafletCss();
    return loadScript(SRC.leafletJs, () => globalThis.L);
  }
  var root = typeof window !== "undefined" ? window : globalThis;
  root.PortalEvents = root.PortalEvents || {};
  root.PortalEvents.vendors = { ensureQRCode, ensureJsQR, ensureLeaflet };
  root.evtEnsureQRCode = ensureQRCode;
  root.evtEnsureJsQR = ensureJsQR;
  root.evtEnsureLeaflet = ensureLeaflet;

  // js/portal/events/main.js
  var import_raffle_model = __toESM(require_raffle_model());

  // js/portal/events/list/search.js
  var C2 = window.EventsConstants || {};
  var SEARCH_HIST_KEY = "evt_search_hist_v1";
  var SEARCH_HIST_MAX = 8;
  var SEARCH_HIST_SHOW = 5;
  var QUICK_CATS = ["cookout", "birthday", "trip", "party"];
  function api() {
    return window.PortalEventsListSearchApi || {};
  }
  function _readHistory() {
    try {
      const raw = sessionStorage.getItem(SEARCH_HIST_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
    } catch (_) {
      return [];
    }
  }
  function _writeHistory(arr) {
    try {
      sessionStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(arr.slice(0, SEARCH_HIST_MAX)));
    } catch (_) {
    }
  }
  function _pushHistory(q) {
    const s = (q || "").trim();
    if (s.length < 2) return;
    const lc = s.toLowerCase();
    const list = _readHistory().filter((x) => x.toLowerCase() !== lc);
    list.unshift(s);
    _writeHistory(list);
  }
  function _removeHistory(q) {
    const lc = (q || "").toLowerCase();
    _writeHistory(_readHistory().filter((x) => x.toLowerCase() !== lc));
  }
  function _clearHistory() {
    try {
      sessionStorage.removeItem(SEARCH_HIST_KEY);
    } catch (_) {
    }
  }
  function _escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function renderSearchSuggest() {
    const expand = document.getElementById("evtSearchExpand");
    const input = document.getElementById("evtSearchInput");
    if (!expand || !input) return;
    if (expand.classList.contains("hidden")) {
      hideSearchSuggest();
      return;
    }
    if ((input.value || "").trim() !== "") {
      hideSearchSuggest();
      return;
    }
    let host = document.getElementById("evtSearchSuggest");
    if (!host) {
      host = document.createElement("div");
      host.id = "evtSearchSuggest";
      host.className = "evt-search-suggest absolute left-0 right-0 mt-2 top-full rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden z-40";
      host.setAttribute("role", "listbox");
      expand.appendChild(host);
    }
    const hist = _readHistory().slice(0, SEARCH_HIST_SHOW);
    const parts = [];
    if (hist.length) {
      parts.push('<div class="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-gray-500">Recent</div>');
      parts.push("<ul>");
      hist.forEach((q) => {
        const qa = _escapeAttr(q);
        parts.push(
          '<li class="evt-suggest-row flex items-center gap-2 px-3 py-2 hover:bg-brand-50 cursor-pointer" data-suggest-q="' + qa + '" role="option"><span class="text-gray-400" aria-hidden="true">\u{1F550}</span><span class="flex-1 min-w-0 truncate text-sm text-gray-800">' + qa + '</span><button type="button" class="evt-suggest-remove p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" data-suggest-rm="' + qa + '" aria-label="Remove from history" title="Remove"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></li>'
        );
      });
      parts.push(
        '<li class="evt-suggest-clear flex items-center gap-2 px-3 py-2 border-t border-gray-100 hover:bg-gray-50 cursor-pointer text-xs text-gray-500" data-suggest-clear="1" role="option"><span aria-hidden="true">\u{1F5D1}</span><span>Clear search history</span></li>'
      );
      parts.push("</ul>");
    }
    parts.push('<div class="px-3 ' + (hist.length ? "pt-3" : "pt-2") + ' pb-1 text-[11px] uppercase tracking-wide text-gray-500">Quick categories</div>');
    parts.push('<div class="evt-suggest-chip-row flex flex-wrap gap-2 px-3 pb-3">');
    QUICK_CATS.forEach((cat) => {
      const emoji = C2.CATEGORY_EMOJI && C2.CATEGORY_EMOJI[cat] || "\u{1F4C5}";
      const label = C2.CATEGORY_TAG && C2.CATEGORY_TAG[cat]?.label || cat;
      parts.push(
        '<button type="button" class="evt-suggest-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-brand-50 border border-gray-200 text-sm text-gray-700" data-suggest-cat="' + cat + '"><span aria-hidden="true">' + emoji + "</span><span>" + label + "</span></button>"
      );
    });
    parts.push("</div>");
    host.innerHTML = parts.join("");
  }
  function hideSearchSuggest() {
    const host = document.getElementById("evtSearchSuggest");
    if (host) host.innerHTML = "";
  }
  function wireSuggestClicks() {
    const expand = document.getElementById("evtSearchExpand");
    if (!expand || expand.dataset.suggestWired === "1") return;
    expand.dataset.suggestWired = "1";
    expand.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-suggest-rm]");
      if (rm) {
        e.preventDefault();
        e.stopPropagation();
        _removeHistory(rm.getAttribute("data-suggest-rm"));
        renderSearchSuggest();
        return;
      }
      const clr = e.target.closest("[data-suggest-clear]");
      if (clr) {
        e.preventDefault();
        e.stopPropagation();
        _clearHistory();
        renderSearchSuggest();
        return;
      }
      const row = e.target.closest("[data-suggest-q]");
      if (row) {
        e.preventDefault();
        e.stopPropagation();
        const q = row.getAttribute("data-suggest-q") || "";
        const input = document.getElementById("evtSearchInput");
        const clear = document.getElementById("evtSearchClear");
        if (input) {
          input.value = q;
          clear?.classList.toggle("hidden", !q);
        }
        api().setSearchQuery?.(q);
        _pushHistory(q);
        api().persistState?.();
        hideSearchSuggest();
        api().renderEvents?.();
        return;
      }
      const chip = e.target.closest("[data-suggest-cat]");
      if (chip) {
        e.preventDefault();
        e.stopPropagation();
        const cat = chip.getAttribute("data-suggest-cat") || "";
        const prev = api().getActiveCategory?.() || "";
        api().setActiveCategory?.(prev === cat ? "" : cat);
        api().persistState?.();
        hideSearchSuggest();
        api().renderEvents?.();
      }
    });
    document.addEventListener("click", (e) => {
      const host = document.getElementById("evtSearchSuggest");
      if (!host || !host.innerHTML) return;
      if (expand.contains(e.target) || document.getElementById("evtSearchToggle")?.contains(e.target)) return;
      hideSearchSuggest();
    });
  }
  function setupSearch() {
    const toggle = document.getElementById("evtSearchToggle");
    const expand = document.getElementById("evtSearchExpand");
    const input = document.getElementById("evtSearchInput");
    const clear = document.getElementById("evtSearchClear");
    if (toggle && expand && input) {
      toggle.addEventListener("click", () => {
        const willOpen = expand.classList.contains("hidden");
        expand.classList.toggle("hidden", !willOpen);
        toggle.setAttribute("aria-expanded", String(willOpen));
        if (willOpen) {
          setTimeout(() => input.focus(), 50);
          renderSearchSuggest();
        } else if (input.value) {
          input.value = "";
          api().setSearchQuery?.("");
          clear?.classList.add("hidden");
          api().persistState?.();
          api().renderEvents?.();
          hideSearchSuggest();
        } else {
          hideSearchSuggest();
        }
      });
    }
    if (!input) return;
    wireSuggestClicks();
    input.addEventListener("input", () => {
      const q = input.value.trim();
      clear?.classList.toggle("hidden", !q);
      if (q === "") renderSearchSuggest();
      else hideSearchSuggest();
      const prev = api().getSearchDebounce?.();
      if (prev) clearTimeout(prev);
      const id = setTimeout(() => {
        api().setSearchQuery?.(q);
        if (q.length >= 2) _pushHistory(q);
        api().persistState?.();
        api().renderEvents?.();
      }, 120);
      api().setSearchDebounce?.(id);
    });
    clear?.addEventListener("click", () => {
      input.value = "";
      clear.classList.add("hidden");
      api().setSearchQuery?.("");
      api().persistState?.();
      api().renderEvents?.();
      input.focus();
      renderSearchSuggest();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = input.value.trim();
        if (q.length >= 2) {
          const prev = api().getSearchDebounce?.();
          if (prev) clearTimeout(prev);
          api().setSearchQuery?.(q);
          _pushHistory(q);
          api().persistState?.();
          hideSearchSuggest();
          api().renderEvents?.();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (input.value) {
          clear?.click();
        } else if (expand) {
          expand.classList.add("hidden");
          toggle?.setAttribute("aria-expanded", "false");
          toggle?.focus();
          hideSearchSuggest();
        }
      }
    });
  }
  var PortalEventsListSearch = {
    setupSearch,
    renderSearchSuggest,
    hideSearchSuggest,
    wireSuggestClicks,
    pushHistory: _pushHistory,
    readHistory: _readHistory
  };
  globalThis.PortalEventsListSearch = PortalEventsListSearch;

  // js/portal/events/list/right-rail.js
  var H = window.EventsHelpers || {};
  function api2() {
    return window.PortalEventsListRightRailApi || {};
  }
  function _toIsoDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function renderMiniCalendar() {
    const mount = document.getElementById("evtRailSlotCalendar");
    if (!mount) return;
    if (!document.body.classList.contains("evt-vlift")) {
      mount.innerHTML = "";
      return;
    }
    const today = /* @__PURE__ */ new Date();
    let miniCalMonth = api2().getMiniCalMonth?.();
    if (!miniCalMonth) {
      miniCalMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      api2().setMiniCalMonth?.(miniCalMonth);
    }
    const monthStart = new Date(miniCalMonth);
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const evtDays = /* @__PURE__ */ new Set();
    (window.evtAllEvents || []).forEach((ev) => {
      if (!ev || !ev.start_date) return;
      const d = new Date(ev.start_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        evtDays.add(_toIsoDate(d));
      }
    });
    const firstDow = monthStart.getDay();
    const gridStart = new Date(year, month, 1 - firstDow);
    const todayIso = _toIsoDate(today);
    const activeDay = api2().getActiveDay?.() || "";
    const dayHeaders = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => '<div class="evt-mcal-dow">' + d + "</div>").join("");
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = _toIsoDate(d);
      const isOther = d.getMonth() !== month;
      const isToday = iso === todayIso;
      const hasEvt = evtDays.has(iso);
      const isActive = iso === activeDay;
      const cls = ["evt-mcal-day"];
      if (isOther) cls.push("evt-mcal-day--other");
      if (isToday) cls.push("evt-mcal-day--today");
      if (hasEvt) cls.push("evt-mcal-day--has");
      if (isActive) cls.push("evt-mcal-day--active");
      cells += '<button type="button" class="' + cls.join(" ") + '" data-mcal-day="' + iso + '" aria-label="' + d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + '">' + d.getDate() + "</button>";
    }
    mount.innerHTML = '<div class="evt-mcal" role="group" aria-label="Mini calendar"><p class="evt-mcal-section-heading">Calendar</p><div class="evt-mcal-head"><button type="button" class="evt-mcal-nav" data-mcal-prev aria-label="Previous month">&lsaquo;</button><span class="evt-mcal-title">' + monthLabel + '</span><button type="button" class="evt-mcal-nav" data-mcal-next aria-label="Next month">&rsaquo;</button></div><div class="evt-mcal-dow-row">' + dayHeaders + '</div><div class="evt-mcal-grid">' + cells + "</div>" + (activeDay ? '<button type="button" class="evt-mcal-clear" data-mcal-clear>Clear day filter</button>' : "") + "</div>";
    mount.querySelector("[data-mcal-prev]")?.addEventListener("click", () => {
      api2().setMiniCalMonth?.(new Date(year, month - 1, 1));
      renderMiniCalendar();
    });
    mount.querySelector("[data-mcal-next]")?.addEventListener("click", () => {
      api2().setMiniCalMonth?.(new Date(year, month + 1, 1));
      renderMiniCalendar();
    });
    mount.querySelector("[data-mcal-clear]")?.addEventListener("click", () => {
      api2().setActiveDay?.("");
      api2().renderEvents?.();
    });
    mount.querySelectorAll("[data-mcal-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const iso = btn.getAttribute("data-mcal-day");
        const cur = api2().getActiveDay?.() || "";
        api2().setActiveDay?.(cur === iso ? "" : iso);
        api2().renderEvents?.();
      });
    });
    const rail = document.getElementById("evtRightRail");
    if (rail) rail.classList.remove("hidden");
  }
  function renderMyRsvps() {
    const mount = document.getElementById("evtRailSlotRsvps");
    if (!mount) return;
    if (!document.body.classList.contains("evt-vlift")) {
      mount.innerHTML = "";
      return;
    }
    const all = window.evtAllEvents || [];
    const rsvps = window.evtAllRsvps || {};
    const esc10 = H.escapeHtml || ((s) => String(s == null ? "" : s));
    const now = Date.now();
    const mine = all.filter((ev) => {
      const r = rsvps[ev.id];
      if (!r || r.status !== "going") return false;
      const t = new Date(ev.start_date).getTime();
      return !isNaN(t) && t >= now;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    if (!mine.length) {
      mount.innerHTML = "";
      return;
    }
    const total = mine.length;
    const rows = mine.slice(0, 3).map((ev) => {
      const d = new Date(ev.start_date);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const hasBanner = !!ev.banner_url;
      const thumbStyle = hasBanner ? "background: url('" + esc10(ev.banner_url) + "') center/cover;" : "background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);";
      return '<button type="button" class="evt-myrsvp-row" data-evt-myrsvp="' + esc10(ev.id) + '"><span class="evt-myrsvp-thumb" aria-hidden="true" style="' + thumbStyle + '"></span><span class="evt-myrsvp-body"><span class="evt-myrsvp-title">' + esc10(ev.title || "Untitled event") + '</span><span class="evt-myrsvp-meta">' + esc10(dateStr) + ", " + esc10(timeStr) + "</span></span></button>";
    }).join("");
    mount.innerHTML = '<div class="evt-myrsvps"><div class="evt-myrsvps-head"><h3 class="evt-myrsvps-title">Your Upcoming RSVPs</h3><span class="evt-myrsvps-count">' + total + '</span></div><div class="evt-myrsvps-list">' + rows + '</div><button type="button" class="evt-myrsvps-all" data-evt-myrsvps-all>View All My Events</button></div>';
    mount.querySelectorAll("[data-evt-myrsvp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-evt-myrsvp");
        const ev = all.find((e) => e.id === id);
        if (!ev) return;
        if (ev.slug && typeof window.evtNavigateToEvent === "function") {
          window.evtNavigateToEvent(ev.slug);
        } else if (typeof window.evtOpenDetail === "function") {
          window.evtOpenDetail(ev.id);
        }
      });
    });
    mount.querySelector("[data-evt-myrsvps-all]")?.addEventListener("click", () => {
      document.querySelector('[data-filter="going"]')?.click();
    });
    const rail = document.getElementById("evtRightRail");
    if (rail) rail.classList.remove("hidden");
  }
  function renderStatsCard() {
    const mount = document.getElementById("evtRailSlotStats");
    if (!mount) return;
    if (!document.body.classList.contains("evt-vlift")) {
      mount.innerHTML = "";
      return;
    }
    const all = window.evtAllEvents || [];
    const rsvps = window.evtAllRsvps || {};
    const now = /* @__PURE__ */ new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const thisMonth = all.filter((ev) => {
      const d = new Date(ev.start_date);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
    const going = Object.values(rsvps).filter((r) => r && r.status === "going").length;
    const communities = /* @__PURE__ */ new Set();
    all.forEach((ev) => {
      if (ev && ev.event_type) communities.add(ev.event_type);
    });
    mount.innerHTML = '<div class="evt-stats"><h3 class="evt-stats-title">Events Overview</h3><div class="evt-stats-row"><span class="evt-stats-icon evt-stats-icon--purple" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span><span class="evt-stats-body"><span class="evt-stats-label">This Month</span><span class="evt-stats-sub">Upcoming events</span></span><span class="evt-stats-value">' + thisMonth + '</span></div><div class="evt-stats-row"><span class="evt-stats-icon evt-stats-icon--green" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="evt-stats-body"><span class="evt-stats-label">You\u2019re Going</span><span class="evt-stats-sub">Events</span></span><span class="evt-stats-value">' + going + '</span></div><div class="evt-stats-row"><span class="evt-stats-icon evt-stats-icon--blue" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span><span class="evt-stats-body"><span class="evt-stats-label">Communities</span><span class="evt-stats-sub">Active communities</span></span><span class="evt-stats-value">' + communities.size + '</span></div><button type="button" class="evt-stats-link" data-evt-stats-all>View Full Calendar</button></div>';
    mount.querySelector("[data-evt-stats-all]")?.addEventListener("click", () => {
      const viewBtn = document.querySelector('[data-view="calendar"]');
      if (viewBtn) viewBtn.click();
    });
    const rail = document.getElementById("evtRightRail");
    if (rail) rail.classList.remove("hidden");
  }
  var PortalEventsListRightRail = {
    renderMiniCalendar,
    renderMyRsvps,
    renderStatsCard
  };
  globalThis.PortalEventsListRightRail = PortalEventsListRightRail;

  // js/portal/events/list/header.js
  var H2 = window.EventsHelpers || {};
  var _evtBellObserver = null;
  function renderHeaderGreeting() {
    const title = document.getElementById("evtHeaderTitle");
    if (!title) return;
    const name = (window.evtCurrentUserName || "").trim();
    if (document.body.classList.contains("evt-vlift")) {
      const old = document.getElementById("evtHeaderGreeting");
      if (old) old.remove();
      const slot = document.querySelector("#evtGreetingHello [data-greeting-name]");
      if (slot && name) slot.textContent = name;
      return;
    }
    let g2 = document.getElementById("evtHeaderGreeting");
    if (!name) {
      if (g2) g2.remove();
      return;
    }
    if (!g2) {
      g2 = document.createElement("small");
      g2.id = "evtHeaderGreeting";
      g2.className = "evt-header-greeting block text-xs text-gray-400 mb-1";
      title.parentNode.insertBefore(g2, title);
    }
    const esc10 = H2.escapeHtml || ((s) => String(s == null ? "" : s));
    g2.textContent = "Hey " + esc10(name) + " \u{1F44B}";
  }
  function renderHeaderCount() {
    const el = document.getElementById("evtHeaderCount");
    if (!el) return;
    const all = window.evtAllEvents || [];
    const rsvps = window.evtAllRsvps || {};
    const now = /* @__PURE__ */ new Date();
    const upcoming = all.filter(
      (e) => e.status !== "cancelled" && e.status !== "draft" && new Date(e.start_date) >= now
    ).length;
    const going = Object.values(rsvps).filter((r) => r.status === "going").length;
    const parts = [];
    if (going) parts.push(going + " going");
    parts.push(upcoming + " upcoming");
    el.textContent = parts.join(" \xB7 ");
    renderHeaderGreeting();
  }
  function wireHeaderBellBadge() {
    const badge = document.getElementById("notifBadge");
    const dot = document.getElementById("evtHeaderBellDot");
    if (!dot) return;
    const sync = () => {
      if (!badge) {
        dot.classList.add("hidden");
        return;
      }
      const txt = (badge.textContent || "").trim();
      const visible = !!txt && getComputedStyle(badge).display !== "none";
      dot.classList.toggle("hidden", !visible);
    };
    sync();
    if (!badge) return;
    try {
      _evtBellObserver?.disconnect();
    } catch (_) {
    }
    _evtBellObserver = new MutationObserver(sync);
    _evtBellObserver.observe(badge, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
  }
  function initHeaderBell() {
    if (!document.body.classList.contains("evt-vlift")) return;
    const header = document.getElementById("evtPageHeader");
    if (!header) return;
    const globalBtn = document.getElementById("notifBtn");
    if (!globalBtn) return;
    if (document.getElementById("evtHeaderBell")) return;
    const wrap = header.querySelector(".flex.items-end.justify-between") || header.firstElementChild;
    if (!wrap) return;
    const bell = document.createElement("button");
    bell.id = "evtHeaderBell";
    bell.type = "button";
    bell.setAttribute("aria-label", "Notifications");
    bell.className = "evt-header-bell relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-white/90 hover:text-white shrink-0";
    bell.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.17V11a6 6 0 10-12 0v3.17a2 2 0 01-.6 1.43L4 17h5m6 0a3 3 0 11-6 0"/></svg><span id="evtHeaderBellDot" class="evt-header-bell-dot hidden" aria-hidden="true"></span>';
    bell.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = document.getElementById("notifBtn");
      if (target) target.click();
    });
    const createBtn = wrap.querySelector("#createEventBtn");
    if (createBtn) wrap.insertBefore(bell, createBtn);
    else wrap.appendChild(bell);
    wireHeaderBellBadge();
  }
  var PortalEventsListHeader = {
    renderHeaderCount,
    renderHeaderGreeting,
    initHeaderBell,
    wireHeaderBellBadge
  };
  globalThis.PortalEventsListHeader = PortalEventsListHeader;

  // js/portal/events/list/filters.js
  var C3 = window.EventsConstants || {};
  var STATE_KEY = "evt_list_state_v1";
  var _activeType = "all";
  var _activeCategory = "";
  var _activeDate = "any";
  function api3() {
    return window.PortalEventsListFiltersApi || {};
  }
  function persistState() {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        q: api3().getSearchQuery?.() ?? "",
        t: _activeType,
        c: _activeCategory,
        v: api3().getActiveView?.() ?? "list",
        tab: window.evtActiveTab || "upcoming"
      }));
    } catch (_) {
    }
  }
  function restoreState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) || {};
      if (typeof s.t === "string") _activeType = s.t;
      if (typeof s.c === "string") _activeCategory = s.c;
      if (typeof s.tab === "string" && ["upcoming", "past", "going", "saved"].includes(s.tab)) {
        window.evtActiveTab = s.tab;
      }
    } catch (_) {
    }
  }
  function syncTypeChips(type) {
    const t = type || "all";
    document.querySelectorAll("#evtTypeChips .evt-type-chip").forEach((c) => {
      const on = (c.dataset.type || "all") === t;
      c.classList.toggle("evt-type-chip--active", on);
      c.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
  function applyRestoredUi() {
    const tab = window.evtActiveTab || "upcoming";
    document.querySelectorAll("#evtLifecycleSeg .evt-seg__btn").forEach((b) => {
      const on = b.dataset.filter === tab;
      b.classList.toggle("evt-seg__btn--active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    const menuBtn = document.getElementById("evtTypeMenuBtn");
    if (menuBtn) {
      menuBtn.dataset.type = _activeType;
      const opt = document.querySelector('#evtTypeMenu .evt-type-opt[data-type="' + _activeType + '"]');
      if (opt) {
        const label = opt.textContent.replace(/\s+events?$/i, "").trim();
        const labelEl = menuBtn.querySelector("[data-type-label]");
        if (labelEl) labelEl.textContent = label;
        document.querySelectorAll("#evtTypeMenu .evt-type-opt").forEach(
          (o) => o.classList.toggle("evt-type-opt--active", o === opt)
        );
      }
      const sel = document.getElementById("typeFilter");
      if (sel) sel.value = _activeType;
    }
    syncTypeChips(_activeType);
    const q = api3().getSearchQuery?.() ?? "";
    if (q) {
      const input = document.getElementById("evtSearchInput");
      const clear = document.getElementById("evtSearchClear");
      const expand = document.getElementById("evtSearchExpand");
      const toggle = document.getElementById("evtSearchToggle");
      if (input) input.value = q;
      if (clear) clear.classList.remove("hidden");
      if (expand) expand.classList.remove("hidden");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    }
    api3().applyViewChrome?.();
  }
  function matchesType(ev) {
    if (_activeType === "all") return true;
    return ev.event_type === _activeType;
  }
  function matchesCategory(ev) {
    if (!_activeCategory) return true;
    return ev.category === _activeCategory;
  }
  function matchesLifecycle(ev) {
    const tab = window.evtActiveTab || "upcoming";
    const now = /* @__PURE__ */ new Date();
    const start = new Date(ev.start_date);
    const rsvps = window.evtAllRsvps || {};
    if (tab === "upcoming") {
      if (ev.status === "completed") return false;
      return start >= now || ev.status === "active" || ev.status === "open" || ev.status === "confirmed" || ev.status === "draft";
    }
    if (tab === "past") {
      return ev.status === "completed" || start < now;
    }
    if (tab === "going") {
      const r = rsvps[ev.id];
      return r && r.status === "going";
    }
    if (tab === "saved") {
      const r = rsvps[ev.id];
      return r && r.status === "maybe";
    }
    return true;
  }
  function matchesDate(ev) {
    const activeDay = api3().getActiveDay?.() ?? "";
    if (activeDay) {
      const d2 = new Date(ev.start_date);
      const iso = d2.getFullYear() + "-" + String(d2.getMonth() + 1).padStart(2, "0") + "-" + String(d2.getDate()).padStart(2, "0");
      if (iso !== activeDay) return false;
    }
    if (_activeDate === "any") return true;
    const d = new Date(ev.start_date);
    const now = /* @__PURE__ */ new Date();
    const y = now.getFullYear(), m = now.getMonth(), dy = now.getDate();
    if (_activeDate === "today") {
      return d.getFullYear() === y && d.getMonth() === m && d.getDate() === dy;
    }
    if (_activeDate === "week") {
      const day = now.getDay();
      const start = new Date(y, m, dy - day);
      const end = new Date(y, m, dy + (6 - day), 23, 59, 59);
      return d >= start && d <= end;
    }
    if (_activeDate === "weekend") {
      const day = now.getDay();
      const satOffset = (6 - day + 7) % 7;
      const sat = new Date(y, m, dy + satOffset);
      const sun = new Date(y, m, dy + satOffset + 1, 23, 59, 59);
      return d >= sat && d <= sun;
    }
    if (_activeDate === "month") {
      return d.getFullYear() === y && d.getMonth() === m;
    }
    return true;
  }
  function renderActiveFilterPill() {
    let host = document.getElementById("evtActiveFilters");
    if (!host) {
      const strip = document.getElementById("evtFilterStrip");
      if (!strip || !strip.parentNode) return;
      host = document.createElement("div");
      host.id = "evtActiveFilters";
      host.className = "evt-active-filters mt-2 flex flex-wrap gap-2";
      strip.parentNode.insertBefore(host, strip.nextSibling);
    }
    if (!_activeCategory) {
      host.innerHTML = "";
      return;
    }
    const esc10 = window.EventsHelpers && window.EventsHelpers.escapeHtml || ((s) => String(s == null ? "" : s));
    const emoji = C3.CATEGORY_EMOJI && C3.CATEGORY_EMOJI[_activeCategory] || "\u{1F4C5}";
    const label = C3.CATEGORY_TAG && C3.CATEGORY_TAG[_activeCategory]?.label || _activeCategory;
    host.innerHTML = '<button type="button" data-clear-cat class="evt-active-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold hover:bg-brand-100"><span aria-hidden="true">' + emoji + "</span><span>" + esc10(label) + '</span><span aria-hidden="true" class="text-brand-500">\xD7</span><span class="sr-only">Clear ' + esc10(label) + " filter</span></button>";
    host.querySelector("[data-clear-cat]")?.addEventListener("click", () => {
      _activeCategory = "";
      persistState();
      api3().renderEvents?.();
    });
  }
  function switchLifecycleTab(tab) {
    window.evtActiveTab = tab;
    persistState();
    document.querySelectorAll("#evtLifecycleSeg .evt-seg__btn").forEach((b) => {
      const on = b.dataset.filter === tab;
      b.classList.toggle("evt-seg__btn--active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    api3().renderEvents?.();
  }
  function clearFiltersForEmptySearch() {
    api3().setSearchQuery?.("");
    _activeType = "all";
    _activeCategory = "";
    const menuBtn = document.getElementById("evtTypeMenuBtn");
    if (menuBtn) {
      menuBtn.dataset.type = "all";
      const labelEl = menuBtn.querySelector("[data-type-label]");
      if (labelEl) labelEl.textContent = "All";
    }
    document.querySelectorAll("#evtTypeMenu .evt-type-opt").forEach(
      (o) => o.classList.toggle("evt-type-opt--active", o.dataset.type === "all")
    );
    syncTypeChips("all");
    persistState();
    api3().renderEvents?.();
  }
  function setActiveType(type) {
    _activeType = type || "all";
  }
  function setActiveCategory(cat) {
    _activeCategory = cat || "";
  }
  function toggleActiveCategory(cat) {
    _activeCategory = _activeCategory === cat ? "" : cat;
  }
  function initDateMenu() {
    const btn = document.getElementById("evtDateMenuBtn");
    const menu = document.getElementById("evtDateMenu");
    if (!btn || !menu) return;
    const close4 = () => {
      menu.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = menu.classList.contains("hidden");
      menu.classList.toggle("hidden", !willOpen);
      btn.setAttribute("aria-expanded", String(willOpen));
    });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== btn) close4();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close4();
    });
    menu.querySelectorAll(".evt-date-opt").forEach((opt) => {
      opt.addEventListener("click", () => {
        _activeDate = opt.dataset.date || "any";
        btn.dataset.date = _activeDate;
        const labelEl = btn.querySelector("[data-date-label]");
        if (labelEl) labelEl.textContent = _activeDate === "any" ? "Date" : opt.textContent.trim();
        menu.querySelectorAll(".evt-date-opt").forEach((o) => o.classList.toggle("evt-date-opt--active", o === opt));
        close4();
        api3().renderEvents?.();
      });
    });
  }
  function initFilterChips() {
    const segBtns = Array.from(document.querySelectorAll("#evtLifecycleSeg .evt-seg__btn"));
    segBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        segBtns.forEach((b) => {
          b.classList.remove("evt-seg__btn--active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("evt-seg__btn--active");
        btn.setAttribute("aria-selected", "true");
        window.evtActiveTab = btn.dataset.filter;
        api3().setExpandedBucket?.(null);
        persistState();
        api3().renderEvents?.();
      });
    });
    const menuBtn = document.getElementById("evtTypeMenuBtn");
    const menu = document.getElementById("evtTypeMenu");
    if (menuBtn && menu) {
      const closeMenu = () => {
        menu.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
      };
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = menu.classList.contains("hidden");
        menu.classList.toggle("hidden", !willOpen);
        menuBtn.setAttribute("aria-expanded", String(willOpen));
      });
      document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && e.target !== menuBtn) closeMenu();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu();
      });
      menu.querySelectorAll(".evt-type-opt").forEach((opt) => {
        opt.addEventListener("click", () => {
          _activeType = opt.dataset.type || "all";
          menuBtn.dataset.type = _activeType;
          const label = opt.textContent.replace(/\s+events?$/i, "").trim();
          const labelEl = menuBtn.querySelector("[data-type-label]");
          if (labelEl) labelEl.textContent = label;
          menu.querySelectorAll(".evt-type-opt").forEach(
            (o) => o.classList.toggle("evt-type-opt--active", o === opt)
          );
          const sel = document.getElementById("typeFilter");
          if (sel) sel.value = _activeType;
          syncTypeChips(_activeType);
          closeMenu();
          persistState();
          api3().renderEvents?.();
        });
      });
    }
    const chipRail = document.getElementById("evtTypeChips");
    if (chipRail) {
      chipRail.querySelectorAll(".evt-type-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const t = chip.dataset.type || "all";
          if (t === _activeType) return;
          _activeType = t;
          syncTypeChips(t);
          const mBtn = document.getElementById("evtTypeMenuBtn");
          if (mBtn) {
            mBtn.dataset.type = t;
            const opt = document.querySelector('#evtTypeMenu .evt-type-opt[data-type="' + t + '"]');
            if (opt) {
              const label = opt.textContent.replace(/\s+events?$/i, "").trim();
              const labelEl = mBtn.querySelector("[data-type-label]");
              if (labelEl) labelEl.textContent = label;
              document.querySelectorAll("#evtTypeMenu .evt-type-opt").forEach(
                (o) => o.classList.toggle("evt-type-opt--active", o === opt)
              );
            }
          }
          const sel = document.getElementById("typeFilter");
          if (sel) sel.value = t;
          persistState();
          api3().renderEvents?.();
        });
      });
    }
    document.getElementById("emptyCreateBtn")?.addEventListener("click", () => {
      document.getElementById("createEventBtn")?.click();
    });
    initDateMenu();
  }
  restoreState();
  var PortalEventsListFilters = {
    persistState,
    restoreState,
    applyRestoredUi,
    syncTypeChips,
    matchesType,
    matchesCategory,
    matchesLifecycle,
    matchesDate,
    renderActiveFilterPill,
    switchLifecycleTab,
    clearFiltersForEmptySearch,
    initFilterChips,
    initDateMenu,
    getActiveType: () => _activeType,
    setActiveType,
    getActiveCategory: () => _activeCategory,
    setActiveCategory,
    toggleActiveCategory
  };
  globalThis.PortalEventsListFilters = PortalEventsListFilters;

  // js/portal/events/list/calendar.js
  var C4 = window.EventsConstants || {};
  var MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  var DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function api4() {
    return window.PortalEventsListCalendarApi || {};
  }
  function localDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function groupEventsByDay(events) {
    const F = window.PortalEventsListFilters;
    const map = {};
    events.forEach((ev) => {
      if (!ev || !ev.start_date || ev.status === "cancelled") return;
      if (api4().notHidden && !api4().notHidden(ev)) return;
      if (F && !F.matchesType(ev)) return;
      if (F && !F.matchesCategory(ev)) return;
      const k = localDateKey(new Date(ev.start_date));
      (map[k] = map[k] || []).push(ev);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    });
    return map;
  }
  function closeDayModal() {
    const modal = document.getElementById("evtDayModal");
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
  function openDayModal(dateKey) {
    const modal = document.getElementById("evtDayModal");
    const title = document.getElementById("evtDayModalTitle");
    const body = document.getElementById("evtDayModalBody");
    if (!modal || !title || !body) return;
    const all = window.evtAllEvents || [];
    const attendees = window.evtAttendees || {};
    const counts = window.evtAttendeeCounts || {};
    const byDay = groupEventsByDay(all);
    const items = byDay[dateKey] || [];
    const miniCard2 = api4().miniCard;
    const [y, m, d] = dateKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    title.textContent = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (!items.length) {
      body.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">No events on this day.</div>';
    } else if (typeof miniCard2 === "function") {
      body.innerHTML = '<div class="flex flex-col gap-2">' + items.map(
        (ev) => miniCard2(ev, attendees[ev.id] || [], counts[ev.id]).replace("snap-start shrink-0 w-[76%] sm:w-64", "w-full")
      ).join("") + "</div>";
    } else {
      body.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">No events on this day.</div>';
    }
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    if (!modal.dataset.wired) {
      modal.dataset.wired = "1";
      modal.addEventListener("click", (e) => {
        if (e.target.closest("[data-day-close]")) {
          closeDayModal();
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) closeDayModal();
      });
    }
  }
  function wireCalendarClicks() {
    const mount = document.getElementById("evtCalendarMount");
    if (!mount || mount.dataset.calWired === "1") return;
    mount.dataset.calWired = "1";
    mount.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-cal-nav]");
      if (nav) {
        e.preventDefault();
        const dir = nav.getAttribute("data-cal-nav");
        let calMonth = api4().getCalMonth?.();
        if (dir === "today") {
          const now = /* @__PURE__ */ new Date();
          calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (calMonth) {
          const delta = dir === "prev" ? -1 : 1;
          calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1);
        }
        api4().setCalMonth?.(calMonth);
        renderCalendar();
        return;
      }
      const dayBtn = e.target.closest("[data-cal-day]");
      if (dayBtn) {
        e.preventDefault();
        openDayModal(dayBtn.getAttribute("data-cal-day"));
      }
    });
  }
  function renderCalendar() {
    const mount = document.getElementById("evtCalendarMount");
    if (!mount) return;
    const esc10 = window.EventsHelpers && window.EventsHelpers.escapeHtml || ((s) => String(s == null ? "" : s));
    let calMonth = api4().getCalMonth?.();
    if (!calMonth) {
      const now = /* @__PURE__ */ new Date();
      calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      api4().setCalMonth?.(calMonth);
    }
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const leadBlank = first.getDay();
    const daysInMonth = last.getDate();
    const todayKey = localDateKey(/* @__PURE__ */ new Date());
    const all = window.evtAllEvents || [];
    const byDay = groupEventsByDay(all);
    const parts = [];
    parts.push(
      '<div class="evt-cal-header flex items-center justify-between mb-3"><div class="flex items-center gap-1"><button type="button" class="evt-cal-nav" data-cal-nav="prev" aria-label="Previous month"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></button><button type="button" class="evt-cal-nav" data-cal-nav="next" aria-label="Next month"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button></div><h3 class="evt-cal-title text-base font-semibold text-gray-900">' + MONTH_NAMES[month] + " " + year + '</h3><button type="button" class="evt-cal-today text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-md hover:bg-brand-50" data-cal-nav="today">Today</button></div>'
    );
    parts.push('<div class="evt-cal-weekdays grid grid-cols-7 gap-1 mb-1">');
    DAY_SHORT.forEach((d) => {
      parts.push('<div class="text-center text-[11px] font-semibold tracking-wide text-gray-500 py-1">' + d + "</div>");
    });
    parts.push("</div>");
    parts.push('<div class="evt-cal-grid grid grid-cols-7 gap-1">');
    for (let i = 0; i < leadBlank; i++) {
      parts.push('<div class="evt-cal-cell evt-cal-cell--blank" aria-hidden="true"></div>');
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = localDateKey(dateObj);
      const dayEvents = byDay[key] || [];
      const count = dayEvents.length;
      const isToday = key === todayKey;
      const hasEv = count > 0;
      let dots = "";
      if (hasEv) {
        const shown = dayEvents.slice(0, 3);
        dots = '<div class="evt-cal-dots">' + shown.map((ev) => {
          const grad = C4.CATEGORY_GRADIENT && C4.CATEGORY_GRADIENT[ev.category] || C4.DEFAULT_GRADIENT || "linear-gradient(135deg,#6366f1,#8b5cf6)";
          const m = /#([0-9a-f]{3,6})/i.exec(grad);
          const color = m ? "#" + m[1] : "#6366f1";
          return '<span class="evt-cal-dot" style="background:' + color + '"></span>';
        }).join("") + (count > 3 ? '<span class="evt-cal-dot-more">+' + (count - 3) + "</span>" : "") + "</div>";
      }
      const clsCell = "evt-cal-cell" + (hasEv ? " evt-cal-cell--has" : "") + (isToday ? " evt-cal-cell--today" : "");
      parts.push(
        '<button type="button" class="' + clsCell + '" data-cal-day="' + key + '" ' + (hasEv ? 'aria-label="' + count + " event" + (count > 1 ? "s" : "") + " on " + esc10(dateObj.toDateString()) + '"' : 'aria-label="' + esc10(dateObj.toDateString()) + '"') + (hasEv ? "" : ' aria-disabled="false"') + '><span class="evt-cal-daynum">' + d + "</span>" + dots + "</button>"
      );
    }
    parts.push("</div>");
    mount.innerHTML = parts.join("");
    wireCalendarClicks();
  }
  var PortalEventsListCalendar = {
    renderCalendar,
    wireCalendarClicks,
    openDayModal,
    closeDayModal,
    groupEventsByDay,
    localDateKey
  };
  globalThis.PortalEventsListCalendar = PortalEventsListCalendar;

  // js/portal/events/list/hero-rails.js
  var C5 = window.EventsConstants || {};
  var H3 = window.EventsHelpers || {};
  var P = window.EventsPills || {};
  function api5() {
    return window.PortalEventsListHeroRailsApi || {};
  }
  function pickHero(events) {
    return events.find(
      (e) => e.is_featured === true && e.status !== "cancelled" && e.status !== "draft"
    ) || null;
  }
  function heroBg(event, stripGradient) {
    const url = event.banner_url;
    if (url) {
      const safe = String(url).replace(/'/g, "%27");
      if (stripGradient) {
        return "background: url('" + safe + "') center/cover;";
      }
      return "background: linear-gradient(0deg, rgba(0,0,0,.65), rgba(0,0,0,.05) 55%), url('" + safe + "') center/cover;";
    }
    const grad = C5.CATEGORY_GRADIENT && (C5.CATEGORY_GRADIENT[event.category] || C5.CATEGORY_GRADIENT.default) || "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)";
    return "background: " + grad + ";";
  }
  function renderHero(event, rsvp) {
    const heroEl = document.getElementById("evtHero");
    if (!heroEl) return;
    if (!event) {
      heroEl.innerHTML = "";
      return;
    }
    const esc10 = H3.escapeHtml || ((s) => String(s == null ? "" : s));
    const start = new Date(event.start_date);
    const rel = H3.relativeDate ? H3.relativeDate(start) : "";
    const time = H3.formatDate ? H3.formatDate(event.start_date, "time") : "";
    const dateLine = [rel, time].filter(Boolean).join(" \xB7 ");
    const loc = event.location_nickname || event.location_text || "";
    const stateP = (P.statePill ? P.statePill(event) : "") || "";
    const countP = (P.countdownChip ? P.countdownChip(event) : "") || "";
    const goingRibbon = rsvp && rsvp.status === "going" ? '<div class="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">\u2713 Going</div>' : "";
    const isFav = !!(rsvp && rsvp.status === "maybe");
    const heartCls = "evt-hero-heart" + (isFav ? " evt-hero-heart--on" : "");
    const heartPath = isFav ? '<path d="M12 21s-7-4.35-9.5-8.5C.8 9.6 2.4 6 6 6c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.6 0 5.2 3.6 3.5 6.5C19 16.65 12 21 12 21z" fill="currentColor"/>' : '<path stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none" d="M12 21s-7-4.35-9.5-8.5C.8 9.6 2.4 6 6 6c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.6 0 5.2 3.6 3.5 6.5C19 16.65 12 21 12 21z"/>';
    const heartBtn = '<button type="button" data-evt-hero-heart="' + esc10(event.id) + '" aria-label="' + (isFav ? "Remove from interested" : "Mark as interested") + '" aria-pressed="' + (isFav ? "true" : "false") + '" class="' + heartCls + '"><svg viewBox="0 0 24 24" class="w-5 h-5" aria-hidden="true">' + heartPath + "</svg></button>";
    const href = event.slug ? "?event=" + encodeURIComponent(event.slug) : "javascript:void(0)";
    const useVlift = document.body.classList.contains("evt-vlift");
    if (useVlift) {
      const dateLong = (() => {
        try {
          return start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        } catch (_) {
          return "";
        }
      })();
      const timeShort = time || (() => {
        try {
          return start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        } catch (_) {
          return "";
        }
      })();
      const calIcon = '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M3 9h18M8 3v4M16 3v4"/></svg>';
      const clkIcon = '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3 2"/></svg>';
      const pinIcon = loc ? '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>' : "";
      const _titleCase = (s) => {
        if (!s) return "";
        const str = String(s);
        if (str.toLowerCase() === "llc") return "LLC";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };
      const hostTypeLabel = _titleCase(event.event_type || "");
      const hostCatLabel = _titleCase(event.category || "");
      const hostLine = [
        hostTypeLabel ? "Hosted by " + hostTypeLabel : "",
        hostCatLabel
      ].filter(Boolean).join(" \xB7 ");
      const fDay = (() => {
        try {
          return start.getDate();
        } catch (_) {
          return "";
        }
      })();
      const fMon = (() => {
        try {
          return start.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
        } catch (_) {
          return "";
        }
      })();
      const fDow = (() => {
        try {
          return start.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
        } catch (_) {
          return "";
        }
      })();
      const descRaw = event.description ? String(event.description).trim() : "";
      const descShort = descRaw.length > 180 ? descRaw.slice(0, 177) + "\u2026" : descRaw;
      heroEl.innerHTML = '<div class="evt-hero-vlift relative"><a href="' + href + '" data-evt-hero="' + esc10(event.id) + '" class="block relative rounded-3xl overflow-hidden text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300" style="' + heroBg(event, true) + '">' + goingRibbon + '<div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">' + countP + stateP + "</div>" + // F14 — FEATURED EVENT kicker (vlift only; only shown when admin-featured)
      (event.is_featured ? '<span class="evt-hero-kicker" data-f14-kicker>FEATURED EVENT</span>' : "") + // Bottom-edge dark fade for legibility
      '<div class="evt-hero-fade absolute inset-x-0 bottom-0 pointer-events-none" aria-hidden="true"></div><div class="evt-hero-meta absolute inset-x-0 bottom-0 p-5 sm:p-6"><div class="evt-hero-datechip" data-f14-datechip aria-hidden="true">' + (fMon ? '<span class="evt-hero-datechip__mon">' + esc10(fMon) + "</span>" : "") + (fDay !== "" ? '<span class="evt-hero-datechip__day">' + esc10(fDay) + "</span>" : "") + (fDow ? '<span class="evt-hero-datechip__dow">' + esc10(fDow) + "</span>" : "") + '</div><div class="evt-hero-meta-body">' + // E7 — Avatar cluster
      attendeeCluster(event.id) + '<h2 class="text-xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md line-clamp-2">' + esc10(event.title || "Untitled event") + "</h2>" + // F14 — Host line
      (hostLine ? '<p class="evt-hero-host" data-f14-host>' + esc10(hostLine) + "</p>" : "") + // F20 — Time + location on the same line
      (timeShort || loc ? '<div class="evt-hero-timeloc" data-f14-timeloc>' + (timeShort ? '<span class="inline-flex items-center gap-1">' + clkIcon + esc10(timeShort) + "</span>" : "") + (loc ? '<span class="inline-flex items-center gap-1">' + pinIcon + esc10(loc) + "</span>" : "") + "</div>" : "") + '</div></div><div class="evt-hero-side" data-f14-side>' + (descShort ? '<p class="evt-hero-side__desc">' + esc10(descShort) + "</p>" : "") + '<span class="evt-hero-side__cta" data-f14-cta data-evt-hero-details="' + esc10(event.id) + '" role="button" aria-hidden="true">View Details</span></div></a><button type="button" data-evt-hero-cta="' + esc10(event.id) + '" class="evt-hero-cta" aria-label="View details for ' + esc10(event.title || "this event") + '">View Details</button></div>';
      const ctaBtn = heroEl.querySelector("button[data-evt-hero-cta]");
      if (ctaBtn) {
        ctaBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (href && href !== "javascript:void(0)") {
            window.location.href = href;
          } else if (typeof window.evtNavigateToEvent === "function") {
            window.evtNavigateToEvent(event);
          } else if (typeof window.evtOpenDetail === "function") {
            window.evtOpenDetail(event);
          }
        });
      }
      const cluster = heroEl.querySelector("button[data-evt-hero-going]");
      if (cluster) {
        cluster.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.evtNavigateToEvent === "function") {
            window.evtNavigateToEvent(event);
          } else if (typeof window.evtOpenDetail === "function") {
            window.evtOpenDetail(event);
          } else if (event.slug) {
            window.location.href = "?event=" + encodeURIComponent(event.slug);
          }
        });
      }
      const heart = heroEl.querySelector("button[data-evt-hero-heart]");
      if (heart) {
        heart.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.evtHandleRsvp !== "function") return;
          try {
            heart.disabled = true;
            await window.evtHandleRsvp(event.id, "maybe");
          } catch (err) {
            console.error("Hero heart toggle failed", err);
          } finally {
            heart.disabled = false;
          }
        });
      }
    } else {
      heroEl.innerHTML = '<a href="' + href + '" data-evt-hero="' + esc10(event.id) + '" class="block relative rounded-3xl overflow-hidden text-white shadow-[0_10px_40px_rgba(79,70,229,0.18)] aspect-[4/5] sm:aspect-[16/10] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300" style="' + heroBg(event) + '">' + goingRibbon + '<div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">' + countP + stateP + '</div><div class="absolute inset-x-0 bottom-0 p-5 sm:p-6"><div class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">' + esc10(dateLine) + '</div><h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 drop-shadow-sm line-clamp-2">' + esc10(event.title || "Untitled event") + "</h2>" + (loc ? '<p class="text-sm text-white/85 mt-1 truncate">' + esc10(loc) + "</p>" : "") + "</div></a>";
    }
    const link = heroEl.querySelector("a[data-evt-hero]");
    if (link) {
      link.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        if (event.slug && typeof window.evtNavigateToEvent === "function") {
          window.evtNavigateToEvent(event.slug);
        } else if (typeof window.evtOpenDetail === "function") {
          window.evtOpenDetail(event.id);
        }
      });
    }
  }
  function attendeeCluster(eventId2) {
    const list = window.evtAttendees && window.evtAttendees[eventId2] || [];
    if (!list.length) return "";
    const esc10 = H3.escapeHtml || ((s) => String(s == null ? "" : s));
    const bubs = list.slice(0, 5).map((p, i) => {
      const pic = p && p.profile_picture_url;
      const first = p && p.first_name || "";
      const initial = (first.trim().charAt(0) || "?").toUpperCase();
      const ml = i === 0 ? "" : " -ml-2";
      const inner = pic ? '<img src="' + esc10(pic) + '" alt="" loading="lazy" class="w-full h-full object-cover" />' : '<span class="evt-hero-cluster-init">' + esc10(initial) + "</span>";
      return '<span class="evt-hero-cluster-bub' + ml + '" title="' + esc10(first) + '">' + inner + "</span>";
    }).join("");
    const trueCount = window.evtAttendeeCounts && window.evtAttendeeCounts[eventId2] || list.length;
    const labelN = String(trueCount);
    return '<button type="button" data-evt-hero-going="' + esc10(eventId2) + '" class="evt-hero-cluster" aria-label="See who is going"><span class="evt-hero-cluster-stack">' + bubs + '</span><span class="evt-hero-cluster-label">' + labelN + " going</span></button>";
  }
  function renderLiveBanner(events) {
    const el = document.getElementById("evtLiveBanner");
    if (!el) return;
    const now = /* @__PURE__ */ new Date();
    const live = (events || []).filter((e) => {
      if (e.status === "cancelled" || e.status === "draft") return false;
      const start = new Date(e.start_date);
      if (isNaN(start) || start > now) return false;
      const endRaw = e.end_date || e.end_at || e.ends_at;
      const end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 2 * 60 * 60 * 1e3);
      return now <= end;
    });
    if (!live.length) {
      el.classList.add("hidden");
      el.innerHTML = "";
      return;
    }
    const esc10 = H3.escapeHtml || ((s) => String(s == null ? "" : s));
    const first = live[0];
    const label = live.length === 1 ? esc10(first.title || "An event") + " is happening now" : live.length + " events happening now";
    const href = live.length === 1 && first.slug ? "?event=" + encodeURIComponent(first.slug) : "javascript:void(0)";
    el.classList.remove("hidden");
    el.innerHTML = '<a href="' + href + '" data-evt-live="' + esc10(first.id) + '" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold"><span class="relative flex w-2.5 h-2.5 shrink-0"><span class="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60"></span><span class="relative rounded-full bg-rose-600 w-2.5 h-2.5"></span></span><span class="flex-1 truncate">' + label + "</span>" + (live.length === 1 ? '<span aria-hidden="true" class="text-rose-500">\u2192</span>' : "") + "</a>";
    const link = el.querySelector("a[data-evt-live]");
    if (link && live.length === 1) {
      link.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        if (first.slug && typeof window.evtNavigateToEvent === "function") {
          window.evtNavigateToEvent(first.slug);
        } else if (typeof window.evtOpenDetail === "function") {
          window.evtOpenDetail(first.id);
        }
      });
    }
  }
  function renderGoingRail(events, rsvps, attendees, heroId, eventsById) {
    const rail = document.getElementById("evtGoingRail");
    const scroll = document.getElementById("evtGoingRailScroll");
    if (!rail || !scroll) return;
    const now = /* @__PURE__ */ new Date();
    const going = (events || []).filter((e) => {
      if (e.id === heroId) return false;
      if (e.status === "cancelled" || e.status === "draft") return false;
      if (api5().notHidden && !api5().notHidden(e)) return false;
      const r = rsvps[e.id];
      if (!r || r.status !== "going") return false;
      return new Date(e.start_date) >= now;
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    if (!going.length) {
      rail.classList.add("hidden");
      scroll.innerHTML = "";
      return;
    }
    rail.classList.remove("hidden");
    const counts = window.evtAttendeeCounts || {};
    scroll.innerHTML = going.map((ev) => miniCard(ev, attendees[ev.id] || [], counts[ev.id])).join("");
    scroll.querySelectorAll("a[data-evt-mini]").forEach((link) => {
      const id = link.getAttribute("data-evt-mini");
      const ev = eventsById[id];
      if (!ev) return;
      link.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        if (ev.slug && typeof window.evtNavigateToEvent === "function") {
          window.evtNavigateToEvent(ev.slug);
        } else if (typeof window.evtOpenDetail === "function") {
          window.evtOpenDetail(ev.id);
        }
      });
    });
  }
  function miniCard(event, attendees, goingCount) {
    const esc10 = H3.escapeHtml || ((s) => String(s == null ? "" : s));
    const d = new Date(event.start_date);
    const day = d.getDate();
    const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const rel = H3.relativeDate ? H3.relativeDate(d) : "";
    const href = event.slug ? "?event=" + encodeURIComponent(event.slug) : "javascript:void(0)";
    const title = esc10(event.title || "Untitled event");
    const loc = event.location_nickname || event.location_text || "";
    let bannerStyle;
    if (event.banner_url) {
      const safe = String(event.banner_url).replace(/'/g, "%27");
      bannerStyle = "background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55)), url('" + safe + "') center/cover;";
    } else {
      const grad = C5.CATEGORY_GRADIENT && (C5.CATEGORY_GRADIENT[event.category] || C5.DEFAULT_GRADIENT) || "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)";
      bannerStyle = "background: " + grad + ";";
    }
    const attCount = goingCount != null ? goingCount : (attendees || []).length;
    const attLine = attCount ? '<span class="text-[11px] text-gray-500 truncate">' + attCount + " going</span>" : "";
    const isPinnedLlc = event.is_pinned && event.event_type === "llc";
    const pin = isPinnedLlc ? '<span class="evt-date-pin evt-date-pin--mini" aria-label="Pinned LLC event" title="Pinned">\u{1F4CC}</span>' : "";
    return '<a href="' + href + '" data-evt-mini="' + esc10(event.id) + '" class="snap-start shrink-0 w-[76%] sm:w-64 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden"><div class="relative aspect-[16/9]" style="' + bannerStyle + '"><div class="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 text-center shadow-sm">' + pin + '<div class="text-[14px] leading-none font-extrabold text-gray-900">' + day + '</div><div class="text-[9px] tracking-wider font-bold text-brand-600 mt-0.5">' + mon + '</div></div></div><div class="p-3"><h3 class="text-sm font-bold text-gray-900 line-clamp-1 leading-snug">' + title + '</h3><p class="text-[12px] text-gray-500 truncate mt-0.5">' + (rel ? esc10(rel) : "") + (loc && rel ? " \xB7 " : "") + esc10(loc) + "</p>" + (attLine ? '<div class="mt-1.5">' + attLine + "</div>" : "") + "</div></a>";
  }
  function renderTopPicks(events, attendees, heroId, eventsById) {
    const rail = document.getElementById("evtTopPicks");
    const scroll = document.getElementById("evtTopPicksScroll");
    if (!rail || !scroll) return;
    const useVlift = document.body.classList.contains("evt-vlift");
    const tab = window.evtActiveTab || "upcoming";
    const inSearch = !!(api5().getSearchQuery?.() || "").trim();
    if (!useVlift || tab !== "upcoming" || inSearch) {
      rail.classList.add("hidden");
      scroll.innerHTML = "";
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const picks = (events || []).filter(
      (e) => e.id !== heroId && e.is_pinned && e.event_type === "llc" && e.status !== "cancelled" && e.status !== "draft" && (api5().notHidden ? api5().notHidden(e) : true) && new Date(e.start_date) >= now
    ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    if (picks.length < 2) {
      rail.classList.add("hidden");
      scroll.innerHTML = "";
      return;
    }
    rail.classList.remove("hidden");
    const counts = window.evtAttendeeCounts || {};
    scroll.innerHTML = picks.map((ev) => miniCard(ev, attendees[ev.id] || [], counts[ev.id])).join("");
    scroll.querySelectorAll("a[data-evt-mini]").forEach((link) => {
      const id = link.getAttribute("data-evt-mini");
      const ev = eventsById[id];
      if (!ev) return;
      link.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        if (ev.slug && typeof window.evtNavigateToEvent === "function") {
          window.evtNavigateToEvent(ev.slug);
        } else if (typeof window.evtOpenDetail === "function") {
          window.evtOpenDetail(ev.id);
        }
      });
    });
    const seeAll = document.getElementById("evtTopPicksSeeAll");
    if (seeAll && !seeAll.dataset.wired) {
      seeAll.dataset.wired = "1";
      seeAll.addEventListener("click", (e) => {
        e.preventDefault();
        window.PortalEventsListFilters.setActiveType("llc");
        window.PortalEventsListFilters.syncTypeChips("llc");
        const menuBtn = document.getElementById("evtTypeMenuBtn");
        if (menuBtn) {
          menuBtn.dataset.type = "llc";
          const labelEl = menuBtn.querySelector("[data-type-label]");
          if (labelEl) labelEl.textContent = "LLC";
          document.querySelectorAll("#evtTypeMenu .evt-type-opt").forEach(
            (o) => o.classList.toggle("evt-type-opt--active", o.dataset.type === "llc")
          );
        }
        const sel = document.getElementById("typeFilter");
        if (sel) sel.value = "llc";
        api5().persistState?.();
        api5().renderEvents?.();
      });
    }
  }
  var PortalEventsListHeroRails = {
    pickHero,
    heroBg,
    attendeeCluster,
    renderHero,
    renderLiveBanner,
    renderGoingRail,
    miniCard,
    renderTopPicks
  };
  globalThis.PortalEventsListHeroRails = PortalEventsListHeroRails;

  // js/portal/events/list/buckets.js
  var H4 = window.EventsHelpers || {};
  var Card = window.EventsCard;
  var E_BUCKET_TRUNCATE = 6;
  function api6() {
    return window.PortalEventsListBucketsApi || {};
  }
  var E_BUCKET_EMOJI = {
    "tonight": "\u{1F31C}",
    "today": "\u{1F525}",
    "tomorrow": "\u23ED\uFE0F",
    "this week": "\u2728",
    "this weekend": "\u{1F3A1}",
    "next week": "\u{1F5D3}\uFE0F",
    "later this month": "\u{1F4C5}",
    "this month": "\u{1F4C5}",
    "next month": "\u{1F331}",
    "future": "\u{1F5D3}\uFE0F",
    "past": "\u{1F570}\uFE0F",
    "earlier": "\u{1F570}\uFE0F"
  };
  function bucketLabelEmoji(label) {
    if (!label) return "";
    const l = String(label).toLowerCase().trim();
    if (/^results for/i.test(label)) return "\u{1F50E} " + label;
    const e = E_BUCKET_EMOJI[l];
    return e ? e + " " + label : label;
  }
  function renderBucket(label, events, rsvps, attendees) {
    if (!events.length) return "";
    const slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const useVlift = document.body.classList.contains("evt-vlift");
    const total = events.length;
    const isExpanded = (api6().getExpandedBucket?.() ?? null) === slug;
    const truncated = useVlift && total > E_BUCKET_TRUNCATE && !isExpanded;
    const visible = truncated ? events.slice(0, E_BUCKET_TRUNCATE) : events;
    const counts = window.evtAttendeeCounts || {};
    const cards = visible.map((ev) => Card.render(ev, {
      rsvp: rsvps[ev.id] || null,
      href: ev.slug ? "?event=" + encodeURIComponent(ev.slug) : "javascript:void(0)",
      variant: "portal",
      attendees: attendees[ev.id] || [],
      goingCount: counts[ev.id] || (attendees[ev.id] || []).length
    })).join("");
    let createTile = "";
    if (useVlift && !api6().getCreateTileInjected?.() && (window.evtActiveTab || "upcoming") === "upcoming") {
      const canCreate = typeof canCreateEvents === "function" && canCreateEvents();
      if (canCreate) {
        createTile = '<button type="button" data-evt-create-tile class="evt-create-tile" aria-label="Create new event"><span class="evt-create-tile__plus" aria-hidden="true">+</span><span class="evt-create-tile__label">Create Event</span><span class="evt-create-tile__hint">Add a new event to the calendar</span></button>';
        api6().setCreateTileInjected?.(true);
      }
    }
    const displayLabel = useVlift ? String(label) : label;
    const safeLabel = (H4.escapeHtml || ((s) => s))(displayLabel);
    const countPill = useVlift ? '<span class="evt-bucket-count">' + total + (total === 1 ? " event" : " events") + "</span>" : "";
    let headerLink = "";
    if (useVlift && total > E_BUCKET_TRUNCATE) {
      if (truncated) {
        headerLink = '<button type="button" data-evt-bucket-toggle="' + slug + '" class="evt-bucket-seeall text-xs font-semibold text-brand-600 hover:text-brand-700">See all (' + total + ") \u2192</button>";
      } else {
        headerLink = '<button type="button" data-evt-bucket-toggle="' + slug + '" class="evt-bucket-seeall text-xs font-semibold text-brand-600 hover:text-brand-700">Show less \u2191</button>';
      }
    }
    const headerCls = useVlift ? "evt-bucket-head flex items-end justify-between mb-3" : "";
    const titleCls = useVlift ? "evt-bucket-title" : "text-xs font-bold uppercase tracking-[0.14em] text-gray-500";
    const header = useVlift ? '<header class="' + headerCls + '"><h2 class="' + titleCls + '">' + safeLabel + '</h2><div class="flex items-center gap-2">' + countPill + headerLink + "</div></header>" : '<h2 class="' + titleCls + ' mb-3">' + safeLabel + "</h2>";
    return '<section data-bucket="' + slug + '">' + header + '<div class="evt-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + cards + createTile + "</div></section>";
  }
  var PortalEventsListBuckets = {
    renderBucket,
    bucketLabelEmoji,
    E_BUCKET_TRUNCATE
  };
  globalThis.PortalEventsListBuckets = PortalEventsListBuckets;

  // js/portal/events/list/shell.js
  var C6 = window.EventsConstants || {};
  var H5 = window.EventsHelpers || {};
  var P2 = window.EventsPills || {};
  var Card2 = window.EventsCard;
  var _searchQuery = "";
  var _activeView = "list";
  var _calMonth = null;
  var _searchDebounce = null;
  var _expandedBucket = null;
  var _createTileInjected = false;
  var _miniCalMonth = null;
  var _activeDay = "";
  var STATE_KEY2 = "evt_list_state_v1";
  function _restoreListSessionState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY2);
      if (!raw) return;
      const s = JSON.parse(raw) || {};
      if (typeof s.q === "string") _searchQuery = s.q;
      if (typeof s.v === "string" && (s.v === "list" || s.v === "calendar")) _activeView = s.v;
    } catch (_) {
    }
  }
  _restoreListSessionState();
  function _persistState() {
    return window.PortalEventsListFilters.persistState();
  }
  function setupSearch2() {
    return window.PortalEventsListSearch.setupSearch();
  }
  function _renderCalendar() {
    return window.PortalEventsListCalendar.renderCalendar();
  }
  function _initViewToggle() {
    const btn = document.getElementById("evtViewToggle");
    if (!btn || btn.dataset.wired === "1") return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => {
      _activeView = _activeView === "calendar" ? "list" : "calendar";
      _persistState();
      _applyViewChrome();
      renderEvents();
    });
  }
  function _applyViewChrome() {
    const btn = document.getElementById("evtViewToggle");
    const listIcon = btn?.querySelector(".evt-view-icon--list");
    const calIcon = btn?.querySelector(".evt-view-icon--calendar");
    if (btn) {
      btn.setAttribute("aria-pressed", _activeView === "calendar" ? "true" : "false");
      btn.setAttribute("data-view", _activeView);
      btn.setAttribute("aria-label", _activeView === "calendar" ? "Switch to list view" : "Switch to calendar view");
    }
    if (listIcon && calIcon) {
      listIcon.classList.toggle("hidden", _activeView === "list");
      calIcon.classList.toggle("hidden", _activeView === "calendar");
    }
    document.body.classList.toggle("evt-view--calendar", _activeView === "calendar");
  }
  var VLIFT_KEY = "evt_vlift";
  function _readVlift() {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("vlift");
      if (q === "1") {
        try {
          localStorage.setItem(VLIFT_KEY, "1");
        } catch (_) {
        }
        return true;
      }
      if (q === "0") {
        try {
          localStorage.setItem(VLIFT_KEY, "0");
        } catch (_) {
        }
        return false;
      }
      const stored = (() => {
        try {
          return localStorage.getItem(VLIFT_KEY);
        } catch (_) {
          return null;
        }
      })();
      if (stored === "0") return false;
      return true;
    } catch (_) {
      return true;
    }
  }
  function _initVlift() {
    const on = _readVlift();
    try {
      document.body.classList.toggle("evt-vlift", on);
      if (on) document.documentElement.dataset.vlift = "1";
      else delete document.documentElement.dataset.vlift;
    } catch (_) {
    }
    try {
      globalThis.evtSetVlift = function(v) {
        try {
          localStorage.setItem(VLIFT_KEY, v ? "1" : "0");
        } catch (_) {
        }
        document.body.classList.toggle("evt-vlift", !!v);
      };
    } catch (_) {
    }
    try {
      globalThis.evtIsVlift = function() {
        return document.body.classList.contains("evt-vlift");
      };
    } catch (_) {
    }
  }
  function _initGreeting() {
    if (!document.body.classList.contains("evt-vlift")) return;
    const slot = document.querySelector("#evtGreetingHello [data-greeting-name]");
    if (!slot) return;
    const apply = () => {
      const fromState = (window.evtCurrentUserName || "").trim();
      if (fromState) {
        slot.textContent = fromState;
        return true;
      }
      const navEl = document.getElementById("navName");
      const name = (navEl && navEl.textContent || "").trim();
      if (name) {
        slot.textContent = name;
        return true;
      }
      return false;
    };
    if (apply()) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (apply() || tries > 20) clearInterval(t);
    }, 300);
  }
  var _hiddenIds = /* @__PURE__ */ new Set();
  var SWIPE_THRESHOLD = 56;
  var SWIPE_MAX = 120;
  var LONGPRESS_MS = 500;
  var LONGPRESS_MOVE = 8;
  var _activeSwipe = null;
  var _longPressTimer = null;
  var _longPressFired = false;
  function _isMobileTouch() {
    return "ontouchstart" in window && window.innerWidth < 640;
  }
  function _notHidden(ev) {
    return !_hiddenIds.has(ev?.id);
  }
  function _resetSwipeCard(card2) {
    if (!card2) return;
    card2.classList.remove("evt-swipe--revealed", "evt-swipe--dragging");
    card2.style.transform = "";
    const action = card2.querySelector(".evt-swipe-action");
    if (action) action.style.opacity = "";
  }
  function _ensureSwipeAction(card2, eventId2) {
    let action = card2.querySelector(".evt-swipe-action");
    if (action) return action;
    action = document.createElement("button");
    action.type = "button";
    action.className = "evt-swipe-action";
    action.setAttribute("data-swipe-cancel", eventId2);
    action.setAttribute("aria-label", "Cancel RSVP");
    action.innerHTML = '<span class="evt-swipe-action__icon" aria-hidden="true"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></span><span class="evt-swipe-action__label">Cancel</span>';
    card2.classList.add("evt-swipe-host");
    card2.appendChild(action);
    return action;
  }
  function _initSwipeGestures() {
    if (!_isMobileTouch()) return;
    const rail = document.getElementById("evtGoingRailScroll");
    if (rail && rail.dataset.swipeWired !== "1") {
      rail.dataset.swipeWired = "1";
      rail.addEventListener("touchstart", (e) => {
        const card2 = e.target.closest("a[data-evt-mini]");
        if (!card2) return;
        rail.querySelectorAll(".evt-swipe--revealed").forEach((c) => {
          if (c !== card2) _resetSwipeCard(c);
        });
        const t = e.touches[0];
        _activeSwipe = { card: card2, startX: t.clientX, startY: t.clientY, dx: 0, locked: null };
        _ensureSwipeAction(card2, card2.getAttribute("data-evt-mini") || "");
      }, { passive: true });
      rail.addEventListener("touchmove", (e) => {
        if (!_activeSwipe) return;
        const t = e.touches[0];
        const dx = t.clientX - _activeSwipe.startX;
        const dy = t.clientY - _activeSwipe.startY;
        if (_activeSwipe.locked === null) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
          _activeSwipe.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (_activeSwipe.locked === "x") _activeSwipe.card.classList.add("evt-swipe--dragging");
        }
        if (_activeSwipe.locked !== "x") return;
        const clamped = Math.max(-SWIPE_MAX, Math.min(0, dx));
        _activeSwipe.dx = clamped;
        _activeSwipe.card.style.transform = "translateX(" + clamped + "px)";
        const action = _activeSwipe.card.querySelector(".evt-swipe-action");
        if (action) action.style.opacity = String(Math.min(1, Math.abs(clamped) / SWIPE_THRESHOLD));
      }, { passive: true });
      const finish = () => {
        if (!_activeSwipe) return;
        const { card: card2, dx, locked } = _activeSwipe;
        _activeSwipe = null;
        if (locked !== "x") {
          _resetSwipeCard(card2);
          return;
        }
        if (Math.abs(dx) >= SWIPE_THRESHOLD) {
          card2.classList.remove("evt-swipe--dragging");
          card2.classList.add("evt-swipe--revealed");
          card2.style.transform = "";
          const action = card2.querySelector(".evt-swipe-action");
          if (action) action.style.opacity = "1";
        } else {
          _resetSwipeCard(card2);
        }
      };
      rail.addEventListener("touchend", finish, { passive: true });
      rail.addEventListener("touchcancel", finish, { passive: true });
      rail.addEventListener("click", (e) => {
        const cancelBtn = e.target.closest("[data-swipe-cancel]");
        if (cancelBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = cancelBtn.getAttribute("data-swipe-cancel") || "";
          _confirmCancelRsvp(id);
          return;
        }
        const revealed = e.target.closest(".evt-swipe--revealed");
        if (revealed) {
          e.preventDefault();
          e.stopPropagation();
          _resetSwipeCard(revealed);
        }
      });
    }
    const groups = document.getElementById("evtGroups");
    if (groups && groups.dataset.lpWired !== "1") {
      groups.dataset.lpWired = "1";
      const cancelLp = () => {
        if (_longPressTimer) {
          clearTimeout(_longPressTimer);
          _longPressTimer = null;
        }
      };
      groups.addEventListener("touchstart", (e) => {
        const card2 = e.target.closest("a[data-evt-card], a[data-evt-mini], a[data-evt-hero]");
        if (!card2) return;
        _longPressFired = false;
        const t = e.touches[0];
        const startX = t.clientX, startY = t.clientY;
        cancelLp();
        _longPressTimer = setTimeout(() => {
          _longPressFired = true;
          const id = card2.getAttribute("data-evt-card") || card2.getAttribute("data-evt-mini") || card2.getAttribute("data-evt-hero") || "";
          _openContextSheet(id);
        }, LONGPRESS_MS);
        const moveHandler = (mv) => {
          const m = mv.touches[0];
          if (Math.abs(m.clientX - startX) > LONGPRESS_MOVE || Math.abs(m.clientY - startY) > LONGPRESS_MOVE) cancelLp();
        };
        const endHandler = () => {
          cancelLp();
          groups.removeEventListener("touchmove", moveHandler);
          groups.removeEventListener("touchend", endHandler);
          groups.removeEventListener("touchcancel", endHandler);
        };
        groups.addEventListener("touchmove", moveHandler, { passive: true });
        groups.addEventListener("touchend", endHandler, { passive: true });
        groups.addEventListener("touchcancel", endHandler, { passive: true });
      }, { passive: true });
      groups.addEventListener("click", (e) => {
        if (_longPressFired) {
          _longPressFired = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    }
  }
  async function _confirmCancelRsvp(eventId2) {
    if (!eventId2) return;
    const all = window.evtAllEvents || [];
    const ev = all.find((x) => x.id === eventId2);
    const title = ev && ev.title ? ev.title : "this event";
    if (!window.confirm('Cancel your RSVP for "' + title + '"?')) return;
    try {
      if (typeof globalThis.evtHandleRsvp === "function") {
        await window.evtHandleRsvp(eventId2, "going");
      }
    } catch (err) {
      console.error("Cancel RSVP failed", err);
    }
  }
  function _ensureContextSheet() {
    let sheet = document.getElementById("evtContextSheet");
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.id = "evtContextSheet";
    sheet.className = "evt-context-sheet hidden fixed inset-0 z-[75]";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.innerHTML = '<div class="absolute inset-0 bg-black/40" data-ctx-close="1"></div><div class="evt-context-sheet__panel absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:max-w-sm sm:h-fit sm:rounded-2xl bg-white rounded-t-2xl shadow-2xl overflow-hidden"><div class="px-4 pt-3 pb-2 border-b border-gray-100"><h3 id="evtContextTitle" class="text-sm font-semibold text-gray-900 truncate"></h3></div><ul class="py-1"><li><button type="button" data-ctx-act="share"   class="evt-context-row"><span aria-hidden="true">\u{1F517}</span><span>Share link</span></button></li><li><button type="button" data-ctx-act="copy"    class="evt-context-row"><span aria-hidden="true">\u{1F4CB}</span><span>Copy link</span></button></li><li><button type="button" data-ctx-act="ics"     class="evt-context-row"><span aria-hidden="true">\u{1F4C5}</span><span>Add to calendar</span></button></li><li><button type="button" data-ctx-act="hide"    class="evt-context-row evt-context-row--danger"><span aria-hidden="true">\u{1F648}</span><span>Hide from list</span></button></li><li class="border-t border-gray-100 mt-1"><button type="button" data-ctx-close="1" class="evt-context-row evt-context-row--cancel"><span>Cancel</span></button></li></ul></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener("click", (e) => {
      if (e.target.closest("[data-ctx-close]")) {
        _closeContextSheet();
        return;
      }
      const row = e.target.closest("[data-ctx-act]");
      if (!row) return;
      const act = row.getAttribute("data-ctx-act");
      const id = sheet.dataset.eventId || "";
      _runContextAction(act, id);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !sheet.classList.contains("hidden")) _closeContextSheet();
    });
    return sheet;
  }
  function _openContextSheet(eventId2) {
    if (!eventId2) return;
    const all = window.evtAllEvents || [];
    const ev = all.find((x) => x.id === eventId2);
    if (!ev) return;
    const sheet = _ensureContextSheet();
    sheet.dataset.eventId = eventId2;
    const title = sheet.querySelector("#evtContextTitle");
    if (title) title.textContent = ev.title || "Event";
    sheet.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }
  function _closeContextSheet() {
    const sheet = document.getElementById("evtContextSheet");
    if (!sheet) return;
    sheet.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
  async function _runContextAction(act, eventId2) {
    const all = window.evtAllEvents || [];
    const ev = all.find((x) => x.id === eventId2);
    if (!ev) {
      _closeContextSheet();
      return;
    }
    const url = _eventShareUrl(ev);
    if (act === "share") {
      try {
        if (navigator.share) {
          await navigator.share({ title: ev.title || "Event", url });
        } else {
          await _copyToClipboard(url);
          _toast("Link copied");
        }
      } catch (_) {
      }
      _closeContextSheet();
      return;
    }
    if (act === "copy") {
      await _copyToClipboard(url);
      _toast("Link copied");
      _closeContextSheet();
      return;
    }
    if (act === "ics") {
      _downloadIcs(ev);
      _closeContextSheet();
      return;
    }
    if (act === "hide") {
      _hiddenIds.add(eventId2);
      _toast("Hidden for this session");
      _closeContextSheet();
      renderEvents();
      return;
    }
  }
  function _eventShareUrl(ev) {
    const origin = location.origin;
    const base = origin + (location.pathname.includes("/portal/") ? location.pathname.split("?")[0] : "/portal/events.html");
    return ev.slug ? base + "?event=" + encodeURIComponent(ev.slug) : base;
  }
  async function _copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (_) {
      return false;
    }
  }
  function _toast(msg) {
    let t = document.getElementById("evtToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "evtToast";
      t.className = "evt-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("evt-toast--show");
    clearTimeout(t._hideT);
    t._hideT = setTimeout(() => t.classList.remove("evt-toast--show"), 1800);
  }
  function _icsDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
  }
  function _icsEscape(s) {
    return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }
  function _downloadIcs(ev) {
    const start = new Date(ev.start_date);
    const endRaw = ev.end_date || ev.end_at || ev.ends_at;
    const end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 2 * 60 * 60 * 1e3);
    const uid = (ev.id || "evt-" + Date.now()) + "@justicemcneal";
    const url = _eventShareUrl(ev);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//JusticeMcNeal//Portal Events//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + _icsDate(/* @__PURE__ */ new Date()),
      "DTSTART:" + _icsDate(start),
      "DTEND:" + _icsDate(end),
      "SUMMARY:" + _icsEscape(ev.title || "Event"),
      "DESCRIPTION:" + _icsEscape((ev.description || "") + "\n\n" + url),
      "URL:" + _icsEscape(url)
    ];
    if (ev.location_text || ev.location_nickname) {
      lines.push("LOCATION:" + _icsEscape(ev.location_text || ev.location_nickname));
    }
    lines.push("END:VEVENT", "END:VCALENDAR");
    const ics = lines.join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    const slug = ev.slug || ev.id || "event";
    a.href = URL.createObjectURL(blob);
    a.download = slug + ".ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }
  function _applyRestoredUi() {
    return window.PortalEventsListFilters.applyRestoredUi();
  }
  async function loadEvents() {
    try {
      const { data: events, error } = await supabaseClient.from("events").select("*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)").in("status", ["open", "confirmed", "active", "completed"]).order("start_date", { ascending: true });
      if (error) throw error;
      globalThis.evtAllEvents = events || [];
      if (typeof canManageEvents === "function" && canManageEvents() && globalThis.evtCurrentUser) {
        const { data: drafts } = await supabaseClient.from("events").select("*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)").eq("status", "draft").eq("created_by", globalThis.evtCurrentUser.id).order("created_at", { ascending: false });
        if (drafts && drafts.length) {
          globalThis.evtAllEvents = [...drafts, ...window.evtAllEvents];
        }
      }
      const ids = window.evtAllEvents.map((e) => e.id);
      globalThis.evtAllRsvps = {};
      if (globalThis.evtCurrentUser && ids.length) {
        const { data: rsvps } = await supabaseClient.from("event_rsvps").select("*").eq("user_id", globalThis.evtCurrentUser.id).in("event_id", ids);
        (rsvps || []).forEach((r) => {
          window.evtAllRsvps[r.event_id] = r;
        });
      }
      globalThis.evtAttendees = {};
      globalThis.evtAttendeeCounts = {};
      if (ids.length) {
        const [{ data: going, error: aErr }, { data: guestGoing, error: gErr }] = await Promise.all([
          supabaseClient.from("event_rsvps").select("event_id, profiles:user_id(profile_picture_url, first_name)").eq("status", "going").in("event_id", ids),
          supabaseClient.from("event_guest_rsvps").select("event_id, status, paid").in("event_id", ids)
        ]);
        if (!aErr && going) {
          going.forEach((row) => {
            var _a, _b;
            if (!row.profiles) return;
            const list = (_a = window.evtAttendees)[_b = row.event_id] || (_a[_b] = []);
            if (list.length < 5) list.push(row.profiles);
            window.evtAttendeeCounts[row.event_id] = (window.evtAttendeeCounts[row.event_id] || 0) + 1;
          });
        }
        if (!gErr && guestGoing) {
          guestGoing.forEach((row) => {
            if (row.status === "going" || row.paid === true) {
              window.evtAttendeeCounts[row.event_id] = (window.evtAttendeeCounts[row.event_id] || 0) + 1;
            }
          });
        }
      }
      renderEvents();
    } catch (err) {
      console.error("Failed to load events:", err);
      const groups = document.getElementById("evtGroups");
      if (groups) {
        groups.innerHTML = '<p class="text-sm text-red-500 text-center py-8">Failed to load events. Please refresh.</p>';
      }
    }
  }
  function renderSkeletons() {
    const groups = document.getElementById("evtGroups");
    if (!groups || !Card2) return;
    let html5 = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">';
    for (let i = 0; i < 4; i++) html5 += Card2.skeleton();
    html5 += "</div>";
    groups.innerHTML = html5;
  }
  function _renderHeaderCount() {
    return window.PortalEventsListHeader.renderHeaderCount();
  }
  function _initHeaderBell() {
    return window.PortalEventsListHeader.initHeaderBell();
  }
  function _pickHero(events) {
    return window.PortalEventsListHeroRails.pickHero(events);
  }
  function _renderHero(event, rsvp) {
    return window.PortalEventsListHeroRails.renderHero(event, rsvp);
  }
  function _renderLiveBanner(events) {
    return window.PortalEventsListHeroRails.renderLiveBanner(events);
  }
  function _renderGoingRail(events, rsvps, attendees, heroId, eventsById) {
    return window.PortalEventsListHeroRails.renderGoingRail(events, rsvps, attendees, heroId, eventsById);
  }
  function _renderTopPicks(events, attendees, heroId, eventsById) {
    return window.PortalEventsListHeroRails.renderTopPicks(events, attendees, heroId, eventsById);
  }
  function _renderBucket(label, events, rsvps, attendees) {
    return window.PortalEventsListBuckets.renderBucket(label, events, rsvps, attendees);
  }
  function _renderMiniCalendar() {
    return window.PortalEventsListRightRail.renderMiniCalendar();
  }
  function _renderMyRsvps() {
    return window.PortalEventsListRightRail.renderMyRsvps();
  }
  function _renderStatsCard() {
    return window.PortalEventsListRightRail.renderStatsCard();
  }
  function _wireCardClicks(scope, eventsById) {
    scope.querySelectorAll("button[data-evt-create-tile]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById("createEventBtn")?.click();
      });
    });
    scope.querySelectorAll("button[data-evt-bucket-toggle]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const slug = btn.getAttribute("data-evt-bucket-toggle");
        _expandedBucket = _expandedBucket === slug ? null : slug;
        renderEvents();
      });
    });
    scope.querySelectorAll("a[data-evt-card]").forEach((link) => {
      const id = link.getAttribute("data-evt-card");
      const ev = eventsById[id];
      if (!ev) return;
      link.addEventListener("click", (e) => {
        const catBtn = e.target.closest("button[data-evt-cat]");
        if (catBtn && link.contains(catBtn)) {
          e.preventDefault();
          e.stopPropagation();
          const cat = catBtn.getAttribute("data-evt-cat");
          window.PortalEventsListFilters.toggleActiveCategory(cat);
          _persistState();
          renderEvents();
          return;
        }
        const rsvpBtn = e.target.closest("button[data-evt-card-rsvp]");
        if (rsvpBtn && link.contains(rsvpBtn)) {
          e.preventDefault();
          e.stopPropagation();
          if (ev.slug && typeof globalThis.evtNavigateToEvent === "function") {
            window.evtNavigateToEvent(ev.slug);
          } else if (typeof globalThis.evtOpenDetail === "function") {
            window.evtOpenDetail(ev.id);
          }
          return;
        }
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        if (ev.slug && typeof globalThis.evtNavigateToEvent === "function") {
          window.evtNavigateToEvent(ev.slug);
        } else if (typeof globalThis.evtOpenDetail === "function") {
          window.evtOpenDetail(ev.id);
        }
      });
    });
  }
  function _renderActiveFilterPill() {
    return window.PortalEventsListFilters.renderActiveFilterPill();
  }
  function _matchesType(ev) {
    return window.PortalEventsListFilters.matchesType(ev);
  }
  function _matchesCategory(ev) {
    return window.PortalEventsListFilters.matchesCategory(ev);
  }
  function _matchesLifecycle(ev) {
    return window.PortalEventsListFilters.matchesLifecycle(ev);
  }
  function _matchesDate(ev) {
    return window.PortalEventsListFilters.matchesDate(ev);
  }
  function renderEvents() {
    const groupsEl = document.getElementById("evtGroups");
    const heroEl = document.getElementById("evtHero");
    const empty = document.getElementById("emptyState");
    const calMount = document.getElementById("evtCalendarMount");
    if (!groupsEl || !Card2) return;
    _createTileInjected = false;
    _renderHeaderCount();
    _renderActiveFilterPill();
    if (_activeView === "calendar") {
      if (heroEl) heroEl.innerHTML = "";
      const rail = document.getElementById("evtGoingRail");
      const banner = document.getElementById("evtLiveBanner");
      if (rail) rail.classList.add("hidden");
      if (banner) banner.classList.add("hidden");
      groupsEl.innerHTML = "";
      empty?.classList.add("hidden");
      if (calMount) calMount.classList.remove("hidden");
      _renderCalendar();
      return;
    }
    if (calMount) {
      calMount.classList.add("hidden");
      calMount.innerHTML = "";
    }
    const all = window.evtAllEvents || [];
    const rsvps = window.evtAllRsvps || {};
    const attendees = window.evtAttendees || {};
    const eventsById = {};
    all.forEach((e) => {
      eventsById[e.id] = e;
    });
    if (_searchQuery) {
      if (heroEl) heroEl.innerHTML = "";
      const rail = document.getElementById("evtGoingRail");
      if (rail) rail.classList.add("hidden");
      const banner = document.getElementById("evtLiveBanner");
      if (banner) banner.classList.add("hidden");
      const picks = document.getElementById("evtTopPicks");
      if (picks) picks.classList.add("hidden");
      const q = _searchQuery.toLowerCase();
      const titleHits = [];
      const descHits = [];
      all.forEach((e) => {
        if (e.status === "cancelled") return;
        if (!_notHidden(e)) return;
        if (!_matchesCategory(e)) return;
        if ((e.title || "").toLowerCase().includes(q)) {
          titleHits.push(e);
        } else if ((e.description || "").toLowerCase().includes(q)) {
          descHits.push(e);
        }
      });
      const byDateAsc = (a, b) => new Date(a.start_date) - new Date(b.start_date);
      titleHits.sort(byDateAsc);
      descHits.sort(byDateAsc);
      const flat = titleHits.concat(descHits);
      if (!flat.length) {
        groupsEl.innerHTML = "";
        empty?.classList.remove("hidden");
        _renderEmptyCopy();
        return;
      }
      empty?.classList.add("hidden");
      groupsEl.innerHTML = _renderBucket(
        'Results for "' + _searchQuery + '"',
        flat,
        rsvps,
        attendees
      );
      _wireCardClicks(groupsEl, eventsById);
      return;
    }
    const filtered = all.filter((e) => _matchesType(e) && _matchesCategory(e) && _matchesLifecycle(e) && _matchesDate(e) && _notHidden(e));
    const tab = window.evtActiveTab || "upcoming";
    const hero = tab === "upcoming" ? _pickHero(filtered) : null;
    _renderHero(hero, hero ? rsvps[hero.id] : null);
    if (tab === "upcoming") {
      _renderLiveBanner(all);
      _renderGoingRail(all, rsvps, attendees, hero ? hero.id : null, eventsById);
      _renderTopPicks(filtered, attendees, hero ? hero.id : null, eventsById);
    } else {
      const rail = document.getElementById("evtGoingRail");
      if (rail) rail.classList.add("hidden");
      const banner = document.getElementById("evtLiveBanner");
      if (banner) banner.classList.add("hidden");
      const picks = document.getElementById("evtTopPicks");
      if (picks) picks.classList.add("hidden");
    }
    const rest = hero ? filtered.filter((e) => e.id !== hero.id) : filtered;
    if (!rest.length && !hero) {
      groupsEl.innerHTML = "";
      empty?.classList.remove("hidden");
      _renderEmptyCopy();
      return;
    }
    empty?.classList.add("hidden");
    const mode = tab === "past" ? "past" : tab === "going" ? "going" : "upcoming";
    let groups;
    if (typeof H5.groupByBucket === "function") {
      groups = H5.groupByBucket(rest, mode);
    } else {
      groups = [{ label: "Events", events: rest }];
    }
    const dir = tab === "past" ? -1 : 1;
    groups.forEach((g2) => {
      g2.events.sort((a, b) => {
        const ap = a.is_pinned && a.event_type === "llc" ? 0 : 1;
        const bp = b.is_pinned && b.event_type === "llc" ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return dir * (new Date(a.start_date) - new Date(b.start_date));
      });
    });
    if (_expandedBucket) {
      const slugs = groups.map((g2) => String(g2.label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
      if (!slugs.includes(_expandedBucket)) _expandedBucket = null;
    }
    groupsEl.innerHTML = groups.filter((g2) => g2.events.length).filter((g2) => {
      if (!_expandedBucket) return true;
      const s = String(g2.label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return s === _expandedBucket;
    }).map((g2) => _renderBucket(g2.label, g2.events, rsvps, attendees)).join("");
    if (!_createTileInjected && document.body.classList.contains("evt-vlift") && tab === "upcoming") {
      const canCreate = typeof canCreateEvents === "function" && canCreateEvents();
      if (canCreate) {
        const tileWrap = '<div class="evt-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><button type="button" data-evt-create-tile class="evt-create-tile" aria-label="Create new event"><span class="evt-create-tile__plus" aria-hidden="true">+</span><span class="evt-create-tile__label">Create Event</span><span class="evt-create-tile__hint">Add a new event to the calendar</span></button></div>';
        groupsEl.innerHTML += tileWrap;
        _createTileInjected = true;
      }
    }
    _wireCardClicks(groupsEl, eventsById);
    _renderMiniCalendar();
    _renderMyRsvps();
    _renderStatsCard();
  }
  function _renderEmptyCopy() {
    const tab = window.evtActiveTab || "upcoming";
    const titleEl = document.getElementById("emptyTitle");
    const subEl = document.getElementById("emptySubtext");
    const ctaBtn = document.getElementById("emptyCreateBtn");
    const secBtn = document.getElementById("emptySecondaryBtn");
    const canCreate = typeof canCreateEvents === "function" && canCreateEvents();
    let title, sub, showCta = false, secText = "", secAction = null;
    if (_searchQuery) {
      title = 'No events match "' + _searchQuery + '"';
      sub = "Try a shorter term, or clear your filters to see everything.";
      secText = "Clear filters";
      secAction = () => {
        const input = document.getElementById("evtSearchInput");
        const clear = document.getElementById("evtSearchClear");
        if (input) input.value = "";
        clear?.classList.add("hidden");
        window.PortalEventsListFilters.clearFiltersForEmptySearch();
      };
    } else if (tab === "past") {
      title = "No past events yet";
      sub = "Past events will appear here after they wrap up.";
    } else if (tab === "going") {
      title = "Not going to any events";
      sub = "RSVP to an event to see it here.";
    } else if (canCreate) {
      title = "No events yet";
      sub = "Create your family's first one.";
      showCta = true;
    } else {
      title = "No events on the books";
      sub = "Check back soon \u2014 we'll post new gatherings here.";
      secText = "Browse past events";
      secAction = () => _switchLifecycleTab("past");
    }
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
    if (ctaBtn) ctaBtn.classList.toggle("hidden", !showCta);
    if (secBtn) {
      secBtn.classList.toggle("hidden", !secText);
      if (secText) {
        secBtn.textContent = secText;
        secBtn.onclick = secAction;
      } else {
        secBtn.onclick = null;
      }
    }
    _upgradeEmptyIllo();
  }
  function _switchLifecycleTab(tab) {
    return window.PortalEventsListFilters.switchLifecycleTab(tab);
  }
  var _lottieLoading = false;
  var _lottieUpgraded = false;
  function _upgradeEmptyIllo() {
    if (_lottieUpgraded) return;
    const slot = document.getElementById("emptyIllo");
    if (!slot) return;
    const go = () => {
      if (_lottieUpgraded) return;
      if (!window.lottie || typeof window.lottie.loadAnimation !== "function") return;
      try {
        slot.innerHTML = "";
        slot.classList.add("evt-empty-illo--lottie");
        window.lottie.loadAnimation({
          container: slot,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: "/assets/lottie/cat-playing.json"
        });
        _lottieUpgraded = true;
      } catch (_) {
      }
    };
    if (window.lottie) {
      go();
      return;
    }
    if (_lottieLoading) return;
    _lottieLoading = true;
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js";
    s.async = true;
    s.onload = go;
    s.onerror = () => {
    };
    document.head.appendChild(s);
  }
  function initFilterChips2() {
    return window.PortalEventsListFilters.initFilterChips();
  }
  function _initStickyHeader() {
    const header = document.getElementById("evtPageHeader");
    const sentinel = document.getElementById("evtHeaderSentinel");
    const strip = document.getElementById("evtFilterStrip");
    if (!header || !sentinel) return;
    const updateHeaderVar = () => {
      const h = header.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--evt-header-h", h + "px");
    };
    updateHeaderVar();
    window.addEventListener("resize", updateHeaderVar);
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        header.classList.toggle("evt-header--condensed", !e.isIntersecting);
        requestAnimationFrame(updateHeaderVar);
      });
    }, { threshold: 0 });
    io.observe(sentinel);
  }
  function _initMobileFab() {
    const fab = document.getElementById("evtCreateFab");
    if (!fab) return;
    const canCreate = typeof canCreateEvents === "function" && canCreateEvents();
    if (!canCreate) return;
    fab.classList.remove("hidden");
    fab.classList.add("flex");
    fab.addEventListener("click", () => {
      document.getElementById("createEventBtn")?.click();
    });
    let lastY = window.scrollY || 0;
    let ticking = false;
    const TH = 8;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const dy = y - lastY;
        if (y < 20) {
          fab.classList.remove("evt-fab--hidden");
        } else if (dy > TH) {
          fab.classList.add("evt-fab--hidden");
        } else if (dy < -TH) {
          fab.classList.remove("evt-fab--hidden");
        }
        if (Math.abs(dy) > TH) lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const mo = new MutationObserver(() => {
      const modalOpen = document.body.classList.contains("modal-open") || document.body.classList.contains("overflow-hidden");
      fab.classList.toggle("evt-fab--modal-hidden", modalOpen);
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
  function _initPullToRefresh() {
    if (!("ontouchstart" in window)) return;
    const isMobile = () => window.innerWidth < 640;
    if (!isMobile()) return;
    const TRIGGER = 60;
    const MAX = 120;
    const DAMPING = 0.45;
    let ind = document.getElementById("evtPtrIndicator");
    if (!ind) {
      ind = document.createElement("div");
      ind.id = "evtPtrIndicator";
      ind.className = "evt-ptr";
      ind.innerHTML = '<svg class="evt-ptr-spin" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="40 60"/></svg>';
      document.body.appendChild(ind);
    }
    let startY = 0, dy = 0, pulling = false, committed = false, refreshing = false;
    const inRail = (target) => !!(target && target.closest && target.closest("#evtGoingRailScroll"));
    const anyModal = () => document.body.classList.contains("modal-open") || document.body.classList.contains("overflow-hidden");
    const setOffset = (v) => {
      ind.style.transform = "translate(-50%," + v + "px)";
      ind.style.opacity = String(Math.min(1, Math.abs(v) / TRIGGER));
    };
    const reset = () => {
      pulling = false;
      committed = false;
      dy = 0;
      ind.classList.remove("evt-ptr--active", "evt-ptr--refreshing");
      ind.style.transform = "";
      ind.style.opacity = "";
    };
    document.addEventListener("touchstart", (e) => {
      if (refreshing) return;
      if (anyModal()) return;
      if (window.scrollY > 0) return;
      if (inRail(e.target)) return;
      startY = e.touches[0].clientY;
      pulling = true;
      dy = 0;
    }, { passive: true });
    document.addEventListener("touchmove", (e) => {
      if (!pulling || refreshing) return;
      const y = e.touches[0].clientY;
      dy = (y - startY) * DAMPING;
      if (dy <= 0) {
        reset();
        return;
      }
      if (dy > MAX) dy = MAX;
      ind.classList.add("evt-ptr--active");
      setOffset(dy);
      committed = dy >= TRIGGER;
      ind.classList.toggle("evt-ptr--ready", committed);
    }, { passive: true });
    document.addEventListener("touchend", () => {
      if (!pulling || refreshing) return;
      if (!committed) {
        reset();
        return;
      }
      refreshing = true;
      ind.classList.add("evt-ptr--refreshing");
      ind.classList.remove("evt-ptr--ready");
      ind.style.transform = "translate(-50%," + TRIGGER + "px)";
      ind.style.opacity = "1";
      const done = () => {
        refreshing = false;
        reset();
      };
      try {
        const p = typeof globalThis.evtLoadEvents === "function" ? window.evtLoadEvents() : Promise.resolve();
        Promise.resolve(p).finally(() => setTimeout(done, 300));
      } catch (_) {
        done();
      }
    });
  }
  function _bindListModuleApis() {
    globalThis.PortalEventsListSearchApi = {
      getSearchQuery: () => _searchQuery,
      setSearchQuery: (q) => {
        _searchQuery = q;
      },
      getActiveCategory: () => window.PortalEventsListFilters.getActiveCategory(),
      setActiveCategory: (c) => window.PortalEventsListFilters.setActiveCategory(c),
      persistState: _persistState,
      renderEvents,
      getSearchDebounce: () => _searchDebounce,
      setSearchDebounce: (id) => {
        _searchDebounce = id;
      }
    };
    globalThis.PortalEventsListFiltersApi = {
      getSearchQuery: () => _searchQuery,
      setSearchQuery: (q) => {
        _searchQuery = q;
      },
      getActiveView: () => _activeView,
      setActiveView: (v) => {
        _activeView = v;
      },
      getActiveDay: () => _activeDay,
      setActiveDay: (d) => {
        _activeDay = d;
      },
      getExpandedBucket: () => _expandedBucket,
      setExpandedBucket: (b) => {
        _expandedBucket = b;
      },
      applyViewChrome: _applyViewChrome,
      renderEvents
    };
    globalThis.PortalEventsListCalendarApi = {
      getCalMonth: () => _calMonth,
      setCalMonth: (d) => {
        _calMonth = d;
      },
      notHidden: _notHidden,
      miniCard: (ev, att, cnt) => window.PortalEventsListHeroRails.miniCard(ev, att, cnt)
    };
    globalThis.PortalEventsListHeroRailsApi = {
      getSearchQuery: () => _searchQuery,
      notHidden: _notHidden,
      persistState: _persistState,
      renderEvents
    };
    globalThis.PortalEventsListBucketsApi = {
      getExpandedBucket: () => _expandedBucket,
      setExpandedBucket: (b) => {
        _expandedBucket = b;
      },
      getCreateTileInjected: () => _createTileInjected,
      setCreateTileInjected: (v) => {
        _createTileInjected = v;
      }
    };
    globalThis.PortalEventsListRightRailApi = {
      getMiniCalMonth: () => _miniCalMonth,
      setMiniCalMonth: (d) => {
        _miniCalMonth = d;
      },
      getActiveDay: () => _activeDay,
      setActiveDay: (d) => {
        _activeDay = d;
      },
      renderEvents
    };
  }
  _bindListModuleApis();
  globalThis.evtLoadEvents = loadEvents;
  globalThis.evtRenderEvents = renderEvents;
  globalThis.evtRenderFeatured = function() {
  };
  globalThis.evtUpdateHeroStats = function() {
    _renderHeaderCount();
  };
  globalThis.evtSetupSearch = setupSearch2;
  globalThis.evtInitFilterChips = initFilterChips2;
  window.evtLoadEvents = globalThis.evtLoadEvents;
  window.evtRenderEvents = globalThis.evtRenderEvents;
  window.evtRenderFeatured = globalThis.evtRenderFeatured;
  window.evtUpdateHeroStats = globalThis.evtUpdateHeroStats;
  window.evtSetupSearch = globalThis.evtSetupSearch;
  window.evtInitFilterChips = globalThis.evtInitFilterChips;
  globalThis.evtRenderCard = function(event) {
    const rsvps = window.evtAllRsvps || {};
    const attendees = window.evtAttendees || {};
    const counts = window.evtAttendeeCounts || {};
    return Card2 ? Card2.render(event, {
      rsvp: rsvps[event.id] || null,
      attendees: attendees[event.id] || [],
      goingCount: counts[event.id] || (attendees[event.id] || []).length,
      variant: "portal"
    }) : "";
  };
  window.evtRenderCard = globalThis.evtRenderCard;
  var portalEventsListApi = {
    // ── Core public API (init.js consumers) ─────────────
    load: loadEvents,
    render: renderEvents,
    setupSearch: setupSearch2,
    initFilterChips: initFilterChips2,
    // ── Sub-renderers ────────────────────────────────────
    renderHero: _renderHero,
    pickHero: _pickHero,
    renderSkeletons,
    renderCalendar: _renderCalendar,
    renderGoingRail: _renderGoingRail,
    renderTopPicks: _renderTopPicks,
    renderMiniCalendar: _renderMiniCalendar,
    renderMyRsvps: _renderMyRsvps,
    renderStatsCard: _renderStatsCard,
    renderBucket: _renderBucket,
    // ── Filter predicates ────────────────────────────────
    matchesType: _matchesType,
    matchesCategory: _matchesCategory,
    matchesLifecycle: _matchesLifecycle,
    matchesDate: _matchesDate,
    // ── UI initializers ──────────────────────────────────
    initStickyHeader: _initStickyHeader,
    initMobileFab: _initMobileFab
  };
  function _initMobileFilterStrip() {
    const searchExpand = document.getElementById("evtSearchExpand");
    const mSearchHost = document.getElementById("evtMobileSearchHost");
    const filterRow2 = document.getElementById("evtFilterRow2");
    if (!searchExpand || !mSearchHost) return;
    if (!searchExpand.dataset.dHome) {
      searchExpand.dataset.dHome = "1";
      searchExpand._dHomeParent = searchExpand.parentElement;
      searchExpand._dHomeNext = searchExpand.nextSibling;
    }
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => {
      if (mq.matches) {
        if (searchExpand.parentElement !== mSearchHost) {
          mSearchHost.appendChild(searchExpand);
        }
        searchExpand.classList.remove("hidden", "mt-2");
        if (filterRow2) filterRow2.classList.add("hidden");
      } else {
        if (searchExpand.parentElement !== searchExpand._dHomeParent) {
          searchExpand._dHomeParent.insertBefore(
            searchExpand,
            searchExpand._dHomeNext && searchExpand._dHomeNext.parentElement === searchExpand._dHomeParent ? searchExpand._dHomeNext : null
          );
          if (!_searchQuery) searchExpand.classList.add("hidden");
          searchExpand.classList.add("mt-2");
        }
        if (filterRow2) filterRow2.classList.remove("hidden");
      }
    };
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
  }
  function _onReady() {
    const groupsEl = document.getElementById("evtGroups");
    if (groupsEl && !groupsEl.innerHTML.trim()) renderSkeletons();
    _initStickyHeader();
    _initMobileFab();
    _initPullToRefresh();
    _initViewToggle();
    _initVlift();
    _initSwipeGestures();
    _initGreeting();
    _initMobileFilterStrip();
    _applyRestoredUi();
    _initHeaderBell();
    setTimeout(_initHeaderBell, 300);
    setTimeout(_initHeaderBell, 1200);
    if (document.body.classList.contains("evt-vlift") && !document.getElementById("evtHeaderBell")) {
      const _bellMountObs = new MutationObserver(() => {
        if (document.getElementById("notifBtn") && !document.getElementById("evtHeaderBell")) {
          _initHeaderBell();
          if (document.getElementById("evtHeaderBell")) {
            try {
              _bellMountObs.disconnect();
            } catch (_) {
            }
          }
        }
      });
      _bellMountObs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        try {
          _bellMountObs.disconnect();
        } catch (_) {
        }
      }, 15e3);
    }
  }
  if (document.readyState !== "loading") _onReady();
  else document.addEventListener("DOMContentLoaded", _onReady, { once: true });
  globalThis.PortalEvents = globalThis.PortalEvents || {};
  globalThis.PortalEvents.list = portalEventsListApi;
  if (typeof window !== "undefined") window.PortalEvents = globalThis.PortalEvents;

  // js/portal/events/list/manage-sync.js
  document.addEventListener("events:manage:updated", () => {
    if (typeof globalThis.evtLoadEvents === "function") {
      globalThis.evtLoadEvents();
    }
  });

  // js/portal/events/team/ui-tw.js
  var TW_CTA_BTN = "evt-cta-btn flex flex-1 items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[15px] font-bold tracking-wide cursor-pointer whitespace-nowrap transition active:scale-[0.97] disabled:cursor-not-allowed [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.5]";
  var TW_CTA_BAR = [
    "evt-cta-bar",
    "hidden max-lg:flex max-lg:flex-col max-lg:gap-2",
    "max-lg:fixed max-lg:inset-x-0 max-lg:z-[49]",
    "max-lg:bg-white max-lg:border-t max-lg:border-gray-100",
    "max-lg:bottom-[calc(56px+env(safe-area-inset-bottom))]",
    "max-lg:backdrop-blur-sm"
  ].join(" ");
  var TW_CTA_ACTIONS = "evt-cta-actions max-lg:flex max-lg:shrink-0 max-lg:items-center max-lg:justify-center max-lg:gap-2.5 max-lg:px-4 max-lg:py-3 max-lg:pb-[max(12px,env(safe-area-inset-bottom))] hidden";
  var TW_CTA_RSVP = "bg-indigo-600 text-white";
  var TW_CTA_RSVP_DONE = "bg-green-600 text-white";
  var TW_CTA_MANAGE = "bg-indigo-600 text-white";
  var TW_CTA_TEAM = "bg-white text-indigo-600 !border-2 !border-indigo-200";
  var TW_CTA_RAFFLE = "bg-gradient-to-br from-amber-500 to-amber-600 text-white";
  var TW_CTA_RAFFLE_OUTLINE = "bg-white text-amber-600 !border-2 !border-amber-300";
  var TW_CTA_RAFFLE_DONE = "bg-green-600 text-white";
  var TW_CTA_DISABLED = "bg-gray-200 text-gray-400";
  var TW_CTA_RAFFLE_LOCKED = "evt-cta-raffle-locked bg-gray-100 text-gray-400 border border-gray-200 shadow-none cursor-not-allowed";
  var TW_CTA_FOOTNOTE = "evt-cta-footnote m-0 px-4 pb-0.5 text-center text-[11px] font-semibold leading-snug text-gray-500";

  // js/portal/events/team/shell.js
  var ET_TABS = [
    { key: "tools", label: "Tools" },
    { key: "chat", label: "Chat" }
  ];
  function api7() {
    return window.EventsTeamShellApi || {};
  }
  function getState() {
    return api7().getState?.() || {};
  }
  function ensureMounted() {
    if (document.getElementById("etSheetRoot")) return;
    const root2 = document.createElement("div");
    root2.id = "etSheetRoot";
    root2.innerHTML = `
        <div id="etSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
        <div id="etSheet" class="et-sheet-hidden fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
            <div id="etSheetPanel" class="bg-white w-full sm:max-w-3xl sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-none translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:90vh">
                <header id="etSheetHeader" class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Event Team</p>
                        <h2 id="etSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">\u2026</h2>
                        <p id="etSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                    </div>
                    <button id="etSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </header>
                <nav id="etSheetTabs" class="flex gap-1 px-3 sm:px-4 border-b border-gray-100 overflow-x-auto flex-shrink-0" style="scrollbar-width:none;-ms-overflow-style:none"></nav>
                <div id="etSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"></div>
            </div>
        </div>
        <style>
            .et-sheet-hidden { display:none !important; }
            #etSheetTabs::-webkit-scrollbar { display: none; }
            #etSheetContent.et-sheet-content-chat { overflow:hidden; display:flex; flex-direction:column; min-height:0; padding-bottom:0; }
            .et-tab { white-space:nowrap; padding:10px 12px; font-size:13px; font-weight:600; color:#6b7280; border-bottom:2px solid transparent; transition:color .15s,border-color .15s; cursor:pointer; background:none; border-top:none; border-left:none; border-right:none; }
            .et-tab:hover { color:#374151; }
            .et-tab.active { color:#4f46e5; border-bottom-color:#4f46e5; }
            .em-card { background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:16px; padding:16px; }
            .em-op-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
            .em-op-card { min-height:120px; display:flex; flex-direction:column; gap:8px; cursor:pointer; transition:box-shadow .15s,border-color .15s; border:1px solid rgba(0,0,0,.06); border-radius:16px; padding:16px; background:#fff; text-align:left; width:100%; }
            .em-op-card:hover:not(:disabled) { border-color:rgba(79,70,229,.25); box-shadow:0 4px 14px rgba(15,23,42,.06); }
            .em-op-card:disabled { opacity:.55; cursor:not-allowed; }
            .em-op-title { font-size:15px; font-weight:800; color:#111827; margin:0; line-height:1.15; }
            .em-op-copy { font-size:12px; line-height:1.45; color:#6b7280; margin:0; }
            .em-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
            .em-section-title { margin:0; color:#111827; font-size:14px; font-weight:850; }
            .em-section-sub { margin:3px 0 0; color:#94a3b8; font-size:12px; line-height:1.4; }
            .em-btn-primary { background:#4f46e5; color:#fff; padding:9px 14px; border-radius:10px; font-size:13px; font-weight:700; border:none; cursor:pointer; width:100%; }
            .em-btn-primary:hover { background:#4338ca; }
            .em-btn-ghost { background:#f3f4f6; color:#374151; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
            .em-btn-ghost:hover { background:#e5e7eb; }
            .em-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; color:#9ca3af; }
            .et-tools-back { margin-bottom:12px; }
            @media(max-width:639px){ #etSheetPanel { max-height: 92vh; } .em-op-grid { grid-template-columns:1fr; } }
        </style>
    `;
    document.body.appendChild(root2);
    document.getElementById("etSheetClose").addEventListener("click", () => api7().onClose?.());
    document.getElementById("etSheetBackdrop").addEventListener("click", () => api7().onClose?.());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.getElementById("etSheet")?.classList.contains("et-open")) api7().onClose?.();
    });
  }
  function renderHeader() {
    const e = getState().event;
    if (!e) return;
    document.getElementById("etSheetTitle").textContent = e.title;
    const dateStr = new Date(e.start_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const typeLabel = { llc: "LLC", member: "Member", competition: "Competition" }[e.event_type] || e.event_type;
    document.getElementById("etSheetSub").textContent = `${typeLabel} \xB7 ${dateStr} \xB7 Team coordination`;
  }
  function renderTabs() {
    const STATE4 = getState();
    const bar = document.getElementById("etSheetTabs");
    const showTabs = STATE4.toolsView === "list";
    bar.style.display = showTabs ? "" : "none";
    if (!showTabs) return;
    bar.innerHTML = ET_TABS.map(
      (t) => `<button type="button" class="et-tab${t.key === STATE4.activeTab ? " active" : ""}" data-tab="${t.key}">${t.label}</button>`
    ).join("");
    bar.querySelectorAll(".et-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const st = getState();
        st.activeTab = btn.dataset.tab;
        renderTabs();
        api7().renderTab?.(st.activeTab);
        btn.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
      });
    });
  }
  function renderContent(html5) {
    document.getElementById("etSheetContent").innerHTML = html5;
  }
  function setContentMode(mode) {
    const el = document.getElementById("etSheetContent");
    if (!el) return;
    el.classList.toggle("et-sheet-content-chat", mode === "chat");
  }
  function setLoadingChrome() {
    document.getElementById("etSheetTitle").textContent = "Loading\u2026";
    document.getElementById("etSheetSub").textContent = "";
    renderTabs();
    setContentMode("default");
    renderContent('<div class="em-placeholder"><div style="font-size:13px">Loading\u2026</div></div>');
  }
  function openPanel() {
    const sheet = document.getElementById("etSheet");
    const panel = document.getElementById("etSheetPanel");
    const backdrop = document.getElementById("etSheetBackdrop");
    sheet.classList.remove("et-sheet-hidden");
    sheet.classList.add("et-open");
    backdrop.classList.remove("opacity-0", "pointer-events-none");
    backdrop.classList.add("opacity-100");
    requestAnimationFrame(() => {
      panel.classList.remove("pointer-events-none", "translate-y-full", "sm:translate-y-4", "sm:opacity-0");
      panel.classList.add("pointer-events-auto", "translate-y-0", "sm:opacity-100");
    });
    document.body.style.overflow = "hidden";
  }
  function closePanel() {
    const sheet = document.getElementById("etSheet");
    const panel = document.getElementById("etSheetPanel");
    const backdrop = document.getElementById("etSheetBackdrop");
    if (!sheet || !sheet.classList.contains("et-open")) return;
    panel.classList.add("pointer-events-none", "translate-y-full", "sm:translate-y-4", "sm:opacity-0");
    panel.classList.remove("pointer-events-auto", "translate-y-0", "sm:opacity-100");
    backdrop.classList.add("opacity-0", "pointer-events-none");
    backdrop.classList.remove("opacity-100");
    document.body.style.overflow = "";
    setTimeout(() => {
      sheet.classList.remove("et-open");
      sheet.classList.add("et-sheet-hidden");
    }, 250);
  }
  var teamShellApi = {
    ensureMounted,
    renderHeader,
    renderTabs,
    renderContent,
    setContentMode,
    setLoadingChrome,
    openPanel,
    closePanel,
    getTabs: () => ET_TABS
  };
  globalThis.EventsTeamShell = teamShellApi;

  // js/portal/events/team/panels.js
  function memberGoing(rsvp) {
    return typeof globalThis.evtIsGoingRsvp === "function" ? window.evtIsGoingRsvp(rsvp) : !!(rsvp && (rsvp.status === "going" || rsvp.paid === true));
  }
  function backBtnHtml(variant) {
    if (variant !== "sheet") return "";
    return `<button type="button" class="em-btn-ghost et-tools-back" onclick="window.EventsTeam.backToToolsList()">\u2039 Back to Tools</button>`;
  }
  function ticketHtml(event, rsvp, opts = {}) {
    const { variant = "sheet", canvasId = "evtTeamTicketQR" } = opts;
    const going = memberGoing(rsvp);
    const hasQr = going && rsvp?.qr_token && event.checkin_mode === "attendee_ticket";
    const title = evtEscapeHtml(event.title || "Event");
    const qrBlock = hasQr ? `<canvas id="${canvasId}"></canvas><p class="text-xs text-gray-500 mt-2">Show this QR code at check-in</p>` : `<div class="ed-notice"><span class="ed-notice-emoji">\u2705</span><div><p class="ed-notice-title">You are on the RSVP list</p><p class="ed-notice-sub">No QR ticket is required for this event.</p></div></div>`;
    return `
        ${backBtnHtml(variant)}
        <div class="em-section-head">
            <div>
                <p class="em-section-title">You're going</p>
                <p class="em-section-sub">${title}</p>
            </div>
        </div>
        <div class="em-card text-center [&_canvas]:mx-auto [&_canvas]:block [&_canvas]:rounded-xl">${qrBlock}</div>`;
  }
  function raffleHtml(event, eventId2, rsvp, opts = {}) {
    const { variant = "sheet" } = opts;
    const back = backBtnHtml(variant);
    const going = memberGoing(rsvp);
    const raffleBundled = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === "function" ? window.evtIsRaffleBundledWithPaidRsvp(event) : event.pricing_mode === "paid" && event.rsvp_enabled !== false;
    if (raffleBundled) {
      return `
            ${back}
            <div class="em-section-head">
                <div>
                    <p class="em-section-title">Raffle included</p>
                    <p class="em-section-sub">Raffle entry is included when you complete your paid RSVP for this event.</p>
                </div>
            </div>`;
    }
    if (!going) {
      return `
            ${back}
            <div class="em-section-head">
                <div>
                    <p class="em-section-title">RSVP first</p>
                    <p class="em-section-sub">Once you are going, this same member RSVP will be used for the raffle entry.</p>
                </div>
            </div>
            <button type="button" class="em-btn-primary" onclick="globalThis.evtCtaRaffleIntent='${eventId2}';evtHandleRsvp('${eventId2}','going')">RSVP to Enter Raffle</button>`;
    }
    const cost = event.raffle_entry_cost_cents || 0;
    const sub = cost > 0 ? "Confirm to start checkout. Raffle tickets are non-refundable." : "One tap and you are in the draw.";
    const action = cost > 0 ? `evtHandleRaffleEntry('${eventId2}')` : `evtHandleFreeRaffleEntry('${eventId2}')`;
    const label = cost > 0 ? `Buy Raffle Entry \u2014 ${formatCurrency(cost)}` : "Enter Raffle \u2014 Free";
    return `
        ${back}
        <div class="em-section-head">
            <div>
                <p class="em-section-title">Enter the raffle</p>
                <p class="em-section-sub">${sub}</p>
            </div>
        </div>
        <button type="button" class="em-btn-primary" onclick="${action}">${label}</button>`;
  }
  async function wireTicketQr(event, rsvp, opts = {}) {
    const { canvasId = "evtTeamTicketQR" } = opts;
    const going = memberGoing(rsvp);
    const hasQr = going && rsvp?.qr_token && event.checkin_mode === "attendee_ticket";
    if (!hasQr) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const qrUrl = `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`;
    try {
      const QRCode = typeof globalThis.evtEnsureQRCode === "function" ? await window.evtEnsureQRCode() : window.QRCode;
      if (QRCode && canvas.isConnected) {
        QRCode.toCanvas(canvas, qrUrl, { width: 172, margin: 2 });
      }
    } catch (err) {
      console.warn("Team ticket QR failed:", err);
    }
  }
  var teamPanelsApi = { ticketHtml, raffleHtml, wireTicketQr };
  globalThis.EventsTeamPanels = teamPanelsApi;

  // js/portal/events/team/tools-list.js
  function canUseEventScanner(event, canManageEvent) {
    const checkinEnabled = event.checkin_enabled !== false;
    return checkinEnabled && canManageEvent && event.checkin_mode === "attendee_ticket" && ["open", "confirmed", "active"].includes(event.status);
  }
  function toolsOpCard(title, copy, onClick, disabled) {
    const copyHtml = copy ? `<p class="em-op-copy">${copy}</p>` : "";
    if (disabled) {
      return `<button type="button" class="em-op-card" disabled aria-disabled="true"><p class="em-op-title">${title}</p>${copyHtml}</button>`;
    }
    return `<button type="button" class="em-op-card" onclick="${onClick}"><p class="em-op-title">${title}</p>${copyHtml}</button>`;
  }
  function toolsHtml(event, eventId2, rsvp, myRaffleEntry, entriesClosed, eventIsFull, opts) {
    const { canManageEvent } = opts;
    const rsvpEnabled = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    const canRsvp = rsvpEnabled && ["open", "confirmed", "active"].includes(event.status) && !entriesClosed;
    const hasGoingRsvp = typeof globalThis.evtIsGoingRsvp === "function" ? window.evtIsGoingRsvp(rsvp) : !!(rsvp && (rsvp.status === "going" || rsvp.paid === true));
    const cards = [];
    cards.push(toolsOpCard("Team Chat", "Private team coordination", `window.EventsTeam.open('${eventId2}',{tab:'chat'})`, false));
    if (rsvpEnabled) {
      if (!canRsvp) {
        cards.push(toolsOpCard("RSVP as Myself", "RSVP is closed for this event", "", true));
      } else if (eventIsFull && !hasGoingRsvp) {
        cards.push(toolsOpCard("RSVP as Myself", "Event is full", "", true));
      } else if (hasGoingRsvp) {
        cards.push(toolsOpCard("RSVP as Myself", "You're RSVP'd \u2014 tap to update", `window.EventsTeam.close();evtHandleRsvp('${eventId2}','going')`, false));
      } else if (event.pricing_mode === "paid") {
        cards.push(toolsOpCard("RSVP as Myself", `Paid RSVP \u2014 ${formatCurrency(event.rsvp_cost_cents)}`, `window.EventsTeam.close();evtHandleRsvp('${eventId2}','going')`, false));
      } else {
        cards.push(toolsOpCard("RSVP as Myself", "Count yourself as going", `window.EventsTeam.close();evtHandleRsvp('${eventId2}','going')`, false));
      }
    }
    if (raffleEnabled) {
      const raffleBundled = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === "function" ? window.evtIsRaffleBundledWithPaidRsvp(event) : event.pricing_mode === "paid" && rsvpEnabled;
      if (raffleBundled) {
        cards.push(toolsOpCard("Enter Raffle", rsvp?.paid ? "Included with your paid RSVP" : "Included with paid RSVP", "", true));
      } else if (myRaffleEntry) {
        cards.push(toolsOpCard("Enter Raffle", "Already entered", "", true));
      } else if (entriesClosed) {
        cards.push(toolsOpCard("Enter Raffle", "Entries are closed", "", true));
      } else if (!hasGoingRsvp) {
        cards.push(toolsOpCard("Enter Raffle", "RSVP first to enter the raffle", "", true));
      } else {
        const costLabel = event.raffle_entry_cost_cents > 0 ? formatCurrency(event.raffle_entry_cost_cents) : "Free entry";
        cards.push(toolsOpCard("Enter Raffle", costLabel, `window.EventsTeam.openToolsView('raffle')`, false));
      }
    }
    if (hasGoingRsvp) {
      cards.push(toolsOpCard("View Ticket", "Your RSVP confirmation", `window.EventsTeam.openToolsView('ticket')`, false));
    }
    if (canUseEventScanner(event, canManageEvent)) {
      cards.push(toolsOpCard("Scanner", "Scan attendee QR codes", `window.EventsTeam.close();evtOpenScanner('${eventId2}')`, false));
    }
    if (canManageEvent) {
      const manageClick = `window.EventsTeam.close();(window.EventsManage?window.EventsManage.open('${eventId2}',{source:'portal'}):(window.location='../admin/events.html?id=${eventId2}'))`;
      cards.push(toolsOpCard("Manage Event", "Hosts, RSVP, raffle, settings", manageClick, false));
    }
    return `<div class="em-op-grid">${cards.join("")}</div>`;
  }
  var teamToolsListApi = { toolsHtml };
  globalThis.EventsTeamToolsList = teamToolsListApi;

  // js/portal/events/team/chat.js
  var EVT_TEAM_CHAT_MAX_LEN = 4e3;
  var EVT_TEAM_CHAT_TIME_GAP_MS = 60 * 60 * 1e3;
  var CHAT_ROOT = "flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white";
  var CHAT_THREAD = "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain bg-white px-3.5 py-3";
  var CHAT_EMPTY = "m-auto px-4 py-6 text-center text-[15px] leading-snug text-gray-400";
  var CHAT_ALERT = "mx-4 my-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3.5 text-center text-sm leading-snug text-amber-900";
  var CHAT_ROW_SENT = "mb-0.5 flex max-w-[78%] flex-col items-end self-end";
  var CHAT_ROW_RECV = "mb-1 flex max-w-[88%] items-end gap-1.5 self-start";
  var CHAT_RECV_COL = "flex min-w-0 flex-1 flex-col items-start";
  var CHAT_AVATAR = "evt-chat-avatar flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 [&_img]:h-full [&_img]:w-full [&_img]:object-cover";
  var CHAT_AVATAR_HIDDEN = "invisible pointer-events-none";
  var CHAT_SENDER = "mb-0.5 px-3 text-[11px] font-semibold leading-tight text-gray-400";
  var CHAT_BUBBLE = "break-words whitespace-pre-wrap px-3 py-2 text-base leading-snug rounded-[18px]";
  var CHAT_BUBBLE_SENT = "rounded-br-md bg-[#007AFF] text-white";
  var CHAT_BUBBLE_RECV = "rounded-bl-md bg-[#E9E9EB] text-gray-900";
  var CHAT_TIME = "mt-0.5 px-1 text-[11px] leading-tight text-gray-400";
  var CHAT_COMPOSER = "flex shrink-0 items-end gap-2 border-t border-gray-200/80 bg-gray-50/95 px-2.5 py-2 backdrop-blur-xl pb-[max(8px,env(safe-area-inset-bottom))]";
  var CHAT_INPUT_WRAP = "flex min-h-9 flex-1 items-end rounded-full border border-gray-300/80 bg-white px-3 py-1.5";
  var CHAT_TEXTAREA = "max-h-[100px] min-h-[22px] w-full resize-none border-0 bg-transparent text-base leading-snug outline-none placeholder:text-gray-400 disabled:opacity-55";
  var CHAT_SEND = "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-0 bg-[#007AFF] p-0 text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[2.5] [&_svg]:fill-none [&_svg]:stroke-current";
  var IM_SEND_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6"/></svg>';
  function canCreateTeamChat(event) {
    if (!event || !globalThis.evtCurrentUser?.id) return false;
    if (event.created_by === globalThis.evtCurrentUser.id) return true;
    return typeof canManageEvents === "function" && canManageEvents();
  }
  function friendlyError(err) {
    if (!err) return "Something went wrong. Please try again.";
    const msg = (err.message || "").toLowerCase();
    if (err.code === "42501" || msg.includes("permission") || msg.includes("row-level security") || msg.includes("policy")) {
      return "Team chat is not available for your account on this event.";
    }
    if (msg.includes("jwt") || msg.includes("not authenticated")) return "Please sign in again to use team chat.";
    return err.message || "Unable to complete this action.";
  }
  function displayName(profile) {
    if (!profile) return "Member";
    const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return name || "Member";
  }
  function profileInitials(profile) {
    const f = (profile?.first_name || "").trim();
    const l = (profile?.last_name || "").trim();
    const letters = `${f.charAt(0) || ""}${l.charAt(0) || ""}`.toUpperCase();
    return letters || "M";
  }
  function avatarHtml(profile, { spacer = false } = {}) {
    const name = evtEscapeHtml(displayName(profile));
    const initials = evtEscapeHtml(profileInitials(profile));
    const url = profile?.profile_picture_url;
    const inner = url ? `<img src="${evtEscapeHtml(url)}" alt="" loading="lazy">` : `<span class="text-[11px] font-bold leading-none text-indigo-600">${initials}</span>`;
    const spacerCls = spacer ? ` ${CHAT_AVATAR_HIDDEN}` : "";
    return `<div class="${CHAT_AVATAR}${spacerCls}" aria-hidden="${spacer ? "true" : "false"}" title="${name}">${inner}</div>`;
  }
  function formatBubbleTime(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch (_) {
      return "";
    }
  }
  function shouldShowMessageTime(prevCreatedAt, createdAt) {
    if (!prevCreatedAt || !createdAt) return true;
    const gap = new Date(createdAt).getTime() - new Date(prevCreatedAt).getTime();
    if (!Number.isFinite(gap)) return true;
    return gap >= EVT_TEAM_CHAT_TIME_GAP_MS;
  }
  function cleanup() {
    const state = window.__evtTeamChatState;
    if (state?.channel) {
      try {
        supabaseClient.removeChannel(state.channel);
      } catch (_) {
      }
    }
    window.__evtTeamChatState = null;
  }
  async function ensureChat(event, eventId2) {
    const { data: existing, error: selErr } = await supabaseClient.from("event_chats").select("id, event_id, chat_type, created_at").eq("event_id", eventId2).eq("chat_type", "team").maybeSingle();
    if (selErr) return { chat: null, error: selErr };
    if (existing) return { chat: existing, error: null };
    if (!canCreateTeamChat(event)) {
      return { chat: null, error: null, notStarted: true };
    }
    const { data: created, error: insErr } = await supabaseClient.from("event_chats").insert({
      event_id: eventId2,
      chat_type: "team",
      created_by: globalThis.evtCurrentUser.id
    }).select("id, event_id, chat_type, created_at").single();
    if (insErr?.code === "23505") {
      const { data: again, error: againErr } = await supabaseClient.from("event_chats").select("id, event_id, chat_type, created_at").eq("event_id", eventId2).eq("chat_type", "team").maybeSingle();
      return { chat: again, error: againErr };
    }
    return { chat: created, error: insErr };
  }
  async function loadMessages(chatId, eventId2) {
    const { data: rows, error } = await supabaseClient.from("event_chat_messages").select("id, chat_id, event_id, sender_id, body, created_at, updated_at, deleted_at").eq("chat_id", chatId).eq("event_id", eventId2).is("deleted_at", null).order("created_at", { ascending: true }).limit(200);
    if (error) return { messages: [], profilesById: {}, error };
    const messages = rows || [];
    const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))];
    const profilesById = {};
    if (senderIds.length) {
      const { data: profiles } = await supabaseClient.from("profiles").select("id, first_name, last_name, profile_picture_url").in("id", senderIds);
      (profiles || []).forEach((p) => {
        profilesById[p.id] = p;
      });
    }
    return { messages, profilesById, error: null };
  }
  function messagesHtml(state) {
    if (!state?.messages?.length) {
      return `<p class="${CHAT_EMPTY}">No messages yet.<br>Send the first message to the team.</p>`;
    }
    const myId = globalThis.evtCurrentUser?.id;
    let prevSenderId = null;
    return state.messages.map((m, i) => {
      const isMine = myId && m.sender_id === myId;
      const profile = state.profilesById[m.sender_id];
      const name = evtEscapeHtml(displayName(profile));
      const prevMsg = i > 0 ? state.messages[i - 1] : null;
      const showTime = shouldShowMessageTime(prevMsg?.created_at, m.created_at);
      const timeHtml = showTime ? `<time class="${CHAT_TIME}">${evtEscapeHtml(formatBubbleTime(m.created_at))}</time>` : "";
      const body = evtEscapeHtml(m.body || "");
      if (isMine) {
        prevSenderId = m.sender_id;
        return `<div class="${CHAT_ROW_SENT}" data-msg-id="${m.id}"><div class="${CHAT_BUBBLE} ${CHAT_BUBBLE_SENT}">${body}</div>${timeHtml}</div>`;
      }
      const showAvatar = m.sender_id !== prevSenderId;
      prevSenderId = m.sender_id;
      return `<div class="${CHAT_ROW_RECV}" data-msg-id="${m.id}">
        ${avatarHtml(profile, { spacer: !showAvatar })}
        <div class="${CHAT_RECV_COL}">
            ${showAvatar ? `<span class="${CHAT_SENDER}">${name}</span>` : ""}
            <div class="${CHAT_BUBBLE} ${CHAT_BUBBLE_RECV}">${body}</div>
            ${timeHtml}
        </div>
    </div>`;
    }).join("");
  }
  function refreshMessageList() {
    const state = window.__evtTeamChatState;
    const el = document.getElementById("evtTeamChatMessages");
    if (!state || !el) return;
    el.innerHTML = messagesHtml(state);
    el.scrollTop = el.scrollHeight;
  }
  function handleRealtime(payload) {
    const state = window.__evtTeamChatState;
    if (!state || !payload?.new) return;
    const row = payload.new;
    if (row.event_id !== state.eventId || row.chat_id !== state.chatId) return;
    if (payload.eventType === "INSERT") {
      if (row.deleted_at) return;
      if (state.messages.some((m) => m.id === row.id)) return;
      state.messages.push(row);
      state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      refreshMessageList();
      if (row.sender_id && !state.profilesById[row.sender_id]) {
        supabaseClient.from("profiles").select("id, first_name, last_name, profile_picture_url").eq("id", row.sender_id).maybeSingle().then(({ data }) => {
          if (data && window.__evtTeamChatState?.eventId === state.eventId) {
            window.__evtTeamChatState.profilesById[data.id] = data;
            refreshMessageList();
          }
        });
      }
      return;
    }
    if (payload.eventType === "UPDATE") {
      const idx = state.messages.findIndex((m) => m.id === row.id);
      if (row.deleted_at) {
        if (idx >= 0) {
          state.messages.splice(idx, 1);
          refreshMessageList();
        }
        return;
      }
      if (idx >= 0) state.messages[idx] = row;
      else state.messages.push(row);
      state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      refreshMessageList();
    }
  }
  function subscribe(chatId, eventId2) {
    const state = window.__evtTeamChatState;
    if (!state) return;
    if (state.channel) {
      try {
        supabaseClient.removeChannel(state.channel);
      } catch (_) {
      }
      state.channel = null;
    }
    state.channel = supabaseClient.channel(`evt-team-chat-${eventId2}`).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "event_chat_messages",
      filter: `event_id=eq.${eventId2}`
    }, (payload) => handleRealtime({ eventType: "INSERT", new: payload.new })).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "event_chat_messages",
      filter: `event_id=eq.${eventId2}`
    }, (payload) => handleRealtime({ eventType: "UPDATE", new: payload.new })).subscribe();
  }
  function renderChatBody(eventId2, opts) {
    const { loading, unavailable, notStarted, canCompose } = opts;
    if (loading) return `<p class="${CHAT_EMPTY}">Loading\u2026</p>`;
    if (unavailable) return `<p class="${CHAT_ALERT}">${evtEscapeHtml(unavailable)}</p>`;
    if (notStarted) {
      return `<p class="${CHAT_ALERT}">Team chat has not been started yet. Ask the event creator or a coordinator to open Team Chat first.</p>`;
    }
    const state = window.__evtTeamChatState;
    return `
        <div id="evtTeamChatMessages" class="${CHAT_THREAD}" role="log" aria-live="polite">${messagesHtml(state)}</div>
        <div id="evtTeamChatStatus" class="${CHAT_EMPTY} px-2 pb-1" aria-live="polite"></div>
        ${canCompose ? `
        <div class="${CHAT_COMPOSER}">
            <div class="${CHAT_INPUT_WRAP}">
                <textarea id="evtTeamChatInput" class="${CHAT_TEXTAREA}" maxlength="${EVT_TEAM_CHAT_MAX_LEN}" rows="1" placeholder="Message" aria-label="Team chat message"></textarea>
            </div>
            <button type="button" id="evtTeamChatSendBtn" class="${CHAT_SEND}" ${evtDataAction("evtSendTeamChatMessage", eventId2)} aria-label="Send message">${IM_SEND_SVG}</button>
        </div>` : ""}`;
  }
  async function initTab(eventId2, event) {
    cleanup();
    const Shell3 = window.EventsTeamShell;
    if (!Shell3) return;
    Shell3.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId2, { loading: true })}</div>`);
    const ensure = await ensureChat(event, eventId2);
    if (ensure.error) {
      Shell3.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId2, { unavailable: friendlyError(ensure.error) })}</div>`);
      return;
    }
    if (ensure.notStarted || !ensure.chat) {
      Shell3.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId2, { notStarted: true })}</div>`);
      return;
    }
    const chatId = ensure.chat.id;
    const loaded = await loadMessages(chatId, eventId2);
    if (loaded.error) {
      Shell3.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId2, { unavailable: friendlyError(loaded.error) })}</div>`);
      return;
    }
    window.__evtTeamChatState = {
      eventId: eventId2,
      chatId,
      messages: loaded.messages,
      profilesById: loaded.profilesById,
      channel: null
    };
    Shell3.renderContent(`<div class="${CHAT_ROOT}">${renderChatBody(eventId2, { canCompose: true })}</div>`);
    refreshMessageList();
    subscribe(chatId, eventId2);
    const input = document.getElementById("evtTeamChatInput");
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          send(eventId2);
        }
      });
    }
  }
  async function open(eventId2) {
    return window.EventsTeam?.open?.(eventId2, { tab: "chat" });
  }
  async function send(eventId2) {
    const state = window.__evtTeamChatState;
    if (!state || state.eventId !== eventId2 || !state.chatId) return;
    const input = document.getElementById("evtTeamChatInput");
    const sendBtn = document.getElementById("evtTeamChatSendBtn");
    const statusEl = document.getElementById("evtTeamChatStatus");
    if (!input) return;
    const body = (input.value || "").trim();
    if (!body) {
      if (statusEl) statusEl.textContent = "Enter a message to send.";
      return;
    }
    if (body.length > EVT_TEAM_CHAT_MAX_LEN) {
      if (statusEl) statusEl.textContent = `Message must be ${EVT_TEAM_CHAT_MAX_LEN} characters or fewer.`;
      return;
    }
    if (sendBtn) sendBtn.disabled = true;
    if (statusEl) statusEl.textContent = "Sending\u2026";
    const { data, error } = await supabaseClient.from("event_chat_messages").insert({
      chat_id: state.chatId,
      event_id: eventId2,
      sender_id: globalThis.evtCurrentUser.id,
      body
    }).select("id, chat_id, event_id, sender_id, body, created_at, updated_at, deleted_at").single();
    if (sendBtn) sendBtn.disabled = false;
    if (error) {
      if (statusEl) statusEl.textContent = friendlyError(error);
      return;
    }
    input.value = "";
    if (statusEl) statusEl.textContent = "";
    if (data && !data.deleted_at && !state.messages.some((m) => m.id === data.id)) {
      state.messages.push(data);
      if (!state.profilesById[globalThis.evtCurrentUser.id] && globalThis.evtCurrentUser) {
        state.profilesById[globalThis.evtCurrentUser.id] = {
          id: globalThis.evtCurrentUser.id,
          first_name: globalThis.evtCurrentUser.first_name,
          last_name: globalThis.evtCurrentUser.last_name,
          profile_picture_url: globalThis.evtCurrentUser.profile_picture_url || null
        };
      }
      state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      refreshMessageList();
    }
  }
  var teamChatApi = {
    open,
    initTab,
    send,
    cleanup,
    ensureChat,
    loadMessages,
    subscribe,
    maxLength: EVT_TEAM_CHAT_MAX_LEN
  };
  globalThis.evtOpenTeamChat = open;
  globalThis.evtSendTeamChatMessage = send;
  globalThis.evtCleanupTeamChat = cleanup;
  var PortalEvents2 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents2.team = PortalEvents2.team || {};
  PortalEvents2.team.chat = teamChatApi;

  // js/portal/events/team/cta-bar.js
  var EVT_CTA_ICONS = {
    check: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>',
    manage: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
  };
  var TW_CTA_PANEL = "evt-cta-panel relative flex w-full flex-col min-h-0 flex-1 overflow-y-auto px-4 py-3 max-lg:border-0 max-lg:bg-transparent";
  var TW_CTA_PANEL_EXPANDED = "evt-cta-bar-expanded max-lg:top-[max(6px,env(safe-area-inset-top))] max-lg:bottom-[calc(56px+env(safe-area-inset-bottom))] max-lg:justify-end max-lg:gap-2.5 max-lg:overflow-hidden max-lg:overscroll-none max-lg:bg-white/95 max-lg:backdrop-blur-xl max-lg:shadow-[0_-6px_28px_rgba(15,23,42,0.1)] max-lg:border-t max-lg:border-black/5";
  var TW_CTA_CLOSE = "absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-gray-100 text-lg font-bold leading-none text-gray-700";
  var _ctaSheetScrollY = 0;
  function lockCtaScroll() {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    if (document.body.dataset.evtCtaSheetLocked === "1") return;
    _ctaSheetScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.dataset.evtCtaSheetLocked = "1";
    document.documentElement.classList.add("evt-cta-sheet-open");
    document.body.classList.add("evt-cta-sheet-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${_ctaSheetScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  function unlockCtaScroll() {
    if (document.body.dataset.evtCtaSheetLocked !== "1") return;
    delete document.body.dataset.evtCtaSheetLocked;
    document.documentElement.classList.remove("evt-cta-sheet-open");
    document.body.classList.remove("evt-cta-sheet-open");
    const y = _ctaSheetScrollY;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, y);
  }
  function expandCtaBar(bar) {
    if (!bar) return;
    bar.classList.add(...TW_CTA_PANEL_EXPANDED.split(/\s+/).filter(Boolean));
    lockCtaScroll();
  }
  function collapseCtaBar(bar) {
    if (bar) bar.classList.remove(...TW_CTA_PANEL_EXPANDED.split(/\s+/).filter(Boolean));
    unlockCtaScroll();
  }
  function raffleLockedCtaBtnHtml() {
    return `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_RAFFLE_LOCKED}" disabled aria-disabled="true">${EVT_CTA_ICONS.ticket} Enter Raffle</button>`;
  }
  function closeCtaPanel() {
    const panel = document.getElementById("evtCtaPanel");
    const bar = document.getElementById("evtCtaBar");
    if (panel) {
      panel.classList.add("hidden");
      panel.innerHTML = "";
    }
    if (bar) collapseCtaBar(bar);
  }
  function openCtaPanel(kind, eventId2) {
    const event = (window.evtAllEvents || globalThis.evtAllEvents).find((e) => e.id === eventId2);
    if (!event) return;
    const bar = document.getElementById("evtCtaBar");
    const panel = document.getElementById("evtCtaPanel");
    if (!bar || !panel) return;
    const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId2];
    const Panels2 = window.EventsTeamPanels || {};
    const closeBtn = `<button type="button" class="${TW_CTA_CLOSE}" ${evtDataAction("evtCloseCtaPanel")} aria-label="Close">\xD7</button>`;
    expandCtaBar(bar);
    panel.className = TW_CTA_PANEL;
    panel.classList.remove("hidden");
    if (kind === "ticket" && Panels2.ticketHtml) {
      panel.innerHTML = `${closeBtn}${Panels2.ticketHtml(event, rsvp, { variant: "cta", canvasId: "evtCtaTicketQR" })}`;
      Panels2.wireTicketQr?.(event, rsvp, { canvasId: "evtCtaTicketQR" });
      return;
    }
    if (kind === "raffle" && Panels2.raffleHtml) {
      panel.innerHTML = `${closeBtn}${Panels2.raffleHtml(event, eventId2, rsvp, { variant: "cta" })}`;
    }
  }
  function cleanupBottomNav() {
    closeCtaPanel();
    unlockCtaScroll();
    const el = document.getElementById("evtCtaBar");
    if (el) el.remove();
    const hint = document.querySelector(".bottom-tab-bar .swipe-hint");
    if (hint) hint.style.display = "";
    document.body.classList.remove("evt-cta-active");
    if (typeof globalThis.evtCleanupHeroCollapse === "function") window.evtCleanupHeroCollapse();
  }
  function initBottomNav(event, eventId2, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost, canAccessTeamHub) {
    cleanupBottomNav();
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const rsvpEnabled = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    const teamHubAccess = !!canAccessTeamHub || isHost || typeof canAccessAdminDashboard === "function" && canAccessAdminDashboard();
    if (!isHost && !teamHubAccess && !rsvpEnabled && !raffleEnabled) return;
    const isClosed = event.status === "completed" || event.status === "cancelled";
    const canRsvp = rsvpEnabled && ["open", "confirmed", "active"].includes(event.status) && !entriesClosed;
    let primaryBtn = "";
    let secondaryBtn = "";
    let ctaFootnote = "";
    const teamBtn = `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_TEAM}" onclick="window.EventsTeam.open('${eventId2}',{tab:'tools'})" aria-label="Open event team tools">Team</button>`;
    if (isHost) {
      primaryBtn = `<button type="button" class="${TW_CTA_BTN} ${TW_CTA_MANAGE}" onclick="window.EventsManage ? window.EventsManage.open('${eventId2}',{source:'portal'}) : (window.location='../admin/events.html?id=${eventId2}')">${EVT_CTA_ICONS.manage} Manage Event</button>`;
      if (teamHubAccess) secondaryBtn = teamBtn;
    } else if (teamHubAccess) {
      primaryBtn = teamBtn;
    } else {
      if (rsvpEnabled) {
        if (rsvp?.paid) {
          primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP_DONE}" ${evtDataAction("evtOpenCtaPanel", "ticket", eventId2)}>${EVT_CTA_ICONS.ticket} RSVP'd \xB7 Ticket</button>`;
        } else if (rsvp?.status === "going") {
          primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP_DONE}" ${evtDataAction("evtOpenCtaPanel", "ticket", eventId2)}>${EVT_CTA_ICONS.ticket} Going \xB7 Ticket</button>`;
        } else if (canRsvp && !eventIsFull && event.pricing_mode === "paid") {
          primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP}" ${evtDataAction("evtHandleRsvp", eventId2, "going")}>RSVP \u2014 ${formatCurrency(event.rsvp_cost_cents)}</button>`;
        } else if (canRsvp && !eventIsFull) {
          primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_RSVP}" ${evtDataAction("evtHandleRsvp", eventId2, "going")}>RSVP</button>`;
        } else if (eventIsFull) {
          primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_DISABLED}" disabled>${EVT_CTA_ICONS.lock} Full</button>`;
        } else {
          primaryBtn = `<button class="${TW_CTA_BTN} ${TW_CTA_DISABLED}" disabled>${EVT_CTA_ICONS.lock} ${isClosed ? "Closed" : "RSVP Closed"}</button>`;
        }
      }
      if (raffleEnabled) {
        const raffleIncluded = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === "function" ? window.evtIsRaffleBundledWithPaidRsvp(event) : event.pricing_mode === "paid" && rsvpEnabled;
        const memberGoingNav = typeof globalThis.evtIsGoingRsvp === "function" ? window.evtIsGoingRsvp(rsvp) : !!(rsvp && (rsvp.status === "going" || rsvp.paid === true));
        if (!raffleIncluded) {
          const hasPrimary = !!primaryBtn;
          const activeCls = hasPrimary ? TW_CTA_RAFFLE_OUTLINE : TW_CTA_RAFFLE;
          let raffleSlot = "";
          if (myRaffleEntry) {
            raffleSlot = `<button class="${TW_CTA_BTN} ${TW_CTA_RAFFLE_DONE}" disabled>${EVT_CTA_ICONS.check} Entered</button>`;
          } else if (entriesClosed) {
            raffleSlot = `<button class="${TW_CTA_BTN} ${TW_CTA_DISABLED}" disabled>${EVT_CTA_ICONS.lock} Entries Closed</button>`;
          } else if (!memberGoingNav) {
            raffleSlot = raffleLockedCtaBtnHtml();
            ctaFootnote = `<p class="${TW_CTA_FOOTNOTE}">RSVP first to enter the raffle</p>`;
          } else if (event.raffle_entry_cost_cents > 0) {
            raffleSlot = `<button class="${TW_CTA_BTN} ${activeCls}" ${evtDataAction("evtOpenCtaPanel", "raffle", eventId2)}>${EVT_CTA_ICONS.ticket} Raffle \u2014 ${formatCurrency(event.raffle_entry_cost_cents)}</button>`;
          } else {
            raffleSlot = `<button class="${TW_CTA_BTN} ${activeCls}" ${evtDataAction("evtOpenCtaPanel", "raffle", eventId2)}>${EVT_CTA_ICONS.ticket} Enter Raffle</button>`;
          }
          if (hasPrimary) secondaryBtn = raffleSlot;
          else primaryBtn = raffleSlot;
        }
      }
    }
    if (!primaryBtn && !secondaryBtn) return;
    const bar = document.createElement("div");
    bar.id = "evtCtaBar";
    bar.className = TW_CTA_BAR + (ctaFootnote ? " evt-cta-bar-has-footnote" : "");
    bar.innerHTML = `<div id="evtCtaPanel" class="${TW_CTA_PANEL} hidden"></div><div class="${TW_CTA_ACTIONS}">${primaryBtn + secondaryBtn}</div>${ctaFootnote}`;
    document.body.appendChild(bar);
    document.body.classList.add("evt-cta-active");
    const hint = document.querySelector(".bottom-tab-bar .swipe-hint");
    if (hint) hint.style.display = "none";
    if (!window.__evtCtaPanelEscBound) {
      window.__evtCtaPanelEscBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const p = document.getElementById("evtCtaPanel");
        if (p && !p.classList.contains("hidden")) closeCtaPanel();
      });
    }
  }
  globalThis.evtInitBottomNav = initBottomNav;
  globalThis.evtCleanupBottomNav = cleanupBottomNav;
  globalThis.evtOpenCtaPanel = openCtaPanel;
  globalThis.raffleLockedCtaBtnHtml = raffleLockedCtaBtnHtml;

  // js/portal/events/team/sheet.js
  var STATE = {
    eventId: null,
    event: null,
    activeTab: "tools",
    toolsView: "list",
    ctx: {}
  };
  var Shell = window.EventsTeamShell;
  var ToolsList = window.EventsTeamToolsList;
  var Panels = window.EventsTeamPanels;
  function ctxForEvent(eventId2) {
    const ctx = window.__evtTeamToolsCtx || {};
    if (ctx.eventId !== eventId2) return {};
    return ctx;
  }
  function renderToolsTab() {
    const { event, eventId: eventId2, ctx, toolsView } = STATE;
    if (!event || !eventId2) return;
    const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId2];
    Shell.setContentMode("default");
    if (toolsView === "ticket") {
      Shell.renderContent(Panels.ticketHtml(event, rsvp, { variant: "sheet" }));
      Panels.wireTicketQr(event, rsvp);
      return;
    }
    if (toolsView === "raffle") {
      Shell.renderContent(Panels.raffleHtml(event, eventId2, rsvp, { variant: "sheet" }));
      return;
    }
    Shell.renderContent(ToolsList.toolsHtml(
      event,
      eventId2,
      rsvp,
      ctx.myRaffleEntry ?? null,
      !!ctx.entriesClosed,
      !!ctx.eventIsFull,
      { canManageEvent: !!ctx.canManageEvent }
    ));
  }
  function renderTab(tab) {
    const prevTab = STATE.activeTab;
    STATE.activeTab = tab;
    if (tab === "chat") {
      Shell.setContentMode("chat");
      const chat = globalThis.PortalEvents?.team?.chat;
      if (chat?.initTab) chat.initTab(STATE.eventId, STATE.event);
      return;
    }
    if (tab === "tools" && prevTab === "chat") STATE.toolsView = "list";
    Shell.renderTabs();
    renderToolsTab();
  }
  function open2(eventId2, opts = {}) {
    if (!eventId2) return;
    const event = (window.evtAllEvents || globalThis.evtAllEvents).find((e) => e.id === eventId2);
    if (!event) return;
    Shell.ensureMounted();
    STATE.eventId = eventId2;
    STATE.event = event;
    STATE.ctx = ctxForEvent(eventId2);
    STATE.activeTab = Shell.getTabs().some((t) => t.key === opts.tab) ? opts.tab : "tools";
    STATE.toolsView = opts.toolsView || "list";
    Shell.setLoadingChrome();
    Shell.openPanel();
    Shell.renderHeader();
    Shell.renderTabs();
    renderTab(STATE.activeTab);
  }
  function collapseCtaOverlay() {
    const panel = document.getElementById("evtCtaPanel");
    const bar = document.getElementById("evtCtaBar");
    if (panel) {
      panel.classList.add("hidden");
      panel.innerHTML = "";
    }
    if (bar) {
      bar.classList.remove("evt-cta-bar-expanded");
      if (document.body.dataset.evtCtaSheetLocked === "1") {
        document.documentElement.classList.remove("evt-cta-sheet-open");
        document.body.classList.remove("evt-cta-sheet-open");
        const y = parseInt(document.body.style.top || "0", 10) * -1 || 0;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        delete document.body.dataset.evtCtaSheetLocked;
        window.scrollTo(0, y);
      }
    }
  }
  function close() {
    if (typeof globalThis.evtCleanupTeamChat === "function") window.evtCleanupTeamChat();
    Shell.closePanel();
    STATE.eventId = null;
    STATE.event = null;
    STATE.toolsView = "list";
    STATE.activeTab = "tools";
    STATE.ctx = {};
  }
  function closeLegacyCtaPanel() {
    collapseCtaOverlay();
    if (document.getElementById("etSheet")?.classList.contains("et-open")) close();
  }
  function openToolsView(view) {
    if (!["ticket", "raffle"].includes(view)) return;
    STATE.toolsView = view;
    Shell.renderTabs();
    renderToolsTab();
  }
  function backToToolsList() {
    STATE.toolsView = "list";
    Shell.renderTabs();
    renderToolsTab();
  }
  globalThis.EventsTeamShellApi = {
    getState: () => STATE,
    onClose: closeLegacyCtaPanel,
    renderTab
  };
  var eventsTeamApi = { open: open2, close, openToolsView, backToToolsList };
  globalThis.EventsTeam = eventsTeamApi;
  globalThis.evtOpenTeamToolsPanel = (eventId2) => open2(eventId2, { tab: "tools", toolsView: "list" });
  globalThis.evtCloseCtaPanel = closeLegacyCtaPanel;
  globalThis.evtOpenTeamChat = (eventId2) => open2(eventId2, { tab: "chat" });
  var PortalEvents3 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents3.team = PortalEvents3.team || {};
  PortalEvents3.team.open = eventsTeamApi.open;
  PortalEvents3.team.close = eventsTeamApi.close;
  PortalEvents3.team.openToolsView = eventsTeamApi.openToolsView;
  PortalEvents3.team.backToToolsList = eventsTeamApi.backToToolsList;

  // js/portal/events/detail/presentation.js
  function evtMiniMarkdown(text) {
    if (!text) return "";
    let html5 = evtEscapeHtml(text);
    html5 = html5.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html5 = html5.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html5 = html5.replace(/\*(.+?)\*/g, "<em>$1</em>");
    return html5;
  }
  function evtOpenLightbox(imgUrl) {
    if (!imgUrl) return;
    const lb = document.createElement("div");
    lb.className = "evt-lightbox";
    lb.innerHTML = `<button class="evt-lightbox-close" aria-label="Close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button><img src="${imgUrl}" alt="Event banner">`;
    lb.onclick = (e) => {
      if (e.target === lb || e.target.closest(".evt-lightbox-close")) {
        lb.classList.remove("active");
        setTimeout(() => lb.remove(), 250);
      }
    };
    document.body.appendChild(lb);
    requestAnimationFrame(() => lb.classList.add("active"));
  }
  function evtInitSectionAnimations() {
    const sections = document.querySelectorAll("#eventsDetailView .ed-card");
    if (!sections.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("ed-visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    sections.forEach((s, i) => {
      s.style.animationDelay = `${i * 0.06}s`;
      obs.observe(s);
    });
  }
  var _evtCountdownInterval = null;
  function evtStartLiveCountdown(startDate) {
    if (_evtCountdownInterval) clearInterval(_evtCountdownInterval);
    const badgeEl = document.querySelector("#eventsDetailView .evt-status-badge");
    if (!badgeEl) return;
    function tick() {
      const ms = new Date(startDate) - /* @__PURE__ */ new Date();
      if (ms <= 0) {
        badgeEl.className = "evt-status-badge evt-status-live";
        badgeEl.innerHTML = '<span class="evt-status-dot pulse"></span>Live';
        clearInterval(_evtCountdownInterval);
        return;
      }
      const d = Math.floor(ms / 864e5);
      const h = Math.floor(ms % 864e5 / 36e5);
      const m = Math.floor(ms % 36e5 / 6e4);
      const s = Math.floor(ms % 6e4 / 1e3);
      let lbl;
      if (d > 0) lbl = `${d}d ${h}h`;
      else if (h > 0) lbl = `${h}h ${m}m`;
      else lbl = `${m}m ${s}s`;
      badgeEl.innerHTML = `<span class="evt-status-dot${d === 0 ? " pulse" : ""}"></span>${lbl}`;
    }
    const msUntil = new Date(startDate) - /* @__PURE__ */ new Date();
    const interval = msUntil < 36e5 ? 1e3 : 6e4;
    _evtCountdownInterval = setInterval(tick, interval);
    if (interval === 6e4) {
      const upgradeIn = msUntil - 36e5;
      if (upgradeIn > 0) {
        setTimeout(() => {
          clearInterval(_evtCountdownInterval);
          _evtCountdownInterval = setInterval(tick, 1e3);
        }, upgradeIn);
      }
    }
  }
  var detailPresentationApi = {
    miniMarkdown: evtMiniMarkdown,
    openLightbox: evtOpenLightbox,
    initSectionAnimations: evtInitSectionAnimations,
    startLiveCountdown: evtStartLiveCountdown
  };
  globalThis.evtMiniMarkdown = evtMiniMarkdown;
  globalThis.evtOpenLightbox = evtOpenLightbox;
  globalThis.evtInitSectionAnimations = evtInitSectionAnimations;
  globalThis.evtStartLiveCountdown = evtStartLiveCountdown;
  var PortalEvents4 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents4.detail = PortalEvents4.detail || {};
  PortalEvents4.detail.presentation = detailPresentationApi;

  // js/portal/events/detail/raffle-render.js
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
    if (drawMode === "random_item") return "Random prize assigned";
    if (drawMode === "winner_choice") return "Winner chooses from this tier";
    return "Drawing specific prizes";
  }
  function evtDetailPrizeMedia(item) {
    if (item?.image_url) return `<img src="${evtEscapeHtml(item.image_url)}" alt="" loading="lazy">`;
    return `<span>${evtEscapeHtml(item?.emoji || window.EventsRaffleModel?.DEFAULT_EMOJI || "\u{1F381}")}</span>`;
  }
  function evtDetailRafflePrizeItems(config) {
    return evtDetailRaffleCategories(config).flatMap((category) => evtDetailRaffleItems(config, category.id));
  }
  function evtDetailRafflePrizesHtml(event) {
    const config = evtDetailRaffleConfig(event);
    const items = evtDetailRafflePrizeItems(config);
    if (!items.length) return "";
    return `<div class="ed-raffle-prize-rail">${items.map((item) => `
    <article class="ed-raffle-prize-tile" title="${evtEscapeHtml(item.name)}">
        <div class="ed-raffle-prize-media">${evtDetailPrizeMedia(item)}</div>
        <p>${evtEscapeHtml(item.name)}</p>
    </article>
`).join("")}</div>`;
  }
  function evtDetailRaffleWinnersHtml(winners) {
    if (!winners.length) return "";
    const rows = winners.map((w) => {
      const initials = w.profiles ? `${w.profiles.first_name?.[0] || ""}${w.profiles.last_name?.[0] || ""}`.toUpperCase() : "";
      const avatar = w.profiles?.profile_picture_url ? `<img src="${evtEscapeHtml(w.profiles.profile_picture_url)}" alt="" loading="lazy">` : `<span>${evtEscapeHtml(initials || (w.guest_token ? "G" : "W"))}</span>`;
      const prize = w.selection_status === "pending_choice" ? "Choosing later" : w.prize_description || "Prize pending";
      const emoji = evtEscapeHtml(w.prize_emoji || "\u{1F381}");
      return `<article class="ed-winner-card">
        <div class="ed-winner-avatar">${avatar}<b>${w.place}</b></div>
        <div class="ed-winner-copy"><span>${emoji}</span><p>${evtEscapeHtml(prize)}</p></div>
    </article>`;
    }).join("");
    return `<div class="ed-winners ed-winners-compact">${_raffleSectionHead("Winners")}<div class="ed-winner-rail">${rows}</div></div>`;
  }
  function evtRaffleLockedDesktopHtml(eventId2, showTeamHint) {
    const mobileHint = showTeamHint ? `<p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the RSVP button in the bar below, or open <button type="button" class="ed-link-btn" ${evtDataAction("evtOpenTeamToolsPanel", eventId2)}>Team</button> to RSVP as yourself.</p>` : `<p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the RSVP button in the sticky bar below, then enter the raffle.</p>`;
    return `<div class="ed-raffle-desktop-action ed-raffle-locked-block">
    <button type="button" class="ed-raffle-btn ed-raffle-btn-locked" disabled aria-disabled="true">\u{1F39F}\uFE0F Enter Raffle</button>
    <p class="ed-raffle-locked-hint">RSVP first to enter the raffle</p>
</div>${mobileHint}`;
  }
  var detailRaffleRenderApi = {
    config: evtDetailRaffleConfig,
    categories: evtDetailRaffleCategories,
    items: evtDetailRaffleItems,
    winnerCount: evtDetailRaffleWinnerCount,
    drawModeLabel: evtDetailDrawModeLabel,
    prizesHtml: evtDetailRafflePrizesHtml,
    winnersHtml: evtDetailRaffleWinnersHtml,
    lockedDesktopHtml: evtRaffleLockedDesktopHtml
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
  var PortalEvents5 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents5.detail = PortalEvents5.detail || {};
  PortalEvents5.detail.raffleRender = detailRaffleRenderApi;

  // js/portal/events/detail/map-overlay.js
  var _fullscreenMap = null;
  var _fullscreenMapCoords = null;
  async function evtOpenFullscreenMap(lat, lng, label) {
    const overlay = document.getElementById("fullscreenMapOverlay");
    if (!overlay) return;
    try {
      if (typeof globalThis.evtEnsureLeaflet === "function") await window.evtEnsureLeaflet();
    } catch (err) {
      console.error("Leaflet load error:", err);
      return;
    }
    if (typeof L === "undefined") return;
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const dirBtn = document.getElementById("fullscreenMapDirections");
    if (dirBtn) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const addr = encodeURIComponent(label || `${lat},${lng}`);
      dirBtn.href = isIOS ? `https://maps.apple.com/?daddr=${addr}` : `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
    }
    setTimeout(() => {
      _fullscreenMapCoords = { lat, lng };
      if (_fullscreenMap) {
        _fullscreenMap.remove();
        _fullscreenMap = null;
      }
      _fullscreenMap = L.map("fullscreenMapContainer", {
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true
      }).setView([lat, lng], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(_fullscreenMap);
      L.marker([lat, lng]).addTo(_fullscreenMap).bindPopup(evtEscapeHtml(label || "Event Location")).openPopup();
      setTimeout(() => _fullscreenMap.invalidateSize(), 50);
    }, 50);
  }
  function evtRecenterFullscreenMap() {
    if (!_fullscreenMap || !_fullscreenMapCoords) return;
    _fullscreenMap.setView([_fullscreenMapCoords.lat, _fullscreenMapCoords.lng], 16, { animate: true, duration: 0.5 });
  }
  function evtCloseFullscreenMap() {
    const overlay = document.getElementById("fullscreenMapOverlay");
    if (overlay) overlay.classList.add("hidden");
    if (_fullscreenMap) {
      _fullscreenMap.remove();
      _fullscreenMap = null;
    }
    document.body.style.overflow = "";
  }
  var detailMapOverlayApi = {
    open: evtOpenFullscreenMap,
    recenter: evtRecenterFullscreenMap,
    close: evtCloseFullscreenMap
  };
  globalThis.evtOpenFullscreenMap = evtOpenFullscreenMap;
  globalThis.evtRecenterFullscreenMap = evtRecenterFullscreenMap;
  globalThis.evtCloseFullscreenMap = evtCloseFullscreenMap;
  var PortalEvents6 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents6.detail = PortalEvents6.detail || {};
  PortalEvents6.detail.mapOverlay = detailMapOverlayApi;

  // js/portal/events/detail/fragments.js
  function metaRow(icon, label, value, extra) {
    return `<div class="ed-meta-row">
    <div class="ed-meta-icon">${icon}</div>
    <div class="ed-meta-text">
        <span class="ed-meta-label">${label}</span>
        <span class="ed-meta-value">${value}</span>
        ${extra || ""}
    </div>
</div>`;
  }
  function pill(text, cls) {
    return `<span class="ed-pill ${cls || ""}">${text}</span>`;
  }
  function card(content, extraCls) {
    return `<div class="ed-card ${extraCls || ""}">${content}</div>`;
  }
  function notice(emoji, title, sub) {
    return `<div class="ed-notice">
    <span class="ed-notice-emoji">${emoji}</span>
    <div><p class="ed-notice-title">${title}</p><p class="ed-notice-sub">${sub}</p></div>
</div>`;
  }
  function sectionHead(title) {
    return `<div class="ed-section-head"><h3>${title}</h3></div>`;
  }
  var detailFragmentsApi = {
    metaRow,
    pill,
    card,
    notice,
    sectionHead
  };
  globalThis.evtEdMetaRow = metaRow;
  globalThis.evtEdPill = pill;
  globalThis.evtEdCard = card;
  globalThis.evtEdNotice = notice;
  globalThis.evtEdSectionHead = sectionHead;
  var PortalEvents7 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents7.detail = PortalEvents7.detail || {};
  PortalEvents7.detail.fragments = detailFragmentsApi;

  // js/portal/events/detail/data.js
  async function evtLoadDetailContext(eventId2) {
    const events = window.evtAllEvents || globalThis.evtAllEvents;
    const rsvpMap = window.evtAllRsvps || globalThis.evtAllRsvps;
    const event = events.find((e) => e.id === eventId2);
    if (!event) return null;
    const rsvp = rsvpMap[eventId2];
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : null;
    const dateStr = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const endTimeStr = end ? end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
    const typeColors = window.EventsConstants && window.EventsConstants.TYPE_COLORS_PORTAL || {};
    const tc = typeColors[event.event_type] || typeColors.member;
    const isLlc = event.event_type === "llc";
    const isComp = event.event_type === "competition";
    const [{ data: rsvps }, { data: guestRsvps }] = await Promise.all([
      supabaseClient.from("event_rsvps").select("user_id, status, paid, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url)").eq("event_id", eventId2),
      supabaseClient.from("event_guest_rsvps").select("id, guest_name, guest_email, status, paid").eq("event_id", eventId2)
    ]);
    const goingList = (rsvps || []).filter((r) => typeof globalThis.evtIsGoingRsvp === "function" ? window.evtIsGoingRsvp(r) : r.status === "going" || r.paid === true);
    const maybeList = (rsvps || []).filter((r) => r.status === "maybe");
    const notGoingList = (rsvps || []).filter((r) => r.status === "not_going");
    const guestGoingList = (guestRsvps || []).filter((g2) => g2.status === "going" || g2.paid === true);
    const { data: checkins, count: checkinCount } = await supabaseClient.from("event_checkins").select("user_id, profiles!event_checkins_user_id_fkey(first_name, last_name, profile_picture_url)", { count: "exact" }).eq("event_id", eventId2);
    let costItems = [];
    if (isLlc) {
      const { data: ci } = await supabaseClient.from("event_cost_items").select("*").eq("event_id", eventId2).order("sort_order", { ascending: true });
      costItems = ci || [];
    }
    let waitlist = [];
    let myWaitlistEntry = null;
    if (isLlc) {
      const { data: wl } = await supabaseClient.from("event_waitlist").select("*, profiles:user_id(first_name, last_name)").eq("event_id", eventId2).order("position", { ascending: true });
      waitlist = wl || [];
      myWaitlistEntry = waitlist.find((w) => w.user_id === globalThis.evtCurrentUser.id);
    }
    let raffleEntryCount = 0;
    let myRaffleEntry = null;
    let raffleWinners = [];
    if (event.raffle_enabled) {
      const { count: rCount } = await supabaseClient.from("event_raffle_entries").select("id", { count: "exact", head: true }).eq("event_id", eventId2);
      raffleEntryCount = rCount || 0;
      const { data: myEntry } = await supabaseClient.from("event_raffle_entries").select("*").eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id).maybeSingle();
      myRaffleEntry = myEntry;
      const { data: winners } = await supabaseClient.from("event_raffle_winners").select("*, profiles:user_id(first_name, last_name, profile_picture_url)").eq("event_id", eventId2).order("place", { ascending: true });
      raffleWinners = winners || [];
    }
    const isCreator = event.created_by === globalThis.evtCurrentUser.id;
    const { data: hostRecord } = await supabaseClient.from("event_hosts").select("id").eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id).maybeSingle();
    const canManageEvent = isCreator || !!hostRecord || typeof canManageEvents === "function" && canManageEvents();
    const canAccessTeamHub = canManageEvent || typeof canAccessAdminDashboard === "function" && canAccessAdminDashboard();
    const isHost = canManageEvent;
    const canCreateTeamChat2 = isCreator || typeof canManageEvents === "function" && canManageEvents();
    let creatorProfile = event.creator && event.creator.id ? { ...event.creator } : null;
    if (event.created_by) {
      const { data: cp } = await supabaseClient.from("profiles").select("id, first_name, last_name, profile_picture_url, displayed_badge, title, bio").eq("id", event.created_by).maybeSingle();
      if (cp) creatorProfile = { ...creatorProfile || {}, ...cp };
      else if (!creatorProfile) {
        creatorProfile = {
          id: event.created_by,
          first_name: "",
          last_name: "",
          profile_picture_url: null,
          displayed_badge: null,
          title: "Member",
          bio: null
        };
      }
    }
    const cpName = creatorProfile ? [creatorProfile.first_name, creatorProfile.last_name].filter(Boolean).join(" ") || "Member" : "";
    const cpInitials = creatorProfile ? ((creatorProfile.first_name || "?")[0] + (creatorProfile.last_name || "")[0]).toUpperCase() : "";
    const cpBadge = creatorProfile ? evtBadgeChip(creatorProfile.displayed_badge) : "";
    const cpTitle = creatorProfile ? creatorProfile.title || "Member" : "";
    const memberGoing2 = typeof globalThis.evtIsGoingRsvp === "function" ? window.evtIsGoingRsvp(rsvp) : !!(rsvp && (rsvp.status === "going" || rsvp.paid === true));
    const hasRsvp = rsvp && (memberGoing2 || rsvp.status === "maybe");
    let memberPhone = null;
    let eventSmsRecipient = null;
    const { data: memberProfile } = await supabaseClient.from("profiles").select("phone").eq("id", globalThis.evtCurrentUser.id).maybeSingle();
    memberPhone = (memberProfile?.phone || "").trim() || null;
    if (memberPhone) {
      const { data: smsRec } = await supabaseClient.from("event_sms_recipients").select("id, opted_in, opted_out_at").eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id).maybeSingle();
      eventSmsRecipient = smsRec;
    }
    const documentsHtml = await evtBuildDocumentsHtml(event, isHost, hasRsvp);
    const mapHtml = evtBuildMapHtml(event, hasRsvp, isHost);
    const competitionHtml = isComp ? await evtBuildCompetitionHtml(event, isHost) : "";
    const scrapbookHtml = await evtBuildScrapbookHtml(event, !!hasRsvp);
    const showTime = !event.gate_time || hasRsvp || isHost;
    const showLocation = !event.gate_location || hasRsvp || isHost;
    const showNotes = !event.gate_notes || hasRsvp || isHost;
    const isClosed = event.status === "completed" || event.status === "cancelled";
    const isPast = new Date(event.start_date) < /* @__PURE__ */ new Date() && event.status !== "active";
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < /* @__PURE__ */ new Date();
    const entriesClosed = isClosed || isPast || deadlinePassed;
    const rsvpEnabled = event.rsvp_enabled !== false;
    const canRsvp = rsvpEnabled && ["open", "confirmed", "active"].includes(event.status) && !entriesClosed;
    const eventIsFull = isLlc && event.max_participants && goingList.length >= event.max_participants;
    return {
      eventId: eventId2,
      event,
      rsvp,
      start,
      dateStr,
      timeStr,
      endTimeStr,
      tc,
      isLlc,
      isComp,
      goingList,
      maybeList,
      notGoingList,
      guestGoingList,
      checkins,
      checkinCount,
      costItems,
      waitlist,
      myWaitlistEntry,
      raffleEntryCount,
      myRaffleEntry,
      raffleWinners,
      isCreator,
      canManageEvent,
      canAccessTeamHub,
      isHost,
      canCreateTeamChat: canCreateTeamChat2,
      creatorProfile,
      cpName,
      cpInitials,
      cpBadge,
      cpTitle,
      memberGoing: memberGoing2,
      hasRsvp,
      documentsHtml,
      mapHtml,
      competitionHtml,
      scrapbookHtml,
      showTime,
      showLocation,
      showNotes,
      isClosed,
      isPast,
      deadlinePassed,
      entriesClosed,
      rsvpEnabled,
      canRsvp,
      eventIsFull,
      memberPhone,
      eventSmsRecipient
    };
  }
  globalThis.evtLoadDetailContext = evtLoadDetailContext;
  var detailDataApi = {
    loadContext: evtLoadDetailContext
  };
  var PortalEvents8 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents8.detail = PortalEvents8.detail || {};
  PortalEvents8.detail.data = detailDataApi;

  // js/portal/events/detail/sections.js
  var _edPill = window.evtEdPill;
  var _edNotice = window.evtEdNotice;
  var _edSectionHead = window.evtEdSectionHead;
  function evtBuildDetailSmsOptInHtml(ctx) {
    const { eventId: eventId2, isHost, memberPhone, memberGoing: memberGoing2, canRsvp, rsvpEnabled, eventSmsRecipient } = ctx;
    if (isHost || !memberPhone) return "";
    if (!rsvpEnabled || !memberGoing2 && !canRsvp) return "";
    const checked = !!(eventSmsRecipient?.opted_in && !eventSmsRecipient?.opted_out_at);
    return `
        <label class="ed-checkbox-label" style="display:flex;gap:10px;align-items:flex-start;margin-top:12px">
            <input type="checkbox" id="evtSmsOptInCheck" ${checked ? "checked" : ""}
                onchange="evtHandleEventSmsOptIn('${eventId2}', this.checked)">
            <span class="ed-hint" style="margin:0">Text me event updates for this event. Message/data rates may apply. Reply STOP to opt out.</span>
        </label>`;
  }
  function evtBuildDetailRsvpSectionHtml(ctx) {
    const {
      eventId: eventId2,
      event,
      rsvp,
      isHost,
      canAccessTeamHub,
      rsvpEnabled,
      canRsvp,
      eventIsFull,
      entriesClosed,
      isClosed,
      isPast,
      deadlinePassed
    } = ctx;
    let rsvpButtons = "";
    if (!rsvpEnabled) {
      rsvpButtons = _edNotice("\u2139\uFE0F", "Informational Event", "RSVP is not required for this event");
    } else if (isHost) {
      const teamBtnHtml = canAccessTeamHub ? `<button type="button" ${evtDataAction("evtOpenTeamToolsPanel", eventId2)} class="ed-outline-btn" aria-label="Open event team tools">Team</button>` : "";
      rsvpButtons = `
        <div class="ed-rsvp-confirmed">
            <div class="ed-rsvp-confirmed-row">
                <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                <div><span class="ed-rsvp-confirmed-title">You're hosting!</span><span class="ed-rsvp-confirmed-sub">You're automatically counted as attending.</span></div>
            </div>
        </div>
        <div class="ed-rsvp-host-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
            ${teamBtnHtml}
            <button type="button" onclick="window.EventsManage ? window.EventsManage.open('${eventId2}',{source:'portal'}) : (window.location='../admin/events.html?id=${eventId2}')" class="ed-outline-btn">Manage Event</button>
        </div>
        ${canAccessTeamHub ? '<p class="ed-hint">Use <strong>Team</strong> for RSVP as yourself, raffle entry, and your ticket.</p>' : ""}`;
    } else if (canRsvp && !eventIsFull && event.pricing_mode === "paid") {
      if (rsvp?.paid) {
        rsvpButtons = `
            <div class="ed-rsvp-confirmed">
                <div class="ed-rsvp-confirmed-row">
                    <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                    <div><span class="ed-rsvp-confirmed-title">You're going!</span><span class="ed-rsvp-confirmed-sub">Non-refundable \xB7 Contact admin for changes</span></div>
                </div>
            </div>`;
      } else {
        rsvpButtons = `
            <button ${evtDataAction("evtHandleRsvp", eventId2, "going")} class="ed-primary-btn">RSVP \u2014 ${formatCurrency(event.rsvp_cost_cents)}</button>
            <button ${evtDataAction("evtMessageHost", eventId2)} class="ed-outline-btn">Message Host</button>
            <p class="ed-hint">Non-refundable unless cancelled by staff${event.raffle_enabled ? " \xB7 Includes raffle entry" : ""}</p>`;
      }
    } else if (canRsvp && !eventIsFull) {
      if (rsvp?.status === "going") {
        rsvpButtons = `
            <div class="ed-rsvp-confirmed">
                <div class="ed-rsvp-confirmed-row">
                    <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                    <div><span class="ed-rsvp-confirmed-title">You're going!</span><span class="ed-rsvp-confirmed-sub">We'll see you there.</span></div>
                </div>
            </div>
            <button ${evtDataAction("evtHandleRsvp", eventId2, "going")} class="ed-outline-btn">Update RSVP</button>`;
      } else {
        const interestedActive = rsvp?.status === "maybe" ? " active" : "";
        rsvpButtons = `
            <button ${evtDataAction("evtHandleRsvp", eventId2, "going")} class="ed-primary-btn">RSVP</button>
            <button ${evtDataAction("evtMessageHost", eventId2)} class="ed-outline-btn">Message Host</button>
            <div class="ed-rsvp-secondary">
                <button ${evtDataAction("evtHandleRsvp", eventId2, "maybe")} class="ed-rsvp-sm${interestedActive ? " active" : ""}">\u2764\uFE0F Interested</button>
            </div>`;
      }
    }
    if (rsvpEnabled && !isHost && entriesClosed && !rsvpButtons) {
      let closedReason = "";
      if (isClosed) closedReason = event.status === "cancelled" ? "Event cancelled" : "Event ended";
      else if (isPast) closedReason = "Event has already started";
      else if (deadlinePassed) closedReason = "RSVP deadline passed";
      if (rsvp) {
        const statusEmoji = rsvp.status === "going" ? "\u2705" : rsvp.status === "maybe" ? "\u2764\uFE0F" : "\u274C";
        const statusLabel = rsvp.status === "going" ? "Going" : rsvp.status === "maybe" ? "Interested" : "Not Going";
        rsvpButtons = _edNotice(statusEmoji, `Your RSVP: ${statusLabel}`, closedReason);
      } else {
        rsvpButtons = _edNotice("\u{1F512}", "RSVP Closed", closedReason);
      }
    }
    const smsOptInHtml = evtBuildDetailSmsOptInHtml(ctx);
    return rsvpButtons + smsOptInHtml;
  }
  function evtBuildDetailRaffleSectionHtml(ctx) {
    const {
      eventId: eventId2,
      event,
      rsvp,
      myRaffleEntry,
      raffleEntryCount,
      raffleWinners,
      memberGoing: memberGoing2,
      isHost,
      canAccessTeamHub,
      rsvpEnabled,
      entriesClosed,
      isClosed,
      isPast,
      deadlinePassed
    } = ctx;
    if (!event.raffle_enabled) return "";
    const raffleConfig2 = window.evtDetailRaffleConfig(event);
    const prizeCount = window.evtDetailRaffleWinnerCount(raffleConfig2, event);
    const prizesHtml = window.evtDetailRafflePrizesHtml(event);
    let entryStatusHtml = "";
    const hasRaffleRsvp = memberGoing2;
    const raffleBundled = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === "function" ? window.evtIsRaffleBundledWithPaidRsvp(event) : event.pricing_mode === "paid" && rsvpEnabled;
    if (myRaffleEntry) {
      entryStatusHtml = `<div class="ed-raffle-entry-chip">\u{1F39F}\uFE0F Entered</div>`;
    } else if (entriesClosed && !myRaffleEntry) {
      let lockedReason = "";
      if (isClosed) lockedReason = event.status === "cancelled" ? "Event cancelled" : "Event ended";
      else if (isPast) lockedReason = "Event in progress";
      else if (deadlinePassed) lockedReason = "RSVP deadline passed";
      entryStatusHtml = `<div class="ed-notice"><span class="ed-notice-emoji">\u{1F512}</span><div><p class="ed-notice-title">Entries Closed</p><p class="ed-notice-sub">${lockedReason}</p></div></div>`;
    } else if (raffleBundled && !rsvp?.paid) {
      entryStatusHtml = `<p class="ed-hint" style="font-style:italic">Raffle entry included with paid RSVP</p>`;
    } else if (!hasRaffleRsvp) {
      entryStatusHtml = window.evtRaffleLockedDesktopHtml(eventId2, isHost && canAccessTeamHub);
    } else if (event.raffle_entry_cost_cents > 0 && !entriesClosed) {
      entryStatusHtml = `<div class="ed-raffle-desktop-action"><button ${evtDataAction("evtHandleRaffleEntry", eventId2)} class="ed-raffle-btn">\u{1F39F}\uFE0F Buy Raffle Entry \u2014 ${formatCurrency(event.raffle_entry_cost_cents)}</button><p class="ed-hint">Non-refundable raffle ticket</p></div><p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the sticky CTA below to enter the raffle.</p>`;
    } else if ((!event.raffle_entry_cost_cents || event.raffle_entry_cost_cents === 0) && !entriesClosed) {
      entryStatusHtml = `<div class="ed-raffle-desktop-action"><button ${evtDataAction("evtHandleFreeRaffleEntry", eventId2)} class="ed-raffle-btn">\u{1F39F}\uFE0F Enter Raffle \u2014 Free</button></div><p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the sticky CTA below to enter the raffle.</p>`;
    }
    let winnersHtml = "";
    if (raffleWinners.length > 0) {
      winnersHtml = window.evtDetailRaffleWinnersHtml(raffleWinners);
    }
    const rafflePills = [
      event.pricing_mode !== "paid" && event.raffle_entry_cost_cents > 0 ? _edPill(`\u{1F39F}\uFE0F Entry: ${formatCurrency(event.raffle_entry_cost_cents)}`) : "",
      event.pricing_mode === "paid" ? _edPill("\u2705 Included with RSVP") : "",
      !event.raffle_entry_cost_cents && event.pricing_mode !== "paid" ? _edPill("\u{1F39F}\uFE0F Free entry") : ""
    ].filter(Boolean).join("");
    return `
        <div class="ed-raffle-compact">
            <div class="ed-raffle-compact-head">
                <div>${_edSectionHead("Raffle")}<div class="ed-raffle-compact-info-row"><p>${raffleEntryCount} ${raffleEntryCount === 1 ? "entry" : "entries"}${prizeCount ? ` \xB7 ${prizeCount} ${prizeCount === 1 ? "winner" : "winners"}` : ""}</p>${rafflePills}</div></div>
            </div>
            <div class="ed-raffle-content-grid">
                ${prizesHtml ? `<div class="ed-raffle-panel">${_edSectionHead("Prizes")}${prizesHtml}</div>` : `<p class="ed-hint" style="font-style:italic">Prizes to be announced</p>`}
                ${winnersHtml ? `<div class="ed-raffle-panel">${winnersHtml}</div>` : ""}
            </div>
            ${entryStatusHtml ? `<div class="ed-raffle-entry-status">${entryStatusHtml}</div>` : ""}
        </div>`;
  }
  function evtBuildDetailHostControlsHtml(ctx) {
    const { eventId: eventId2, event, isHost, isLlc } = ctx;
    if (!isHost) return "";
    let primaryBtn = "";
    let dropdownItems = "";
    if (event.status === "draft") primaryBtn = `<button ${evtDataAction("evtUpdateStatus", eventId2, "open")} class="evt-host-btn primary">Publish Event</button>`;
    if (["open", "confirmed", "active"].includes(event.status)) {
      if (!primaryBtn) primaryBtn = `<button ${evtDataAction("evtUpdateStatus", eventId2, "completed")} class="evt-host-btn primary">Mark Completed</button>`;
      else dropdownItems += `<button ${evtDataAction("evtUpdateStatus", eventId2, "completed")}>\u2713 Mark Completed</button>`;
      dropdownItems += `<button ${evtDataAction("evtCancelEvent", eventId2)} class="danger">\u2715 Cancel Event</button>`;
      if (isLlc) dropdownItems += `<button ${evtDataAction("evtRescheduleEvent", eventId2)}>\u{1F4C5} Reschedule</button>`;
    }
    dropdownItems += `<button ${evtDataAction("evtDuplicateEvent", eventId2)}>\u{1F4CB} Duplicate Event</button>`;
    if (typeof canManageEvents === "function" && canManageEvents()) dropdownItems += `<button ${evtDataAction("evtDeleteEvent", eventId2)} class="danger">\u{1F5D1} Delete Event</button>`;
    const manageOnClick = `if(window.EventsManage){window.EventsManage.open('${eventId2}',{source:'portal'})}else{this.nextElementSibling.classList.toggle('open')}`;
    return `
        ${_edSectionHead("Host Controls")}
        <div class="evt-host-primary">${primaryBtn}<div class="evt-host-more-wrap"><button class="evt-host-more-btn" onclick="${manageOnClick}" aria-label="Manage event"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;margin-right:6px"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Manage event</button><div class="evt-host-dropdown">${dropdownItems}</div></div></div>`;
  }
  function evtBuildDetailWaitlistHtml(ctx) {
    const {
      eventId: eventId2,
      event,
      rsvp,
      isLlc,
      goingList,
      waitlist,
      myWaitlistEntry
    } = ctx;
    if (!isLlc || !event.max_participants) return "";
    const isFull = goingList.length >= event.max_participants;
    const canRsvpWl = ["open", "confirmed", "active"].includes(event.status);
    const activeWaitlist = waitlist.filter((w) => ["waiting", "offered"].includes(w.status));
    if (!isFull || !canRsvpWl) return "";
    const hasOffer = myWaitlistEntry?.status === "offered" && myWaitlistEntry.offer_expires_at && new Date(myWaitlistEntry.offer_expires_at) > /* @__PURE__ */ new Date();
    const isWaiting = myWaitlistEntry?.status === "waiting";
    let waitlistAction = "";
    if (hasOffer) {
      const expiresStr = new Date(myWaitlistEntry.offer_expires_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      waitlistAction = `
                <div class="ed-notice ed-notice-highlight">
                    <span class="ed-notice-emoji">\u{1F389}</span>
                    <div style="flex:1">
                        <p class="ed-notice-title">A spot opened up for you!</p>
                        <p class="ed-notice-sub">Complete your RSVP by ${expiresStr}</p>
                        <button ${evtDataAction("evtClaimWaitlistSpot", eventId2)} class="ed-primary-btn" style="margin-top:10px">Claim Spot \u2014 ${formatCurrency(event.rsvp_cost_cents)}</button>
                    </div>
                </div>`;
    } else if (isWaiting) {
      const pos = activeWaitlist.findIndex((w) => w.user_id === globalThis.evtCurrentUser.id) + 1;
      waitlistAction = `
                <div class="ed-notice" style="justify-content:space-between">
                    <div><p class="ed-notice-title">You're #${pos} on the waitlist</p><p class="ed-notice-sub">We'll notify you if a spot opens</p></div>
                    <button ${evtDataAction("evtLeaveWaitlist", eventId2)} class="ed-link-btn danger">Leave</button>
                </div>`;
    } else if (!rsvp?.paid) {
      waitlistAction = `<button ${evtDataAction("evtJoinWaitlist", eventId2)} class="ed-action-btn">Join Waitlist</button>
                <p class="ed-hint">No payment required to join the waitlist</p>`;
    }
    return `${_edSectionHead("Waitlist")}<p class="ed-sub-count">${activeWaitlist.length} waiting</p>${waitlistAction}`;
  }
  function evtBuildDetailGraceNoticeHtml(ctx) {
    const { eventId: eventId2, event, rsvp } = ctx;
    if (!event.rescheduled_at || !event.grace_window_end || new Date(event.grace_window_end) <= /* @__PURE__ */ new Date()) {
      return "";
    }
    const graceEnd = new Date(event.grace_window_end).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return `<div class="ed-notice ed-notice-warn">
        <span class="ed-notice-emoji">\u{1F4C5}</span>
        <div>
            <p class="ed-notice-title">This event was rescheduled</p>
            <p class="ed-notice-sub">Request a full refund until <strong>${graceEnd}</strong> if the new date doesn't work.</p>
            ${rsvp?.paid ? `<button ${evtDataAction("evtRequestGraceRefund", eventId2)} class="ed-link-btn danger" style="margin-top:8px">Request Full Refund</button>` : ""}
        </div>
    </div>`;
  }
  function evtBuildDetailCostBreakdownHtml(ctx) {
    const { event, isLlc, isHost, costItems } = ctx;
    const showBreakdownToAttendees = event.show_cost_breakdown !== false;
    if (!isLlc || costItems.length === 0 || !(showBreakdownToAttendees || isHost)) {
      return "";
    }
    const CATEGORY_ICONS = { lodging: "\u{1F3E0}", transportation: "\u{1F697}", food: "\u{1F355}", gear: "\u{1F3BF}", entertainment: "\u{1F3AD}", other: "\u{1F4E6}" };
    const included = costItems.filter((i) => i.included_in_buyin);
    const oop = costItems.filter((i) => !i.included_in_buyin);
    const totalIncluded = included.reduce((s, i) => s + (i.total_cost_cents || 0), 0);
    const totalOop = oop.reduce((s, i) => s + (i.avg_per_person_cents || 0), 0);
    const minP = event.min_participants || event.max_participants || 0;
    const baseBuyIn = minP > 0 ? Math.ceil(totalIncluded / minP) : 0;
    const llcCut = Math.round(baseBuyIn * (event.llc_cut_pct || 0) / 100);
    const finalBuyIn = baseBuyIn + llcCut;
    const lockedLabel = event.cost_breakdown_locked ? ` ${_edPill("\u{1F512} Locked", "ed-pill-muted")}` : "";
    const hostOnlyLabel = !showBreakdownToAttendees ? ` ${_edPill("Host Only", "ed-pill-muted")}` : "";
    const itemRows = costItems.map((i) => `
        <div class="ed-cost-item">
            <div class="ed-cost-item-left"><span class="ed-cost-item-icon">${CATEGORY_ICONS[i.category] || "\u{1F4E6}"}</span><span>${evtEscapeHtml(i.name)}</span></div>
            <div class="ed-cost-item-right">
                ${i.included_in_buyin ? `<span class="ed-cost-item-amount">${formatCurrency(i.total_cost_cents)}</span>${_edPill("INCLUDED", "ed-pill-green")}` : `<span class="ed-cost-item-amount" style="color:#8b8b8b">~${formatCurrency(i.avg_per_person_cents)}/pp</span>${_edPill("OOP", "ed-pill-muted")}`}
            </div>
        </div>`).join("");
    return `
        ${_edSectionHead(`Cost Breakdown${lockedLabel}${hostOnlyLabel}`)}
        <div class="ed-cost-list">${itemRows}</div>
        <div class="ed-cost-summary">
            <div class="ed-cost-line"><span>Total Included</span><span>${formatCurrency(totalIncluded)}</span></div>
            <div class="ed-cost-line"><span>Min Participants</span><span>${minP}</span></div>
            <div class="ed-cost-divider"></div>
            <div class="ed-cost-line ed-cost-line-bold"><span>\u{1F4A1} Suggested Buy-In</span><span>${formatCurrency(finalBuyIn)}/person</span></div>
            <div class="ed-cost-line ed-cost-line-bold"><span>\u{1F4B3} Actual RSVP</span><span>${formatCurrency(event.rsvp_cost_cents)}/person</span></div>
            ${event.llc_cut_pct > 0 ? `<div class="ed-cost-line ed-cost-line-muted"><span>Includes ${event.llc_cut_pct}% LLC contribution</span><span>+${formatCurrency(llcCut)}</span></div>` : ""}
            <div class="ed-cost-line"><span>\u2708 Est. Out-of-Pocket</span><span>~${formatCurrency(totalOop)}/person</span></div>
            <div class="ed-cost-divider thick"></div>
            <div class="ed-cost-line ed-cost-total"><span>\u{1F4B0} Est. Total/Person</span><span>~${formatCurrency((event.rsvp_cost_cents || finalBuyIn) + totalOop)}</span></div>
        </div>`;
  }
  function evtBuildDetailHeroStatusBadgeHtml(ctx) {
    const { event, isPast } = ctx;
    let badgeLabel = "";
    let badgeCls = "";
    let dotPulse = false;
    if (event.status === "cancelled") {
      badgeLabel = "Cancelled";
      badgeCls = "evt-status-cancelled";
    } else if (event.status === "completed" || isPast) {
      badgeLabel = "Ended";
      badgeCls = "evt-status-ended";
    } else if (event.status === "active") {
      badgeLabel = "Live";
      badgeCls = "evt-status-live";
      dotPulse = true;
    } else {
      const msUntil = new Date(event.start_date) - /* @__PURE__ */ new Date();
      const d = Math.floor(msUntil / 864e5);
      const h = Math.floor(msUntil % 864e5 / 36e5);
      const m = Math.floor(msUntil % 36e5 / 6e4);
      if (d > 0) badgeLabel = `${d}d ${h}h`;
      else if (h > 0) badgeLabel = `${h}h ${m}m`;
      else badgeLabel = `${m}m`;
      badgeCls = "evt-status-soon";
      dotPulse = d === 0;
    }
    return `<span class="evt-status-badge ${badgeCls}"><span class="evt-status-dot${dotPulse ? " pulse" : ""}"></span>${badgeLabel}</span>`;
  }
  function evtBuildDetailTransportNoticeHtml(ctx) {
    const { event, isLlc } = ctx;
    if (!isLlc || event.transportation_enabled === false || !event.transportation_mode) {
      return "";
    }
    const isProvided = event.transportation_mode === "llc_provides";
    return `<div class="ed-context-row"><span>${isProvided ? "\u2708\uFE0F" : "\u{1F9F3}"}</span><div><strong>${isProvided ? "LLC provides transportation" : "Self-arranged transportation"}</strong><p>${isProvided ? "Tickets will appear in documents when available." : `Members book their own travel${event.transportation_estimate_cents ? ` \u2014 est. ~${formatCurrency(event.transportation_estimate_cents)}` : ""}.`}</p></div></div>`;
  }
  function evtBuildDetailLocationNoticeHtml(ctx) {
    const { event, isLlc } = ctx;
    if (!isLlc || !event.location_required) {
      return "";
    }
    return _edNotice("\u{1F4CD}", "Location sharing required", "You'll need to enable location sharing at check-in");
  }
  function evtBuildDetailThresholdHtml(ctx) {
    const { event, isLlc, isHost, goingList } = ctx;
    if (!isLlc || !event.min_participants || isHost) {
      return "";
    }
    const currentGoing = goingList.length;
    const minNeeded = event.min_participants;
    const isMet = currentGoing >= minNeeded;
    const deadlineStr = event.rsvp_deadline ? new Date(event.rsvp_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD";
    const socialThreshold = Math.min(Math.floor(minNeeded * 0.5), 3);
    const showExactCount = currentGoing >= socialThreshold;
    let socialText = "";
    if (isMet) socialText = `Event confirmed \xB7 ${currentGoing} going${event.max_participants ? " \xB7 " + (event.max_participants - currentGoing) + " spots left" : ""}`;
    else if (showExactCount) socialText = `${currentGoing} going toward ${minNeeded} needed`;
    else socialText = `Minimum of ${minNeeded} needed to confirm`;
    return `<div class="ed-context-row"><span>${isMet ? "\u2705" : "\u26A0\uFE0F"}</span><div><strong>${isMet ? "Minimum met" : "Minimum threshold"}</strong><p>${socialText}${event.rsvp_deadline ? ` \xB7 RSVP by ${deadlineStr}` : ""}</p></div></div>`;
  }
  function evtBuildDetailAttendeePreviewHtml(ctx) {
    const { eventId: eventId2, goingList, guestGoingList, maybeList } = ctx;
    const totalGoing = goingList.length + guestGoingList.length;
    if (totalGoing <= 0 && maybeList.length <= 0) {
      return "";
    }
    const _allAvatars = [
      ...goingList.map((r) => {
        const p = r.profiles;
        return { type: "member", id: p?.id, name: evtEscapeHtml((p?.first_name || "") + " " + (p?.last_name || "")).trim(), img: p?.profile_picture_url || null };
      }),
      ...guestGoingList.map((g2) => ({ type: "guest", name: evtEscapeHtml(g2.guest_name || "Guest"), img: null }))
    ];
    window._edAvatarData = window._edAvatarData || {};
    window._edAvatarData[eventId2] = { avatars: _allAvatars, totalGoing, maybeCount: maybeList.length };
    const countParts = [];
    if (totalGoing > 0) countParts.push(`${totalGoing} going`);
    if (maybeList.length > 0) countParts.push(`${maybeList.length} interested`);
    return `
        <div class="ed-attendee-row" id="edAttendeeRow-${eventId2}">
            <div class="ed-avatar-stack" id="edAvatarStack-${eventId2}"></div>
            <span class="ed-attendee-count">${countParts.join(" \xB7 ")}</span>
        </div>`;
  }
  function evtBuildDetailShareCardHtml(ctx) {
    const { event } = ctx;
    return `
                    <p class="ed-summary-heading">Share This Event</p>
                    <div class="ed-share-row">
                        <button class="ed-share-btn" title="Copy link" onclick="(function(){navigator.clipboard.writeText(window.location.href);const b=this;b.classList.add('ed-share-btn-copied');setTimeout(()=>b.classList.remove('ed-share-btn-copied'),1500)}).call(this)">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                        </button>
                        <a class="ed-share-btn" title="Share on Facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}" target="_blank" rel="noopener">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                        <a class="ed-share-btn" title="Share on X" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(event.title)}" target="_blank" rel="noopener">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        <a class="ed-share-btn" title="Share on Instagram" href="https://instagram.com" target="_blank" rel="noopener">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>
                    </div>`;
  }
  function evtBuildDetailOrganizerHtml(ctx) {
    const { event, isLlc, creatorProfile, cpName, cpInitials, cpBadge } = ctx;
    if (!isLlc && event.created_by) {
      const avatarImg = creatorProfile.profile_picture_url ? `<img src="${creatorProfile.profile_picture_url}" class="ed-org-avatar" alt="${evtEscapeHtml(cpName)}">` : `<div class="ed-org-avatar ed-org-avatar-fallback">${cpInitials}</div>`;
      const avatarEl = cpBadge ? `<div style="position:relative;flex-shrink:0">${avatarImg}<div style="position:absolute;bottom:-2px;right:-2px;transform:scale(.65);transform-origin:bottom right">${cpBadge}</div></div>` : avatarImg;
      return `
        <a href="profile.html?id=${creatorProfile.id}" class="ed-org-block">
            <div class="ed-org-block-row">
                ${avatarEl}
                <div>
                    <span class="ed-org-block-label">Hosted By</span>
                    <span class="ed-org-name-row"><span class="ed-org-name">${evtEscapeHtml(cpName)}</span><svg class="ed-org-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></span>
                </div>
            </div>
        </a>
    `;
    }
    if (isLlc) {
      return `
        <div class="ed-org-block ed-org-block-llc">
            <div class="ed-org-block-row">
                <div class="ed-org-avatar ed-org-avatar-llc">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                </div>
                <div>
                    <span class="ed-org-block-label">Hosted By</span>
                    <span class="ed-org-name">LLC</span>
                </div>
            </div>
        </div>
    `;
    }
    return "";
  }
  function evtBuildDetailTeamHubHtml(ctx) {
    const { eventId: eventId2, canAccessTeamHub, isHost } = ctx;
    if (!canAccessTeamHub || isHost) return "";
    return `
        <div class="ed-card ed-card-rsvp event-detail-card-tight portal-action-card">
            <p class="ed-summary-heading">Event Team</p>
            <p class="ed-hint">Staff tools for coordination and your own attendance.</p>
            <button type="button" ${evtDataAction("evtOpenTeamToolsPanel", eventId2)} class="ed-outline-btn" aria-label="Open event team tools">Team</button>
        </div>`;
  }
  function evtBuildDetailRelatedEventsHtml(ctx) {
    const { eventId: eventId2 } = ctx;
    if (typeof globalThis.evtAllEvents === "undefined" || globalThis.evtAllEvents.length <= 1) return "";
    const upcoming = globalThis.evtAllEvents.filter((e) => e.id !== eventId2 && e.status !== "cancelled").slice(0, 4);
    if (!upcoming.length) return "";
    const cards = upcoming.map((e) => {
      const d = new Date(e.start_date);
      const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const imgHtml = e.banner_url ? `<img src="${e.banner_url}" alt="" loading="lazy">` : `<div style="height:120px;background:linear-gradient(135deg,#6366f1,#8b5cf6)"></div>`;
      const onclickHandler = e.slug ? `globalThis.evtNavigateToEvent('${e.slug}')` : `globalThis.evtOpenDetail('${e.id}')`;
      return `<div class="evt-related-card" onclick="${onclickHandler}">${imgHtml}<div class="evt-related-card-body"><p class="evt-related-card-title">${evtEscapeHtml(e.title)}</p><p class="evt-related-card-meta">${dateLabel}${e.location_nickname ? " \xB7 " + evtEscapeHtml(e.location_nickname) : ""}</p></div></div>`;
    }).join("");
    return `${_edSectionHead("More Events")}<div class="evt-related-scroll">${cards}</div>`;
  }
  function evtBuildDetailMobileAttendeesHtml(ctx) {
    const { eventId: eventId2, goingList, guestGoingList, maybeList } = ctx;
    const totalGoing = goingList.length + guestGoingList.length;
    if (totalGoing <= 0 && maybeList.length <= 0) return "";
    return `
                <div class="ed-mobile-attendees-card">
                    <div class="ed-avatar-stack ed-avatar-stack-sm" id="edAvatarStackMobile-${eventId2}"></div>
                    <span class="ed-mobile-att-count">${totalGoing > 0 ? `${totalGoing} going` : ""}${totalGoing > 0 && maybeList.length > 0 ? " \xB7 " : ""}${maybeList.length > 0 ? `${maybeList.length} interested` : ""}</span>
                </div>`;
  }
  function evtBuildDetailMobileHostedHtml(ctx) {
    const { isLlc, creatorProfile, cpName, cpInitials, cpBadge } = ctx;
    if (!creatorProfile && !isLlc) return "";
    return `
                <div class="ed-mobile-hosted-card" ${creatorProfile ? `onclick="window.location.href='profile.html?id=${creatorProfile.id}'" style="cursor:pointer"` : ""}>
                    <div class="ed-mh-avatar-wrap" style="position:relative;flex-shrink:0">
                        ${creatorProfile?.profile_picture_url ? `<img src="${creatorProfile.profile_picture_url}" class="ed-mh-avatar" alt="${evtEscapeHtml(cpName)}">` : `<div class="ed-mh-avatar ed-mh-avatar-fallback">${isLlc ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>` : cpInitials}</div>`}
                        ${cpBadge ? cpBadge : ""}
                    </div>
                    <div class="ed-mh-body">
                        <span class="ed-mh-label">Hosted by</span>
                        <span class="ed-mh-name">${isLlc ? "Justice McNeal LLC" : evtEscapeHtml(cpName)}</span>
                        ${!isLlc ? `<span class="ed-mh-sub">Organizer of this event</span>` : ""}
                    </div>
                    ${creatorProfile ? `<svg class="ed-mh-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>` : ""}
                </div>`;
  }
  function evtBuildDetailPageHeaderActionsHtml(ctx) {
    const { eventId: eventId2, event } = ctx;
    return `
                <button type="button" ${evtDataAction("evtCopyShareUrl", event.slug)} class="ed-page-header-btn" aria-label="Share event">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                    <span class="ed-page-header-btn-label">Share</span>
                </button>
                <button onclick="event.stopPropagation();globalThis.evtDownloadIcs('${eventId2}')" class="ed-page-header-btn ed-page-header-btn-cal" aria-label="Add to calendar">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span class="ed-page-header-btn-label">Add to Calendar</span>
                </button>
                <button onclick="event.stopPropagation();globalThis.evtDownloadIcs('${eventId2}')" class="ed-page-header-btn ed-page-header-btn-bookmark" aria-label="Save event">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </button>`;
  }
  function evtBuildDetailAttendeeBreakdownHtml(ctx) {
    const { isHost, goingList, maybeList, checkins, checkinCount } = ctx;
    if (!isHost) return "";
    function buildPersonRow(p) {
      const initials = ((p?.first_name?.[0] || "") + (p?.last_name?.[0] || "")).toUpperCase() || "?";
      const avatar = p?.profile_picture_url ? `<img src="${p.profile_picture_url}" class="w-7 h-7 rounded-full object-cover" alt="">` : `<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">${initials}</div>`;
      return `<div class="flex items-center gap-2">${avatar}<span class="text-sm text-gray-700">${evtEscapeHtml(p?.first_name || "")} ${evtEscapeHtml(p?.last_name || "")}</span></div>`;
    }
    const checkinRows = (checkins || []).map((c) => buildPersonRow(c.profiles)).join("") || `<p class="text-xs text-gray-400 italic ml-6">None</p>`;
    return `
        <div>
            ${_edSectionHead("Attendee Breakdown")}
            <div class="mb-3">
                <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">\u2705</span><span class="text-xs font-bold text-emerald-700 uppercase tracking-wide">Going (${goingList.length})</span></div>
                <div class="space-y-1.5 ml-6">${goingList.length ? goingList.map((r) => buildPersonRow(r.profiles)).join("") : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
            </div>
            <div class="mb-3">
                <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">\u2764\uFE0F</span><span class="text-xs font-bold text-pink-700 uppercase tracking-wide">Interested (${maybeList.length})</span></div>
                <div class="space-y-1.5 ml-6">${maybeList.length ? maybeList.map((r) => buildPersonRow(r.profiles)).join("") : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
            </div>
            <div>
                <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">\u{1F4CD}</span><span class="text-xs font-bold text-violet-700 uppercase tracking-wide">Checked In (${checkinCount || 0})</span></div>
                <div class="space-y-1.5 ml-6">${checkinRows}</div>
            </div>
        </div>`;
  }
  globalThis.evtBuildDetailRsvpSectionHtml = evtBuildDetailRsvpSectionHtml;
  globalThis.evtBuildDetailRaffleSectionHtml = evtBuildDetailRaffleSectionHtml;
  globalThis.evtBuildDetailHostControlsHtml = evtBuildDetailHostControlsHtml;
  globalThis.evtBuildDetailWaitlistHtml = evtBuildDetailWaitlistHtml;
  globalThis.evtBuildDetailGraceNoticeHtml = evtBuildDetailGraceNoticeHtml;
  globalThis.evtBuildDetailCostBreakdownHtml = evtBuildDetailCostBreakdownHtml;
  globalThis.evtBuildDetailAttendeeBreakdownHtml = evtBuildDetailAttendeeBreakdownHtml;
  globalThis.evtBuildDetailHeroStatusBadgeHtml = evtBuildDetailHeroStatusBadgeHtml;
  globalThis.evtBuildDetailTransportNoticeHtml = evtBuildDetailTransportNoticeHtml;
  globalThis.evtBuildDetailLocationNoticeHtml = evtBuildDetailLocationNoticeHtml;
  globalThis.evtBuildDetailThresholdHtml = evtBuildDetailThresholdHtml;
  globalThis.evtBuildDetailAttendeePreviewHtml = evtBuildDetailAttendeePreviewHtml;
  globalThis.evtBuildDetailShareCardHtml = evtBuildDetailShareCardHtml;
  globalThis.evtBuildDetailOrganizerHtml = evtBuildDetailOrganizerHtml;
  globalThis.evtBuildDetailTeamHubHtml = evtBuildDetailTeamHubHtml;
  globalThis.evtBuildDetailRelatedEventsHtml = evtBuildDetailRelatedEventsHtml;
  globalThis.evtBuildDetailMobileAttendeesHtml = evtBuildDetailMobileAttendeesHtml;
  globalThis.evtBuildDetailMobileHostedHtml = evtBuildDetailMobileHostedHtml;
  globalThis.evtBuildDetailPageHeaderActionsHtml = evtBuildDetailPageHeaderActionsHtml;
  var detailSectionsApi = {
    buildRsvpSectionHtml: evtBuildDetailRsvpSectionHtml,
    buildRaffleSectionHtml: evtBuildDetailRaffleSectionHtml,
    buildHostControlsHtml: evtBuildDetailHostControlsHtml,
    buildWaitlistHtml: evtBuildDetailWaitlistHtml,
    buildGraceNoticeHtml: evtBuildDetailGraceNoticeHtml,
    buildCostBreakdownHtml: evtBuildDetailCostBreakdownHtml,
    buildAttendeeBreakdownHtml: evtBuildDetailAttendeeBreakdownHtml,
    buildHeroStatusBadgeHtml: evtBuildDetailHeroStatusBadgeHtml,
    buildTransportNoticeHtml: evtBuildDetailTransportNoticeHtml,
    buildLocationNoticeHtml: evtBuildDetailLocationNoticeHtml,
    buildThresholdHtml: evtBuildDetailThresholdHtml,
    buildAttendeePreviewHtml: evtBuildDetailAttendeePreviewHtml,
    buildShareCardHtml: evtBuildDetailShareCardHtml,
    buildOrganizerHtml: evtBuildDetailOrganizerHtml,
    buildTeamHubHtml: evtBuildDetailTeamHubHtml,
    buildRelatedEventsHtml: evtBuildDetailRelatedEventsHtml,
    buildMobileAttendeesHtml: evtBuildDetailMobileAttendeesHtml,
    buildMobileHostedHtml: evtBuildDetailMobileHostedHtml,
    buildPageHeaderActionsHtml: evtBuildDetailPageHeaderActionsHtml
  };
  var PortalEvents9 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents9.detail = PortalEvents9.detail || {};
  PortalEvents9.detail.sections = detailSectionsApi;

  // js/portal/events/detail/post-render.js
  function _buildAvatarHtml(avatars, overflow, sm) {
    const cls = sm ? "ed-avatar ed-avatar-sm" : "ed-avatar";
    return avatars.map((a) => {
      if (a.img) {
        return `<div class="${cls}" ${a.id ? `onclick="window.location.href='profile.html?id=${a.id}'" style="cursor:pointer"` : ""} title="${a.name}" role="button"><img src="${a.img}" alt=""></div>`;
      }
      const ini = a.name.split(" ").map((w) => w[0] || "").join("").toUpperCase().slice(0, 2) || "?";
      const gc = a.type === "guest" ? " ed-avatar-guest" : "";
      return `<div class="${cls}${gc}" title="${a.name}"><span>${ini}</span></div>`;
    }).join("") + (overflow > 0 ? `<div class="${cls} ed-avatar-overflow"><span>+${overflow}</span></div>` : "");
  }
  function _paintAttendeeAvatars(eventId2) {
    setTimeout(() => {
      const row = document.getElementById(`edAttendeeRow-${eventId2}`);
      const stack = document.getElementById(`edAvatarStack-${eventId2}`);
      const data = window._edAvatarData?.[eventId2];
      if (!row || !stack || !data) return;
      function paintAvatars() {
        const countEl = row.querySelector(".ed-attendee-count");
        const countW = countEl ? countEl.offsetWidth + 12 : 90;
        const available = row.offsetWidth - countW;
        const maxAvatars = Math.min(5, available > 0 ? Math.max(1, Math.floor((available - 40) / 32) + 1) : 3);
        const shown = data.avatars.slice(0, maxAvatars);
        stack.innerHTML = _buildAvatarHtml(shown, data.avatars.length - shown.length, false);
      }
      paintAvatars();
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(paintAvatars).observe(row);
      }
      const mobileStack = document.getElementById(`edAvatarStackMobile-${eventId2}`);
      if (mobileStack && data) {
        const shown = data.avatars.slice(0, 4);
        mobileStack.innerHTML = _buildAvatarHtml(shown, data.avatars.length - shown.length, true);
      }
    }, 0);
  }
  function _bindHostDropdownOutsideClick() {
    document.addEventListener("click", (e) => {
      const dd = document.querySelector(".evt-host-dropdown.open");
      if (dd && !dd.parentElement.contains(e.target)) dd.classList.remove("open");
    }, { once: false });
  }
  function evtRunDetailPostRenderBasics(ctx) {
    const eventId2 = ctx && ctx.eventId;
    if (!eventId2) return;
    if (typeof globalThis.evtLoadComments === "function") {
      window.evtLoadComments(eventId2);
    }
    _bindHostDropdownOutsideClick();
    _paintAttendeeAvatars(eventId2);
  }
  async function evtRenderDetailQrCanvases(ctx) {
    if (!ctx || !ctx.event) return;
    const { event, rsvp, memberGoing: memberGoing2 } = ctx;
    if (!memberGoing2 || event.checkin_mode !== "attendee_ticket") return;
    if (!rsvp || !rsvp.qr_token) return;
    const canvas = document.getElementById("myTicketQR");
    if (!canvas) return;
    try {
      const QRCode = typeof globalThis.evtEnsureQRCode === "function" ? await window.evtEnsureQRCode() : window.QRCode;
      if (!QRCode) return;
      QRCode.toCanvas(
        canvas,
        `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`,
        { width: 180, margin: 2 }
      );
    } catch (err) {
      console.warn("Ticket QR render failed:", err);
    }
  }
  async function evtInitDetailInlineMaps(ctx) {
    if (!ctx || !ctx.event) return;
    const { event, showLocation } = ctx;
    if (!showLocation || !event.location_lat || !event.location_lng) return;
    try {
      if (typeof globalThis.evtEnsureLeaflet === "function") await window.evtEnsureLeaflet();
    } catch (err) {
      console.warn("Inline map library failed:", err);
      return;
    }
    if (typeof L === "undefined") return;
    const lat = event.location_lat;
    const lng = event.location_lng;
    const locationText = event.location_text || "";
    const escapeHtml = typeof globalThis.evtEscapeHtml === "function" ? window.evtEscapeHtml : (s) => String(s);
    function initMap(id) {
      const mapEl = document.getElementById(id);
      if (!mapEl) return;
      const dMap = L.map(id, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        tap: true
      }).setView([lat, lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(dMap);
      L.marker([lat, lng]).addTo(dMap);
      setTimeout(() => dMap.invalidateSize(), 100);
      dMap.on("click", () => {
        if (typeof globalThis.evtOpenFullscreenMap === "function") {
          window.evtOpenFullscreenMap(lat, lng, escapeHtml(locationText));
        }
      });
    }
    initMap("detailEventMap");
    initMap("detailEventMapMobile");
  }
  function evtRunDetailPostRenderUi(ctx) {
    if (!ctx || !ctx.event || !ctx.eventId) return;
    const {
      event,
      eventId: eventId2,
      isPast,
      isClosed,
      rsvp,
      myRaffleEntry,
      entriesClosed,
      eventIsFull,
      isHost,
      canAccessTeamHub,
      canCreateTeamChat: canCreateTeamChat2
    } = ctx;
    if (!isPast && !isClosed) {
      let _tickCd = function() {
        const diff = _cdTarget - Date.now();
        if (!_cdEls[0] || diff < 0) {
          if (_cdCard) _cdCard.style.display = "none";
          return;
        }
        const d = Math.floor(diff / 864e5);
        const h = Math.floor(diff % 864e5 / 36e5);
        const m = Math.floor(diff % 36e5 / 6e4);
        const s = Math.floor(diff % 6e4 / 1e3);
        _cdEls[0].textContent = String(d).padStart(2, "0");
        _cdEls[1].textContent = String(h).padStart(2, "0");
        _cdEls[2].textContent = String(m).padStart(2, "0");
        _cdEls[3].textContent = String(s).padStart(2, "0");
      };
      const _cdTarget = new Date(event.start_date).getTime();
      const _cdEls = ["edCdDays", "edCdHours", "edCdMins", "edCdSecs"].map((id) => document.getElementById(id));
      const _cdCard = document.getElementById("edCountdownCard");
      _tickCd();
      const _cdTimer = setInterval(_tickCd, 1e3);
      const _cdCleanup = () => clearInterval(_cdTimer);
      window.addEventListener("popstate", _cdCleanup, { once: true });
      document.addEventListener("evtDetailUnmount", _cdCleanup, { once: true });
    }
    window.__evtTeamToolsCtx = {
      eventId: eventId2,
      myRaffleEntry,
      entriesClosed,
      eventIsFull,
      canManageEvent: isHost,
      canAccessTeamHub,
      canCreateTeamChat: canCreateTeamChat2
    };
    if (typeof globalThis.evtInitBottomNav === "function") {
      window.evtInitBottomNav(event, eventId2, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost, canAccessTeamHub);
    }
  }
  var detailPostRenderApi = {
    runBasics: evtRunDetailPostRenderBasics,
    renderQrCanvases: evtRenderDetailQrCanvases,
    initInlineMaps: evtInitDetailInlineMaps,
    runUi: evtRunDetailPostRenderUi
  };
  globalThis.evtRunDetailPostRenderBasics = evtRunDetailPostRenderBasics;
  globalThis.evtRenderDetailQrCanvases = evtRenderDetailQrCanvases;
  globalThis.evtInitDetailInlineMaps = evtInitDetailInlineMaps;
  globalThis.evtRunDetailPostRenderUi = evtRunDetailPostRenderUi;
  var PortalEvents10 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents10.detail = PortalEvents10.detail || {};
  PortalEvents10.detail.postRender = detailPostRenderApi;

  // js/portal/events/detail/template.js
  function evtBuildDetailTemplate(templateCtx) {
    const _edCard = window.evtEdCard;
    const _edSectionHead2 = window.evtEdSectionHead;
    const evtEscapeHtml3 = window.evtEscapeHtml;
    const {
      event,
      eventId: eventId2,
      start,
      timeStr,
      tc,
      cpName,
      showTime,
      showLocation,
      showNotes,
      isPast,
      isClosed,
      deadlinePassed,
      rsvpEnabled,
      bannerBg,
      heroStatusBadgeHtml,
      pageHeaderActionsHtml,
      mobileAttendeesHtml,
      mobileHostedHtml,
      descHtml,
      descIsLong,
      eventContextHtml,
      attendeePreviewHtml,
      organizerHtml,
      waitlistHtml,
      thresholdHtml,
      costBreakdownHtml,
      locationReqHtml,
      graceHtml,
      raffleHtml: raffleHtml3,
      mapHtml,
      competitionHtml,
      scrapbookHtml,
      relatedHtml,
      rsvpButtons,
      teamHubCardHtml,
      qrHtml,
      documentsHtml,
      shareCardHtml
    } = templateCtx;
    return `
    <!-- \u2500\u2500\u2500 Detail Page Header \u2500\u2500\u2500 -->
    <div class="ed-page-header">
        <div class="ed-page-header-inner">
            <button onclick="globalThis.evtNavigateToList()" class="ed-page-header-back" aria-label="Back to events">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                <span class="ed-page-header-back-label">Back to Events</span>
            </button>
            <div class="ed-page-header-title">
                <h2>Event Details</h2>
                <p class="ed-page-header-sub">Discover and join events in your community.</p>
            </div>
            <div class="ed-page-header-actions">
                ${pageHeaderActionsHtml}
            </div>
        </div>
    </div>

    <!-- \u2500\u2500\u2500 Two-column layout: hero+content LEFT, summary sidebar RIGHT \u2500\u2500\u2500 -->
    <div class="ed-content event-detail-shell portal-event-shell">
        <div class="ed-detail-body event-detail-grid portal-event-grid">
            <div class="ed-main event-detail-main portal-event-story">

            <!-- \u2500\u2500\u2500 Immersive Hero \u2500\u2500\u2500 -->
            <div class="ed-hero" style="${bannerBg}" ${event.banner_url ? `${evtDataAction("evtOpenLightbox", event.banner_url)}` : ""} role="img" aria-label="Event banner">
                <div class="ed-hero-scrim"></div>
                <div class="ed-hero-nav">
                    ${heroStatusBadgeHtml}
                    <div class="ed-hero-pill-row">
                        <button onclick="event.stopPropagation();globalThis.evtNavigateToList()" class="ed-hero-pill evt-hero-back-btn" title="Back" aria-label="Back to events">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                    </div>
                </div>
                <div class="ed-hero-bottom-content">
                    <h1 class="ed-hero-title">${evtEscapeHtml3(event.title)}</h1>
                    <p class="ed-hero-subtitle">${cpName ? `Hosted by ${evtEscapeHtml3(cpName)}` : evtEscapeHtml3(tc.label)}${event.category ? ` &bull; ${evtEscapeHtml3((event.category || "").replace(/_/g, " "))}` : ""}</p>
                    <div class="ed-hero-info-bar">
                        <div class="ed-hero-info-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            <div>
                                <span class="ed-hero-info-main">${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                <span class="ed-hero-info-sub">${start.toLocaleDateString("en-US", { weekday: "short" })}</span>
                            </div>
                        </div>
                        ${showTime ? `<div class="ed-hero-info-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <div>
                                <span class="ed-hero-info-main">${timeStr}</span>
                                <span class="ed-hero-info-sub">Start time</span>
                            </div>
                        </div>` : ""}
                        ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-hero-info-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <div>
                                <span class="ed-hero-info-main">${evtEscapeHtml3(event.location_nickname || event.location_text || "")}</span>
                                <span class="ed-hero-info-sub">${evtEscapeHtml3(event.location_text && event.location_nickname ? event.location_text : "")}</span>
                            </div>
                        </div>` : ""}
                    </div>
                </div>
            </div><!-- /ed-hero -->

            <div class="ed-content-cards portal-event-sections">
                <!-- Quick-Info Bar (mobile only: date / time / location) -->
                <div class="ed-qi-bar">
                    <div class="ed-qi-col">
                        <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span class="ed-qi-main">${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span class="ed-qi-sub">${start.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    </div>
                    ${showTime ? `<div class="ed-qi-col">
                        <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span class="ed-qi-main">${timeStr}</span>
                        <span class="ed-qi-sub">Start time</span>
                    </div>` : ""}
                    ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-qi-col${event.location_lat && event.location_lng ? " ed-qi-col-loc" : ""}"${event.location_lat && event.location_lng ? ` ${evtDataAction("evtOpenFullscreenMap", event.location_lat, event.location_lng)}` : ""}>
                        <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <span class="ed-qi-main">${evtEscapeHtml3(event.location_nickname || event.location_text || "")}</span>
                        <span class="ed-qi-sub">${event.location_nickname && event.location_text ? evtEscapeHtml3(event.location_text) : "Location"}</span>
                    </div>` : ""}
                </div>
                <!-- Mobile Map Card (S5 \u2014 hidden on desktop) -->
                ${showLocation && event.location_lat && event.location_lng ? `
                <div class="ed-mobile-map-card">
                    <div id="detailEventMapMobile" class="ed-mobile-map"></div>
                    <div class="ed-map-overlay ed-mobile-map-overlay">
                        <span class="ed-map-overlay-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                        <div class="ed-map-overlay-body">
                            <p class="ed-map-overlay-name">${evtEscapeHtml3(event.location_nickname || event.location_text || "Venue")}</p>
                            ${event.location_nickname && event.location_text ? `<p class="ed-map-overlay-addr">${evtEscapeHtml3(event.location_text)}</p>` : ""}
                            <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? "https://maps.apple.com/?daddr=" : "https://www.google.com/maps/dir/?api=1&destination="}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-map-overlay-link">View on Maps \u2197</a>
                        </div>
                    </div>
                </div>` : ""}
                <!-- Mobile Attendees Card (S7) -->
                ${mobileAttendeesHtml}
                <!-- Mobile Hosted By Card (S8) -->
                ${mobileHostedHtml}
                <!-- About Card -->
                <div class="ed-about-grid event-detail-card">
                    <div class="ed-about-left">
                        <div class="ed-about-desc-col">
                            ${deadlinePassed && !isClosed && !isPast ? '<div class="ed-deadline-banner" style="margin-bottom:14px">\u{1F512} RSVP deadline passed</div>' : ""}
                            <p class="ed-about-heading">About This Event</p>
                            <div class="ed-desc${descIsLong ? " ed-desc-collapsed" : ""}" id="evtDescWrap">${descHtml}</div>
                            ${descIsLong ? `<button class="ed-read-more" onclick="var w=document.getElementById('evtDescWrap'),c=w.classList.toggle('ed-desc-collapsed');this.textContent=c?'Read more':'Show less'">Read more</button>` : ""}
                            ${eventContextHtml ? `<div class="ed-context-list">${eventContextHtml}</div>` : ""}
                        </div>
                        ${attendeePreviewHtml ? `
                        <div class="ed-about-desc-col">
                            <p class="ed-card-heading" style="margin-bottom:12px">Attendees</p>
                            ${attendeePreviewHtml}
                        </div>` : ""}
                    </div>
                    ${organizerHtml || showLocation && event.location_lat && event.location_lng ? `
                    <div class="ed-about-right">
                        ${organizerHtml ? `<div class="ed-about-org-col">${organizerHtml}</div>` : ""}
                        ${showLocation && event.location_lat && event.location_lng ? `
                        <div class="ed-about-map-col">
                            <div class="ed-map-wrap">
                                <div id="detailEventMap" class="ed-map"></div>
                                <div class="ed-map-overlay">
                                    <span class="ed-map-overlay-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                                    <div class="ed-map-overlay-body">
                                        <p class="ed-map-overlay-name">${evtEscapeHtml3(event.location_nickname || event.location_text || "Venue")}</p>
                                        ${event.location_nickname && event.location_text ? `<p class="ed-map-overlay-addr">${evtEscapeHtml3(event.location_text)}</p>` : ""}
                                        <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? "https://maps.apple.com/?daddr=" : "https://www.google.com/maps/dir/?api=1&destination="}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-map-overlay-link">View on Maps \u2197</a>
                                    </div>
                                </div>
                            </div>
                        </div>` : ""}
                    </div>` : ""}
                </div>

        <!-- Gated Notes Card -->
        ${showNotes && event.gated_notes ? `<div class="ed-card event-detail-card">${_edSectionHead2("Attendee Details")}<p class="ed-body-text whitespace-pre-line">${evtEscapeHtml3(event.gated_notes)}</p></div>` : ""}

        <!-- Attendees Card moved into about grid right column -->

        <!-- Dynamic sections (notices, QR, cost, raffle\u2026) -->
        <!-- scannerBtn + venueQrHtml moved into Manage Event sheet -->
        ${[waitlistHtml, thresholdHtml, costBreakdownHtml, locationReqHtml, graceHtml, raffleHtml3, mapHtml, competitionHtml, scrapbookHtml].filter(Boolean).map((s) => _edCard(s, "event-detail-card")).join("")}

        <!-- Stats & Breakdown moved into Manage Event sheet (EventsManage) -->

        <!-- Comments -->
        <div class="ed-card event-detail-card" id="portalCommentsSection" role="region" aria-label="Discussion">
            ${_edSectionHead2("Discussion")}
            <div id="portalCommentsList" class="ed-comments-list"></div>
            <div class="ed-comment-input-row">
                <div class="ed-comment-self-avatar" id="portalCommentSelfAvatar"></div>
                <div class="ed-comment-input-wrap">
                    <input type="text" id="portalCommentInput" placeholder="Add a comment\u2026" class="ed-comment-input" aria-label="Write a comment">
                    <button ${evtDataAction("evtPostComment", eventId2)} class="ed-comment-post" aria-label="Post comment">Post</button>
                </div>
            </div>
        </div>

        <!-- Related Events -->
        ${relatedHtml ? _edCard(relatedHtml, "event-detail-card") : ""}

        <!-- Host Controls inline card removed \u2014 opens via Manage Event sheet -->

        ${event.cancellation_note ? _edCard(`<div class="ed-cancel-banner"><p class="ed-cancel-title">Cancellation Note</p><p class="ed-cancel-text">${evtEscapeHtml3(event.cancellation_note)}</p></div>`, "event-detail-card") : ""}

                <div style="height:80px" class="lg:hidden"></div>
                <div style="height:32px" class="hidden lg:block"></div>
            </div><!-- /ed-content-cards -->
            </div><!-- /ed-main -->

            <!-- \u2500\u2500\u2500 Event Summary Sidebar \u2500\u2500\u2500 -->
            <div class="ed-sidebar event-detail-rail portal-event-rail">
                <div class="ed-card ed-summary-card event-detail-card-tight portal-summary-card">
                    <p class="ed-summary-heading">Event Summary</p>
                    <div class="ed-summary-header-row">
                        ${event.banner_url ? `<img src="${event.banner_url}" class="ed-summary-thumb" alt="" loading="eager" decoding="async">` : `<div class="ed-summary-thumb ed-summary-thumb-placeholder"></div>`}
                        <div class="ed-summary-header-text">
                            <p class="ed-summary-title">${evtEscapeHtml3(event.title)}</p>
                            <p class="ed-summary-sub">${cpName ? `Hosted by ${evtEscapeHtml3(cpName)}` : evtEscapeHtml3(tc.label)}</p>
                            ${event.category ? `<p class="ed-summary-cat">${evtEscapeHtml3((event.category || "").replace(/_/g, " "))}</p>` : ""}
                        </div>
                    </div>
                    <hr class="ed-divider" style="margin:14px 0">
                    <div class="ed-summary-rows">
                        <div class="ed-summary-row">
                            <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg></div>
                            <div>
                                <span class="ed-summary-main">${start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                                <span class="ed-summary-sub2">${start.toLocaleDateString("en-US", { weekday: "long" })}</span>
                            </div>
                        </div>
                        ${showTime ? `<div class="ed-summary-row">
                            <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                            <div>
                                <span class="ed-summary-main">${timeStr}</span>
                                <span class="ed-summary-sub2">Start time</span>
                            </div>
                        </div>` : ""}
                        ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-summary-row">
                            <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg></div>
                            <div>
                                <span class="ed-summary-main">${evtEscapeHtml3(event.location_nickname || event.location_text || "")}</span>
                                ${event.location_text && event.location_nickname ? `<span class="ed-summary-sub2">${evtEscapeHtml3(event.location_text)}</span>` : ""}
                                ${event.location_text ? `<a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? "https://maps.apple.com/?daddr=" : "https://www.google.com/maps/dir/?api=1&destination="}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-maps-link">View on Maps \u2197</a>` : ""}
                            </div>
                        </div>` : ""}
                    </div>
                </div>
                ${rsvpButtons && rsvpEnabled ? `
                <div class="ed-card ed-card-rsvp event-detail-card-tight portal-action-card">
                    <p class="ed-summary-heading">Your RSVP</p>
                    ${rsvpButtons}
                </div>` : ""}
                ${teamHubCardHtml}
                ${qrHtml ? `
                <div class="ed-card event-detail-card-tight portal-action-card portal-ticket-card">
                    ${qrHtml}
                </div>` : ""}
                ${documentsHtml ? `
                <div class="ed-card event-detail-card-tight portal-action-card portal-docs-card">
                    ${documentsHtml}
                </div>` : ""}
                ${!isPast && !isClosed ? `
                <div class="ed-card ed-countdown-card event-detail-card-tight portal-utility-card" id="edCountdownCard">
                    <p class="ed-summary-heading">Starts In</p>
                    <div class="ed-countdown-grid">
                        <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdDays">--</span><span class="ed-countdown-lbl">Days</span></div>
                        <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdHours">--</span><span class="ed-countdown-lbl">Hours</span></div>
                        <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdMins">--</span><span class="ed-countdown-lbl">Mins</span></div>
                        <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdSecs">--</span><span class="ed-countdown-lbl">Secs</span></div>
                    </div>
                </div>` : ""}
                <div class="ed-card ed-share-card event-detail-card-tight portal-utility-card">
                    ${shareCardHtml}
                </div>
        </div><!-- /ed-detail-body -->
    </div>
`;
  }
  var detailTemplateApi = {
    build: evtBuildDetailTemplate
  };
  globalThis.evtBuildDetailTemplate = evtBuildDetailTemplate;
  var PortalEvents11 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents11.detail = PortalEvents11.detail || {};
  PortalEvents11.detail.template = detailTemplateApi;

  // js/portal/events/detail.js
  var PortalEvents12 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  var detail = PortalEvents12.detail = PortalEvents12.detail || {};
  detail._registry = detail._registry || {};
  detail.register = function(name, fn) {
    detail._registry[name] = fn;
  };
  detail.get = function(name) {
    return detail._registry[name];
  };
  async function evtOpenDetail(eventId2) {
    const ctx = await window.evtLoadDetailContext(eventId2);
    if (!ctx) return;
    const {
      event,
      rsvp,
      start,
      dateStr,
      timeStr,
      endTimeStr,
      tc,
      isLlc,
      isComp,
      goingList,
      maybeList,
      guestGoingList,
      checkins,
      checkinCount,
      costItems,
      waitlist,
      myWaitlistEntry,
      raffleEntryCount,
      myRaffleEntry,
      raffleWinners,
      isCreator,
      canManageEvent,
      canAccessTeamHub,
      isHost,
      canCreateTeamChat: canCreateTeamChat2,
      creatorProfile,
      cpName,
      cpInitials,
      cpBadge,
      cpTitle,
      memberGoing: memberGoing2,
      hasRsvp,
      documentsHtml,
      mapHtml,
      competitionHtml,
      scrapbookHtml,
      showTime,
      showLocation,
      showNotes,
      isClosed,
      isPast,
      deadlinePassed,
      entriesClosed,
      rsvpEnabled,
      canRsvp,
      eventIsFull
    } = ctx;
    const heroStatusBadgeHtml = window.evtBuildDetailHeroStatusBadgeHtml(ctx);
    const bannerBg = event.banner_url ? `background-image:url('${event.banner_url}');background-size:cover;background-position:center;` : `background:linear-gradient(135deg, #312e81 0%, #6d28d9 50%, #a855f7 100%);`;
    const transportContextHtml = window.evtBuildDetailTransportNoticeHtml(ctx);
    const locationReqHtml = window.evtBuildDetailLocationNoticeHtml(ctx);
    let qrHtml = "";
    let myCheckin = null;
    const checkinEnabled = event.checkin_enabled !== false;
    if (checkinEnabled && memberGoing2 && event.checkin_mode === "attendee_ticket") {
      const { data: ci } = await supabaseClient.from("event_checkins").select("checked_in_at").eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id).maybeSingle();
      myCheckin = ci;
      const checkedInTime = myCheckin ? new Date(myCheckin.checked_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
      const checkedInDate = myCheckin ? new Date(myCheckin.checked_in_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
      qrHtml = `
        <div class="ed-qr-wrap">
            <div class="ed-qr-header">${myCheckin ? "\u2705 Checked In" : "\u{1F3AB} Your Event Ticket"}</div>
            <div style="position:relative;display:inline-block">
                <canvas id="myTicketQR" style="display:block;margin:0 auto;border-radius:12px;${myCheckin ? "opacity:.25" : ""}"></canvas>
                ${myCheckin ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                    <div style="width:56px;height:56px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(16,185,129,.4)">
                        <svg style="width:28px;height:28px;color:#fff" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                </div>` : ""}
            </div>
            <p class="ed-qr-hint">${myCheckin ? `Scanned at ${checkedInTime} \xB7 ${checkedInDate}` : "Show this QR code at check-in"}</p>
        </div>`;
    }
    let costBreakdownHtml = window.evtBuildDetailCostBreakdownHtml(ctx);
    const thresholdContextHtml = window.evtBuildDetailThresholdHtml(ctx);
    const eventContextHtml = [thresholdContextHtml, transportContextHtml].filter(Boolean).join("");
    const waitlistHtml = window.evtBuildDetailWaitlistHtml(ctx);
    const graceHtml = window.evtBuildDetailGraceNoticeHtml(ctx);
    const rsvpButtons = window.evtBuildDetailRsvpSectionHtml(ctx);
    const raffleHtml3 = window.evtBuildDetailRaffleSectionHtml(ctx);
    const attendeePreviewHtml = window.evtBuildDetailAttendeePreviewHtml(ctx);
    const shareCardHtml = window.evtBuildDetailShareCardHtml(ctx);
    const organizerHtml = window.evtBuildDetailOrganizerHtml(ctx);
    const teamHubCardHtml = window.evtBuildDetailTeamHubHtml(ctx);
    const relatedHtml = window.evtBuildDetailRelatedEventsHtml(ctx);
    const mobileAttendeesHtml = window.evtBuildDetailMobileAttendeesHtml(ctx);
    const mobileHostedHtml = window.evtBuildDetailMobileHostedHtml(ctx);
    const pageHeaderActionsHtml = window.evtBuildDetailPageHeaderActionsHtml(ctx);
    const rawDesc = event.description || "";
    const descHtml = rawDesc ? window.evtMiniMarkdown(rawDesc) : '<span class="ed-no-desc">No details yet \u2014 check back closer to the event.</span>';
    const descIsLong = rawDesc.length > 500;
    if (costBreakdownHtml && event.rsvp_cost_cents) {
      costBreakdownHtml = `
        <div class="evt-cost-toggle" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')" role="button" aria-expanded="false" aria-label="Toggle cost breakdown">
            <div><span class="evt-cost-toggle-label">Cost Breakdown</span></div>
            <div style="display:flex;align-items:center;gap:8px"><span class="evt-cost-toggle-price">${formatCurrency(event.rsvp_cost_cents)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg></div>
        </div>
        <div class="evt-cost-details">${costBreakdownHtml}</div>`;
    }
    const detailView = document.getElementById("eventsDetailView");
    detailView.classList.add("event-detail-surface", "portal-event-detail-v2");
    const templateCtx = {
      event,
      eventId: eventId2,
      start,
      timeStr,
      tc,
      cpName,
      showTime,
      showLocation,
      showNotes,
      isPast,
      isClosed,
      deadlinePassed,
      rsvpEnabled,
      bannerBg,
      heroStatusBadgeHtml,
      pageHeaderActionsHtml,
      mobileAttendeesHtml,
      mobileHostedHtml,
      descHtml,
      descIsLong,
      eventContextHtml,
      attendeePreviewHtml,
      organizerHtml,
      waitlistHtml,
      thresholdHtml: "",
      costBreakdownHtml,
      locationReqHtml,
      graceHtml,
      raffleHtml: raffleHtml3,
      mapHtml,
      competitionHtml,
      scrapbookHtml,
      relatedHtml,
      rsvpButtons,
      teamHubCardHtml,
      qrHtml,
      documentsHtml,
      shareCardHtml
    };
    detailView.innerHTML = window.evtBuildDetailTemplate(templateCtx);
    document.title = `${event.title} | Events | Justice McNeal LLC`;
    window.scrollTo({ top: 0, behavior: "instant" });
    window.evtInitSectionAnimations();
    window.evtRunDetailPostRenderUi({
      event,
      eventId: eventId2,
      isPast,
      isClosed,
      rsvp,
      myRaffleEntry,
      entriesClosed,
      eventIsFull,
      isHost,
      canAccessTeamHub,
      canCreateTeamChat: canCreateTeamChat2
    });
    evtInitHeroCollapse();
    window.evtRunDetailPostRenderBasics({ eventId: eventId2 });
    setTimeout(() => {
      window.evtRenderDetailQrCanvases({ event, eventId: eventId2, rsvp, memberGoing: memberGoing2 });
      window.evtInitDetailInlineMaps({ event, showLocation });
    }, 100);
  }
  function evtInitHeroCollapse() {
  }
  function evtCleanupHeroCollapse() {
  }
  globalThis.evtOpenDetail = evtOpenDetail;
  window.evtOpenDetail = evtOpenDetail;
  globalThis.evtInitHeroCollapse = evtInitHeroCollapse;
  globalThis.evtCleanupHeroCollapse = evtCleanupHeroCollapse;
  window.evtInitHeroCollapse = evtInitHeroCollapse;
  window.evtCleanupHeroCollapse = evtCleanupHeroCollapse;
  detail.open = evtOpenDetail;
  detail.openLightbox = globalThis.evtOpenLightbox;
  detail.openFullscreenMap = globalThis.evtOpenFullscreenMap;
  detail.closeFullscreenMap = globalThis.evtCloseFullscreenMap;
  detail.initBottomNav = globalThis.evtInitBottomNav;
  detail.cleanupBottomNav = globalThis.evtCleanupBottomNav;
  detail.openCtaPanel = globalThis.evtOpenCtaPanel;
  detail.closeCtaPanel = globalThis.evtCloseCtaPanel;
  detail.openTeamToolsPanel = globalThis.evtOpenTeamToolsPanel;
  detail.openTeamChat = globalThis.evtOpenTeamChat;
  detail.startLiveCountdown = globalThis.evtStartLiveCountdown;
  detail.initSectionAnimations = globalThis.evtInitSectionAnimations;
  detail.recenterFullscreenMap = globalThis.evtRecenterFullscreenMap;
  detail.initHeroCollapse = evtInitHeroCollapse;
  detail.cleanupHeroCollapse = evtCleanupHeroCollapse;
  detail.miniMarkdown = globalThis.evtMiniMarkdown;
  detail.raffleConfig = globalThis.evtDetailRaffleConfig;
  detail.raffleCategories = globalThis.evtDetailRaffleCategories;
  detail.raffleItems = globalThis.evtDetailRaffleItems;
  detail.raffleWinnerCount = globalThis.evtDetailRaffleWinnerCount;
  detail.drawModeLabel = globalThis.evtDetailDrawModeLabel;
  detail.rafflePrizesHtml = globalThis.evtDetailRafflePrizesHtml;
  detail.raffleWinnersHtml = globalThis.evtDetailRaffleWinnersHtml;
  detail.raffleLockedDesktopHtml = globalThis.evtRaffleLockedDesktopHtml;
  if (PortalEvents12.detail.presentation) {
    detail.presentation = PortalEvents12.detail.presentation;
  }
  if (PortalEvents12.detail.raffleRender) {
    detail.raffleRender = PortalEvents12.detail.raffleRender;
  }
  if (PortalEvents12.detail.mapOverlay) {
    detail.mapOverlay = PortalEvents12.detail.mapOverlay;
  }
  if (PortalEvents12.team) {
    detail.team = PortalEvents12.team;
  }
  if (PortalEvents12.detail.fragments) {
    detail.fragments = PortalEvents12.detail.fragments;
  }
  if (PortalEvents12.detail.data) {
    detail.data = PortalEvents12.detail.data;
  }
  if (PortalEvents12.detail.sections) {
    detail.sections = PortalEvents12.detail.sections;
  }
  if (PortalEvents12.detail.postRender) {
    detail.postRender = PortalEvents12.detail.postRender;
  }
  if (PortalEvents12.detail.template) {
    detail.template = PortalEvents12.detail.template;
  }
  detail.loadContext = globalThis.evtLoadDetailContext;
  detail.buildTemplate = globalThis.evtBuildDetailTemplate;
  detail.runPostRenderBasics = globalThis.evtRunDetailPostRenderBasics;
  detail.renderQrCanvases = globalThis.evtRenderDetailQrCanvases;
  detail.initInlineMaps = globalThis.evtInitDetailInlineMaps;
  detail.runPostRenderUi = globalThis.evtRunDetailPostRenderUi;
  detail.register("rsvp", { handle: () => window.evtHandleRsvp });
  detail.register("raffle", { handle: () => window.evtHandleRaffleEntry });
  detail.register("competition", { build: () => window.evtBuildCompetitionHtml });
  detail.register("comments", { load: () => window.evtLoadComments, post: () => window.evtPostComment });
  detail.register("documents", { build: () => window.evtBuildDocumentsHtml });
  detail.register("scrapbook", { build: () => window.evtBuildScrapbookHtml });
  detail.register("map", { build: () => window.evtBuildMapHtml });
  detail.register("scanner", { open: () => window.evtOpenScanner });
  var detailOrchestratorApi = {
    register: detail.register,
    get: detail.get,
    open: globalThis.evtOpenDetail,
    namespace: detail
  };

  // js/portal/events/compat/publish-globals.js
  function publishGlobals(map) {
    for (const [name, fn] of Object.entries(map)) {
      if (typeof fn === "function") {
        globalThis[name] = fn;
        if (typeof window !== "undefined") window[name] = fn;
      }
    }
  }

  // js/portal/events/detail/comments.js
  function evtTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 6e4);
    const hours = Math.floor(diff / 36e5);
    const days = Math.floor(diff / 864e5);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  async function evtLoadComments(eventId2) {
    const list = document.getElementById("portalCommentsList");
    if (!list) return;
    const selfEl = document.getElementById("portalCommentSelfAvatar");
    if (selfEl) {
      const pic = window.evtCurrentUserPic;
      const initials = window.evtCurrentUserInitials || "?";
      selfEl.innerHTML = pic ? `<img src="${evtEscapeHtml(pic)}" alt="">` : initials;
    }
    let comments = null;
    try {
      const { data, error } = await supabaseClient.from("event_comments").select("*, profile:profiles!event_comments_user_id_fkey(first_name, last_name, profile_picture_url)").eq("event_id", eventId2).order("created_at", { ascending: true }).limit(100);
      if (error) throw error;
      comments = data;
    } catch (err) {
      console.warn("Comments unavailable:", err.message || err);
      const section = document.getElementById("portalCommentsSection");
      if (section) section.style.display = "none";
      return;
    }
    if (!comments || comments.length === 0) {
      list.innerHTML = `<div class="ed-comment-empty">
            <span class="ed-comment-empty-icon">\u{1F4AC}</span>
            <p class="ed-comment-empty-text">No comments yet \u2014 be the first!</p>
        </div>`;
      return;
    }
    list.innerHTML = comments.map((c) => {
      const name = evtEscapeHtml(`${c.profile?.first_name || ""} ${c.profile?.last_name || ""}`.trim() || "Member");
      const avatarUrl = c.profile?.profile_picture_url;
      const initials = ((c.profile?.first_name?.[0] || "") + (c.profile?.last_name?.[0] || "")).toUpperCase() || "?";
      const timeAgo = evtTimeAgo(c.created_at);
      return `<div class="evt-comment">
            <div class="evt-comment-avatar">${avatarUrl ? `<img src="${evtEscapeHtml(avatarUrl)}" alt="">` : initials}</div>
            <div class="evt-comment-body">
                <div class="evt-comment-meta"><span class="evt-comment-name">${name}</span><span class="evt-comment-time">${timeAgo}</span></div>
                <p class="evt-comment-text">${evtEscapeHtml(c.body)}</p>
            </div>
        </div>`;
    }).join("");
  }
  async function evtPostComment(eventId2) {
    const input = document.getElementById("portalCommentInput");
    const body = (input?.value || "").trim();
    if (!body || !eventId2 || !globalThis.evtCurrentUser) return;
    const { error } = await supabaseClient.from("event_comments").insert({ event_id: eventId2, user_id: globalThis.evtCurrentUser.id, body });
    if (error) {
      console.error("Comment error:", error);
      return;
    }
    input.value = "";
    await evtLoadComments(eventId2);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "portalCommentInput") {
      const btn = document.querySelector(".ed-comment-post");
      btn?.click();
    }
  });
  publishGlobals({ evtLoadComments, evtPostComment });

  // js/portal/events/detail/documents.js
  async function evtBuildDocumentsHtml2(event, isHost, hasRsvp) {
    const eventId2 = event.id;
    const isLlc = event.event_type === "llc";
    if (!isLlc) return "";
    const { data: docs } = await supabaseClient.from("event_documents").select("*, profiles:target_user_id(first_name, last_name)").eq("event_id", eventId2).order("created_at", { ascending: true });
    const allDocs = docs || [];
    const groupDocs = allDocs.filter((d) => !d.target_user_id);
    const myDocs = allDocs.filter((d) => d.target_user_id === globalThis.evtCurrentUser.id);
    if (isHost) return "";
    if (!hasRsvp) return "";
    const visibleDocs = [...myDocs, ...groupDocs];
    if (visibleDocs.length === 0) return "";
    window._evtVisibleDocuments = window._evtVisibleDocuments || {};
    window._evtVisibleDocuments[eventId2] = visibleDocs.map((d) => ({
      id: d.id,
      doc_type: d.doc_type,
      label: d.label,
      file_name: d.file_name,
      file_path: d.file_path,
      target_user_id: d.target_user_id
    }));
    return `
        <div class="ed-docs-launch">
            <div class="ed-docs-launch-copy">
                <span class="ed-docs-launch-icon">\u{1F4C4}</span>
                <div>
                    <p class="ed-docs-launch-title">Documents available</p>
                    <p class="ed-docs-launch-sub">${visibleDocs.length} file${visibleDocs.length !== 1 ? "s" : ""} ready for this event</p>
                </div>
            </div>
            <button type="button" ${evtDataAction("evtOpenDocumentsPanel", eventId2)} class="ed-action-btn ed-docs-launch-btn">View Documents</button>
        </div>`;
  }
  function evtOpenDocumentsPanel(eventId2) {
    const docs = window._evtVisibleDocuments?.[eventId2] || [];
    if (!docs.length) return;
    const existing = document.getElementById("evtDocsPanelRoot");
    if (existing) existing.remove();
    const rows = docs.map((d) => {
      const isPersonal = !!d.target_user_id;
      return `
            <div class="evt-doc-row">
                <span class="evt-doc-icon">${evtDocTypeIcon(d.doc_type)}</span>
                <div class="evt-doc-copy">
                    <p>${evtEscapeHtml(d.label || d.file_name || "Document")}</p>
                    <span>${isPersonal ? "Personal" : "Group"} \xB7 ${evtEscapeHtml(d.file_name || "")}</span>
                </div>
                <button ${evtDataAction("evtDownloadDocument", d.id, d.file_path, evtEscapeHtml(d.file_name || "document"))} class="evt-doc-download">Download</button>
            </div>`;
    }).join("");
    const root2 = document.createElement("div");
    root2.id = "evtDocsPanelRoot";
    root2.className = "evt-docs-panel-root";
    root2.innerHTML = `
        <div class="evt-docs-panel-backdrop" ${evtDataAction("evtCloseDocumentsPanel")}></div>
        <section class="evt-docs-panel" role="dialog" aria-modal="true" aria-label="Event documents">
            <header class="evt-docs-panel-head">
                <div>
                    <p>Event Documents</p>
                    <h3>Your files</h3>
                </div>
                <button ${evtDataAction("evtCloseDocumentsPanel")} aria-label="Close documents">\xD7</button>
            </header>
            <div class="evt-docs-list">${rows}</div>
        </section>`;
    document.body.appendChild(root2);
    requestAnimationFrame(() => root2.classList.add("open"));
  }
  function evtCloseDocumentsPanel() {
    const root2 = document.getElementById("evtDocsPanelRoot");
    if (!root2) return;
    root2.classList.remove("open");
    setTimeout(() => root2.remove(), 180);
  }
  function evtDocTypeIcon(type) {
    const icons = { plane_ticket: "\u2708\uFE0F", group_ticket: "\u{1F3AB}", itinerary: "\u{1F4CB}", receipt: "\u{1F9FE}", other: "\u{1F4CE}" };
    return icons[type] || "\u{1F4CE}";
  }
  function evtShowUploadForm(eventId2, targetUserId, targetName) {
    const form = document.getElementById("docUploadForm");
    if (!form) return;
    form.classList.remove("hidden");
    document.getElementById("docTargetUserId").value = targetUserId || "";
    document.getElementById("docEventId").value = eventId2;
    document.getElementById("docUploadTarget").textContent = targetUserId ? `Uploading for: ${targetName}` : "Uploading group document (visible to all RSVPed members)";
    const typeSelect = document.getElementById("docType");
    if (targetUserId) {
      typeSelect.value = "plane_ticket";
    } else {
      typeSelect.value = "itinerary";
    }
  }
  async function evtUploadDocument() {
    const btn = document.getElementById("docUploadBtn");
    btn.disabled = true;
    btn.textContent = "Uploading\u2026";
    try {
      const eventId2 = document.getElementById("docEventId").value;
      const targetUserId = document.getElementById("docTargetUserId").value || null;
      const label = document.getElementById("docLabel").value.trim();
      const docType = document.getElementById("docType").value;
      const fileInput = document.getElementById("docFileInput");
      const file = fileInput.files[0];
      if (!label) throw new Error("Please enter a document label");
      if (!file) throw new Error("Please select a file");
      const ext = file.name.split(".").pop();
      const storagePath = `${eventId2}/${targetUserId || "group"}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: uploadErr } = await supabaseClient.storage.from("event-documents").upload(storagePath, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { error: dbErr } = await supabaseClient.from("event_documents").insert({
        event_id: eventId2,
        uploaded_by: globalThis.evtCurrentUser.id,
        target_user_id: targetUserId,
        doc_type: docType,
        label,
        file_path: storagePath,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type
      });
      if (dbErr) throw dbErr;
      document.getElementById("docUploadForm").classList.add("hidden");
      document.getElementById("docLabel").value = "";
      fileInput.value = "";
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Document upload error:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "Upload";
    }
  }
  async function evtDownloadDocument(docId, filePath, fileName) {
    try {
      const { data, error } = await supabaseClient.storage.from("event-documents").download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert(`Download failed: ${err.message}`);
    }
  }
  async function evtMarkDistributed(docId, eventId2) {
    try {
      const { error } = await supabaseClient.from("event_documents").update({ distributed: true }).eq("id", docId);
      if (error) throw error;
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Mark distributed error:", err);
      alert(`Failed: ${err.message}`);
    }
  }
  async function evtDeleteDocument(docId, eventId2) {
    if (!confirm("Delete this document?")) return;
    try {
      const { data: doc } = await supabaseClient.from("event_documents").select("file_path").eq("id", docId).single();
      if (doc?.file_path) {
        await supabaseClient.storage.from("event-documents").remove([doc.file_path]);
      }
      const { error } = await supabaseClient.from("event_documents").delete().eq("id", docId);
      if (error) throw error;
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Delete document error:", err);
      alert(`Delete failed: ${err.message}`);
    }
  }
  publishGlobals({
    evtBuildDocumentsHtml: evtBuildDocumentsHtml2,
    evtOpenDocumentsPanel,
    evtCloseDocumentsPanel,
    evtShowUploadForm,
    evtUploadDocument,
    evtDownloadDocument,
    evtMarkDistributed,
    evtDeleteDocument
  });

  // js/portal/events/detail/map-live.js
  var evtMapInstance = null;
  var evtMapMarkers = {};
  var evtMapRealtimeSub = null;
  var evtMapSharingActive = false;
  var evtMapWatchId = null;
  function evtIsMapAvailable(event) {
    if (!event) return false;
    const now = /* @__PURE__ */ new Date();
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 4 * 60 * 60 * 1e3);
    const mapEnd = new Date(end.getTime() + 24 * 60 * 60 * 1e3);
    return now >= start && now <= mapEnd;
  }
  function evtBuildMapHtml2(event, hasRsvp, isHost) {
    if (event.event_type !== "llc") return "";
    if (!hasRsvp && !isHost) return "";
    if (!evtIsMapAvailable(event)) return "";
    return `
        <div class="mt-6 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">\u{1F4CD}</span>
                <h4 class="text-sm font-bold text-gray-800">Live Event Map</h4>
            </div>

            <!-- Privacy Banner -->
            <div class="mb-3 p-2.5 bg-white/60 border border-emerald-200 rounded-lg flex items-start gap-2">
                <svg class="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <p class="text-xs text-emerald-700">Location sharing is <strong>opt-in only</strong>. Your position is only visible to other RSVPed members during the event. You can stop sharing at any time.</p>
            </div>

            <!-- Sharing Toggle -->
            <div class="flex items-center justify-between bg-white rounded-xl p-3 mb-3 border border-gray-100">
                <div>
                    <div class="text-sm font-semibold text-gray-800" id="mapSharingLabel">Share My Location</div>
                    <div class="text-xs text-gray-500 mt-0.5" id="mapSharingStatus">Not sharing</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="mapSharingToggle" onchange="evtToggleLocationSharing('${event.id}')" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
            </div>

            <!-- Map Container -->
            <div id="eventMapContainer" class="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                <div class="flex items-center justify-center h-full text-sm text-gray-400">
                    <button ${evtDataAction("evtInitMap", event.id)} class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                        Open Map
                    </button>
                </div>
            </div>
        </div>`;
  }
  async function evtInitMap(eventId2) {
    const container = document.getElementById("eventMapContainer");
    if (!container) return;
    container.innerHTML = '<div id="eventMap" class="w-full h-full"></div>';
    try {
      if (typeof window.evtEnsureLeaflet === "function") await window.evtEnsureLeaflet();
    } catch (err) {
      console.error("Leaflet load error:", err);
      container.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-red-500">Map library failed to load. Please refresh.</div>';
      return;
    }
    if (typeof L === "undefined") {
      container.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-red-500">Map library failed to load. Please refresh.</div>';
      return;
    }
    const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
    const defaultCenter = [39.8283, -98.5795];
    const defaultZoom = 4;
    evtMapInstance = L.map("eventMap", {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '\xA9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(evtMapInstance);
    const { data: locations } = await supabaseClient.from("event_locations").select("*, profiles:user_id(first_name, last_name, profile_picture_url)").eq("event_id", eventId2).eq("sharing_active", true);
    if (locations && locations.length > 0) {
      const bounds = [];
      for (const loc of locations) {
        evtAddMapMarker(loc);
        bounds.push([loc.latitude, loc.longitude]);
      }
      if (bounds.length > 0) {
        evtMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
    evtMapRealtimeSub = supabaseClient.channel(`event-locations-${eventId2}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_locations", filter: `event_id=eq.${eventId2}` },
      (payload) => evtHandleLocationChange(payload)
    ).subscribe();
  }
  function evtAddMapMarker(loc) {
    if (!evtMapInstance) return;
    const name = loc.profiles ? `${loc.profiles.first_name || ""} ${loc.profiles.last_name || ""}`.trim() : "Member";
    const isMe = loc.user_id === globalThis.evtCurrentUser?.id;
    const initial = (name[0] || "?").toUpperCase();
    const iconHtml = `<div style="
        width:32px;height:32px;border-radius:50%;
        background:${isMe ? "#10b981" : "#6366f1"};
        color:white;display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:13px;border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,.2);
    ">${initial}</div>`;
    const icon = L.divIcon({
      html: iconHtml,
      className: "event-map-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    if (evtMapMarkers[loc.user_id]) {
      evtMapInstance.removeLayer(evtMapMarkers[loc.user_id]);
    }
    const marker = L.marker([loc.latitude, loc.longitude], { icon }).addTo(evtMapInstance).bindPopup(`<strong>${evtEscapeHtml(name)}</strong>${isMe ? " (you)" : ""}<br><span style="font-size:11px;color:#888">Updated ${new Date(loc.updated_at).toLocaleTimeString()}</span>`);
    evtMapMarkers[loc.user_id] = marker;
  }
  async function evtHandleLocationChange(payload) {
    if (payload.eventType === "DELETE" || payload.new && !payload.new.sharing_active) {
      const userId = payload.old?.user_id || payload.new?.user_id;
      if (userId && evtMapMarkers[userId]) {
        evtMapInstance?.removeLayer(evtMapMarkers[userId]);
        delete evtMapMarkers[userId];
      }
      return;
    }
    const loc = payload.new;
    if (!loc || !loc.sharing_active) return;
    const { data: profile } = await supabaseClient.from("profiles").select("first_name, last_name, profile_picture_url").eq("id", loc.user_id).maybeSingle();
    evtAddMapMarker({ ...loc, profiles: profile });
  }
  async function evtToggleLocationSharing(eventId2) {
    const toggle = document.getElementById("mapSharingToggle");
    const statusEl = document.getElementById("mapSharingStatus");
    if (toggle.checked) {
      if (!("geolocation" in navigator)) {
        alert("Geolocation is not supported by your browser.");
        toggle.checked = false;
        return;
      }
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 1e4,
            maximumAge: 0
          });
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const { error } = await supabaseClient.from("event_locations").upsert({
          event_id: eventId2,
          user_id: globalThis.evtCurrentUser.id,
          latitude: lat,
          longitude: lng,
          sharing_active: true,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }, { onConflict: "event_id,user_id" });
        if (error) throw error;
        evtMapSharingActive = true;
        statusEl.textContent = "Sharing your location";
        statusEl.classList.add("text-emerald-600");
        statusEl.classList.remove("text-gray-500");
        if (evtMapInstance) {
          evtMapInstance.setView([lat, lng], 15);
        }
        evtMapWatchId = navigator.geolocation.watchPosition(
          (newPos) => evtUpdateMyLocation(eventId2, newPos),
          (err) => console.warn("Watch error:", err),
          { enableHighAccuracy: true, maximumAge: 15e3, timeout: 2e4 }
        );
      } catch (err) {
        console.error("Location sharing error:", err);
        toggle.checked = false;
        if (err.code === 1) {
          alert("Location permission denied. Please allow location access in your browser settings.");
        } else {
          alert(`Could not get your location: ${err.message}`);
        }
      }
    } else {
      evtMapSharingActive = false;
      if (evtMapWatchId !== null) {
        navigator.geolocation.clearWatch(evtMapWatchId);
        evtMapWatchId = null;
      }
      await supabaseClient.from("event_locations").update({ sharing_active: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id);
      statusEl.textContent = "Not sharing";
      statusEl.classList.remove("text-emerald-600");
      statusEl.classList.add("text-gray-500");
    }
  }
  async function evtUpdateMyLocation(eventId2, pos) {
    if (!evtMapSharingActive) return;
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    await supabaseClient.from("event_locations").upsert({
      event_id: eventId2,
      user_id: globalThis.evtCurrentUser.id,
      latitude: lat,
      longitude: lng,
      sharing_active: true,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }, { onConflict: "event_id,user_id" });
  }
  function evtCleanupMap2() {
    if (evtMapWatchId !== null) {
      navigator.geolocation.clearWatch(evtMapWatchId);
      evtMapWatchId = null;
    }
    if (evtMapRealtimeSub) {
      supabaseClient.removeChannel(evtMapRealtimeSub);
      evtMapRealtimeSub = null;
    }
    if (evtMapInstance) {
      evtMapInstance.remove();
      evtMapInstance = null;
    }
    evtMapMarkers = {};
    evtMapSharingActive = false;
  }
  publishGlobals({
    evtBuildMapHtml: evtBuildMapHtml2,
    evtInitMap,
    evtToggleLocationSharing,
    evtCleanupMap: evtCleanupMap2
  });

  // js/portal/events/detail/competition.js
  async function evtBuildCompetitionHtml2(event, isHost) {
    if (event.event_type !== "competition") return "";
    const config = event.competition_config || {};
    const eventId2 = event.id;
    const { data: phases } = await supabaseClient.from("competition_phases").select("*").eq("event_id", eventId2).order("phase_num", { ascending: true });
    const { data: entries } = await supabaseClient.from("competition_entries").select("*, profiles:user_id(first_name, last_name, profile_picture_url)").eq("event_id", eventId2).eq("moderated", false).order("submitted_at", { ascending: true });
    const myEntry = (entries || []).find((e) => e.user_id === globalThis.evtCurrentUser.id);
    const { data: myVote } = await supabaseClient.from("competition_votes").select("entry_id").eq("event_id", eventId2).eq("voter_id", globalThis.evtCurrentUser.id).maybeSingle();
    const { data: winners } = await supabaseClient.from("competition_winners").select("*, profiles:user_id(first_name, last_name, profile_picture_url), competition_entries!competition_winners_entry_id_fkey(title)").eq("event_id", eventId2).order("place", { ascending: true });
    const { count: contributionCount } = await supabaseClient.from("prize_pool_contributions").select("id", { count: "exact", head: true }).eq("event_id", eventId2);
    const { count: totalEntryCount } = await supabaseClient.from("competition_entries").select("id", { count: "exact", head: true }).eq("event_id", eventId2);
    const now = /* @__PURE__ */ new Date();
    const currentPhase = (phases || []).find((p) => p.status === "active") || (phases || []).find((p) => p.status === "extended") || { phase_num: 0, status: "pending" };
    const activePhaseNum = currentPhase.phase_num;
    let displayPhaseNum = activePhaseNum;
    if (!activePhaseNum) {
      for (const p of phases || []) {
        if (now >= new Date(p.starts_at) && now < new Date(p.ends_at)) {
          displayPhaseNum = p.phase_num;
          break;
        }
      }
    }
    const entryList = entries || [];
    const winnerList = winners || [];
    const phaseList = phases || [];
    const phaseTimelineHtml = phaseList.map((p) => {
      const isActive = p.status === "active" || p.status === "extended";
      const isCompleted = p.status === "completed";
      const isPending = p.status === "pending";
      const isCancelled = p.status === "cancelled";
      const statusIcon = isCompleted ? "\u2705" : isActive ? "\u{1F535}" : isCancelled ? "\u274C" : "\u23F3";
      const statusColor = isCompleted ? "text-emerald-600" : isActive ? "text-blue-600" : isCancelled ? "text-red-500" : "text-gray-400";
      const bgColor = isActive ? "bg-blue-50 border-blue-200" : isCompleted ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200";
      const startStr = new Date(p.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endStr = new Date(p.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      let countdownHtml = "";
      if (isActive) {
        const msLeft = new Date(p.ends_at) - now;
        if (msLeft > 0) {
          const daysLeft = Math.floor(msLeft / 864e5);
          const hoursLeft = Math.floor(msLeft % 864e5 / 36e5);
          countdownHtml = `<span class="text-xs font-bold text-blue-700 ml-2">${daysLeft > 0 ? daysLeft + "d " : ""}${hoursLeft}h left</span>`;
        }
      }
      return `
            <div class="flex items-center gap-3 p-2.5 rounded-xl border ${bgColor}">
                <span class="text-base">${statusIcon}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                        <span class="text-sm font-semibold ${statusColor}">${p.name}</span>
                        ${p.status === "extended" ? '<span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Extended</span>' : ""}
                        ${countdownHtml}
                    </div>
                    <p class="text-xs text-gray-500">${startStr} \u2192 ${endStr}</p>
                </div>
            </div>`;
    }).join("");
    const totalPool = event.total_prize_pool_cents || 0;
    const entryFee = config.entry_fee_cents || 0;
    const housePct = config.house_pct || 0;
    const netPool = Math.round(totalPool * (1 - housePct / 100));
    let prizePoolHtml = `
        <div class="mt-4 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-lg">\u{1F4B0}</span>
                    <h4 class="text-sm font-bold text-gray-800">Prize Pool</h4>
                </div>
                <span class="text-lg font-extrabold text-amber-700">${formatCurrency(totalPool)}</span>
            </div>
            ${housePct > 0 ? `<p class="text-xs text-gray-500 mb-1">${housePct}% house fee \u2192 Net payout: <strong>${formatCurrency(netPool)}</strong></p>` : ""}
            ${entryFee > 0 ? `<p class="text-xs text-gray-400">${formatCurrency(entryFee)} entry fee \xD7 ${entryList.length} entries = ${formatCurrency(entryFee * entryList.length)} from fees</p>` : ""}
            <p class="text-xs text-gray-400">${contributionCount || 0} community contributions</p>
            <button ${evtDataAction("evtContributeToPrizePool", eventId2)} class="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
                \u{1F4B8} Contribute to Prize Pool
            </button>
        </div>`;
    const tiers = event.winner_tier_config || [{ place: 1, pct: 100 }];
    let tierHtml = "";
    if (tiers.length > 0 && netPool > 0) {
      const tierEmoji = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
      tierHtml = `
            <div class="mt-2 flex items-center gap-2 flex-wrap">
                ${tiers.map((t) => `<span class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">${tierEmoji[t.place - 1] || ""} ${t.pct}% = ${formatCurrency(Math.round(netPool * t.pct / 100))}</span>`).join("")}
            </div>`;
    }
    let registrationHtml = "";
    if (displayPhaseNum <= 1) {
      if (myEntry) {
        registrationHtml = `
                <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                    <span class="text-lg">\u2705</span>
                    <div>
                        <p class="text-sm font-bold text-emerald-700">You're registered as a competitor!</p>
                        <p class="text-xs text-emerald-600">Your entry will be submitted in Phase 2.</p>
                    </div>
                </div>`;
      } else {
        registrationHtml = `
                <div class="mt-4">
                    <button ${evtDataAction("evtJoinCompetition", eventId2)} class="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                        \u{1F3C6} Join as Competitor${entryFee > 0 ? ` \u2014 ${formatCurrency(entryFee)}` : ""}
                    </button>
                    <p class="text-xs text-gray-400 text-center mt-1">${entryList.length} competitor${entryList.length !== 1 ? "s" : ""} registered</p>
                </div>`;
      }
    }
    let submissionHtml = "";
    if (displayPhaseNum === 2 || displayPhaseNum <= 2 && myEntry && !myEntry.file_url && !myEntry.external_url && myEntry.entry_type !== "text") {
      if (myEntry && (myEntry.file_url || myEntry.external_url || myEntry.title)) {
        submissionHtml = `
                <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p class="text-sm font-bold text-emerald-700">\u2705 Entry Submitted: "${evtEscapeHtml(myEntry.title)}"</p>
                    <p class="text-xs text-emerald-600 mt-0.5">Submitted ${new Date(myEntry.submitted_at).toLocaleDateString()}</p>
                </div>`;
      } else if (myEntry && displayPhaseNum === 2) {
        submissionHtml = evtBuildSubmitFormHtml(eventId2, config);
      }
    }
    let galleryHtml = "";
    const showEntries = config.entries_visible_before_voting || displayPhaseNum >= 3;
    if (showEntries && entryList.length > 0) {
      const entryCards = entryList.map((entry) => {
        const p = entry.profiles;
        const name = p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Unknown";
        const initials = ((p?.first_name?.[0] || "") + (p?.last_name?.[0] || "")).toUpperCase();
        const avatar = p?.profile_picture_url ? `<img src="${p.profile_picture_url}" class="w-8 h-8 rounded-full object-cover" alt="">` : `<div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold">${initials}</div>`;
        const isVoted = myVote?.entry_id === entry.id;
        const voteCountDisplay = config.vote_tally_visible || displayPhaseNum >= 4 ? `<span class="text-xs text-gray-500">${entry.vote_count} vote${entry.vote_count !== 1 ? "s" : ""}</span>` : "";
        let contentPreview = "";
        if (entry.entry_type === "file" && entry.file_url) {
          if (entry.mime_type?.startsWith("image/")) {
            contentPreview = `<img src="${entry.file_url}" class="w-full h-32 object-cover rounded-lg mt-2" alt="">`;
          } else {
            contentPreview = `<div class="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500">\u{1F4CE} ${evtEscapeHtml(entry.file_name || "File")}</div>`;
          }
        } else if (entry.entry_type === "link" && entry.external_url) {
          contentPreview = `<a href="${entry.external_url}" target="_blank" class="mt-2 block text-xs text-blue-600 hover:underline truncate">\u{1F517} ${evtEscapeHtml(entry.external_url)}</a>`;
        }
        let voteBtn = "";
        if (displayPhaseNum === 3 && !myVote && entry.user_id !== globalThis.evtCurrentUser.id) {
          voteBtn = `<button ${evtDataAction("evtCastVote", eventId2, entry.id)} class="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">Vote</button>`;
        } else if (isVoted) {
          voteBtn = `<div class="mt-2 text-center text-xs font-bold text-blue-600">\u2713 Your Vote</div>`;
        }
        let modBtn = "";
        if (isHost && displayPhaseNum < 3) {
          modBtn = `<button ${evtDataAction("evtModerateEntry", eventId2, entry.id)} class="mt-1 text-xs text-red-400 hover:text-red-600">Remove Entry</button>`;
        }
        const winnerEntry = winnerList.find((w) => w.entry_id === entry.id);
        const winnerBadge = winnerEntry ? `<span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">${["\u{1F947}", "\u{1F948}", "\u{1F949}"][winnerEntry.place - 1] || ""} ${winnerEntry.place === 1 ? "1st" : winnerEntry.place === 2 ? "2nd" : "3rd"} Place</span>` : "";
        return `
                <div class="bg-white border border-gray-200 rounded-xl p-3 ${winnerEntry ? "ring-2 ring-amber-400" : ""}">
                    <div class="flex items-center gap-2 mb-1">
                        ${avatar}
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-800 truncate">${evtEscapeHtml(name)}</p>
                            <p class="text-xs text-gray-400">${evtEscapeHtml(entry.title)}</p>
                        </div>
                        ${winnerBadge}
                    </div>
                    ${entry.description ? `<p class="text-xs text-gray-600 mt-1 line-clamp-3">${evtEscapeHtml(entry.description)}</p>` : ""}
                    ${contentPreview}
                    <div class="flex items-center justify-between mt-2">
                        ${voteCountDisplay}
                        ${modBtn}
                    </div>
                    ${voteBtn}
                </div>`;
      }).join("");
      galleryHtml = `
            <div class="mt-5">
                <h4 class="text-sm font-bold text-gray-700 mb-3">\u{1F4CB} Entries (${entryList.length})</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${entryCards}</div>
            </div>`;
    }
    let votingStatusHtml = "";
    if (displayPhaseNum === 3) {
      if (myVote) {
        votingStatusHtml = `
                <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
                    <span class="text-lg">\u{1F5F3}\uFE0F</span>
                    <p class="text-sm font-semibold text-blue-700">You've cast your vote!</p>
                </div>`;
      } else if (myEntry) {
        votingStatusHtml = `
                <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                    <span class="text-lg">\u26A0\uFE0F</span>
                    <p class="text-sm text-amber-700">You can't vote for your own entry, but you can vote for others!</p>
                </div>`;
      }
    }
    let thresholdHtml = "";
    if (config.min_entries && displayPhaseNum <= 2) {
      const current = entryList.length;
      const needed = config.min_entries;
      const pct = Math.min(100, Math.round(current / needed * 100));
      const met = current >= needed;
      thresholdHtml = `
            <div class="mt-3 p-3 ${met ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"} border rounded-xl">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-semibold ${met ? "text-emerald-700" : "text-amber-700"}">${met ? "\u2705 Minimum entries met!" : "\u26A0\uFE0F Minimum entries needed"}</span>
                    <span class="text-xs text-gray-500">${current} / ${needed}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div class="${met ? "bg-emerald-500" : "bg-amber-500"} h-2 rounded-full transition-all" style="width:${pct}%"></div>
                </div>
                ${!met ? `<p class="text-xs text-amber-600 mt-1">If not met, competition may be extended ${config.extension_days || 3} days or cancelled with full refund.</p>` : ""}
            </div>`;
    }
    let resultsHtml = "";
    if (displayPhaseNum >= 4 || winnerList.length > 0) {
      if (winnerList.length > 0) {
        const tierEmoji = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
        const winnerCards = winnerList.map((w) => {
          const p = w.profiles;
          const name = p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Unknown";
          const entryTitle = w.competition_entries?.title || "";
          return `
                    <div class="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span class="text-2xl">${tierEmoji[w.place - 1] || "\u{1F3C5}"}</span>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-gray-900">${evtEscapeHtml(name)}</p>
                            <p class="text-xs text-gray-500">"${evtEscapeHtml(entryTitle)}"</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-extrabold text-amber-700">${formatCurrency(w.prize_amount_cents)}</p>
                            <p class="text-xs text-gray-400">${w.payout_status}</p>
                        </div>
                    </div>`;
        }).join("");
        resultsHtml = `
                <div class="mt-5">
                    <h4 class="text-sm font-bold text-gray-700 mb-3">\u{1F3C6} Winners</h4>
                    <div class="space-y-2">${winnerCards}</div>
                </div>`;
      } else if (displayPhaseNum >= 4 && isHost) {
        resultsHtml = `
                <div class="mt-4">
                    <button ${evtDataAction("evtFinalizeCompetition", eventId2)} class="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                        \u{1F3C6} Finalize Results & Announce Winners
                    </button>
                </div>`;
      }
    }
    let phaseControlHtml = "";
    if (isHost) {
      const nextPhase = phaseList.find((p) => p.status === "pending");
      const activeP = phaseList.find((p) => p.status === "active" || p.status === "extended");
      let buttons = "";
      if (activeP && !nextPhase) {
      }
      if (activeP) {
        buttons += `<button ${evtDataAction("evtAdvancePhase", eventId2, activeP.phase_num)} class="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition">Complete Phase ${activeP.phase_num} \u2192 Next</button>`;
        if (activeP.phase_num === 2 && !activeP.extended_once) {
          buttons += `<button ${evtDataAction("evtExtendPhase", eventId2, activeP.phase_num)} class="bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-amber-600 transition">Extend ${config.extension_days || 3} Days</button>`;
        }
      }
      if (!activeP && nextPhase) {
        buttons += `<button ${evtDataAction("evtStartPhase", eventId2, nextPhase.phase_num)} class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition">Start Phase ${nextPhase.phase_num}: ${nextPhase.name}</button>`;
      }
      if (buttons) {
        phaseControlHtml = `
                <div class="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <h5 class="text-xs font-bold text-rose-700 uppercase tracking-wide mb-2">Phase Management</h5>
                    <div class="flex flex-wrap gap-2">${buttons}</div>
                </div>`;
      }
    }
    return `
        <div class="mt-6 p-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">\u{1F3C6}</span>
                <h4 class="text-sm font-bold text-gray-800">Competition</h4>
                <span class="ml-auto text-xs text-gray-500">${entryList.length} entrant${entryList.length !== 1 ? "s" : ""}</span>
            </div>

            <!-- Phase Timeline -->
            <div class="space-y-2">${phaseTimelineHtml}</div>

            ${thresholdHtml}
            ${registrationHtml}
            ${submissionHtml}
            ${votingStatusHtml}
            ${phaseControlHtml}
        </div>
        ${prizePoolHtml}
        ${tierHtml}
        ${galleryHtml}
        ${resultsHtml}
    `;
  }
  function evtBuildSubmitFormHtml(eventId2, config) {
    const entryType = config.entry_type || "any";
    const fileInput = entryType === "file" || entryType === "any" ? `
        <div id="compFileGroup">
            <label class="text-xs text-gray-600 font-semibold">Upload File</label>
            <input type="file" id="compEntryFile" accept="image/*,application/pdf,video/*"
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <p class="text-xs text-gray-400 mt-0.5">Images/PDFs: max 10MB \u2022 Video: max 50MB</p>
        </div>` : "";
    const linkInput = entryType === "link" || entryType === "any" ? `
        <div>
            <label class="text-xs text-gray-600 font-semibold">External Link</label>
            <input type="url" id="compEntryLink" placeholder="https://..." 
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        </div>` : "";
    return `
        <div class="mt-4 p-4 bg-white border border-rose-200 rounded-xl space-y-3">
            <h5 class="text-sm font-bold text-gray-800">\u{1F4E4} Submit Your Entry</h5>
            <div>
                <label class="text-xs text-gray-600 font-semibold">Entry Title *</label>
                <input type="text" id="compEntryTitle" maxlength="120" placeholder="Name your entry"
                       class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
                <label class="text-xs text-gray-600 font-semibold">Description</label>
                <textarea id="compEntryDesc" rows="2" maxlength="1000" placeholder="Describe your entry..."
                          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"></textarea>
            </div>
            ${fileInput}
            ${linkInput}
            <button ${evtDataAction("evtSubmitEntry", eventId2)} class="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">
                Submit Entry
            </button>
        </div>`;
  }
  async function evtJoinCompetition(eventId2) {
    try {
      const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
      const config = event?.competition_config || {};
      const entryFee = config.entry_fee_cents || 0;
      if (entryFee > 0) {
        const { data, error: error2 } = await callEdgeFunction("create-event-checkout", {
          event_id: eventId2,
          type: "competition_entry"
        });
        if (error2) throw new Error(error2);
        if (data?.url) window.location.href = data.url;
        return;
      }
      const { error } = await supabaseClient.from("competition_entries").insert({
        event_id: eventId2,
        user_id: globalThis.evtCurrentUser.id,
        title: "Registered",
        entry_type: "text"
      });
      if (error) {
        if (error.code === "23505") {
          alert("You are already registered for this competition!");
          return;
        }
        throw error;
      }
      alert("You are registered! Submit your entry when Phase 2 opens.");
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Join competition error:", err);
      alert(`Failed to join: ${err.message}`);
    }
  }
  async function evtSubmitEntry(eventId2) {
    try {
      const title = document.getElementById("compEntryTitle")?.value?.trim();
      if (!title) {
        alert("Please enter a title for your entry.");
        return;
      }
      const desc = document.getElementById("compEntryDesc")?.value?.trim() || null;
      const fileInput = document.getElementById("compEntryFile");
      const linkInput = document.getElementById("compEntryLink");
      const file = fileInput?.files?.[0];
      const link = linkInput?.value?.trim();
      let entryType = "text";
      let fileUrl = null;
      let fileName = null;
      let fileSizeBytes = null;
      let mimeType = null;
      let externalUrl = null;
      if (file) {
        const isVideo = file.type.startsWith("video/");
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(`File too large. Max ${isVideo ? "50MB" : "10MB"} for ${isVideo ? "video" : "images/PDFs"}.`);
          return;
        }
        const ext = file.name.split(".").pop();
        const path = `${globalThis.evtCurrentUser.id}/${eventId2}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseClient.storage.from("competition-entries").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabaseClient.storage.from("competition-entries").getPublicUrl(path);
        fileUrl = publicUrl;
        fileName = file.name;
        fileSizeBytes = file.size;
        mimeType = file.type;
        entryType = "file";
      } else if (link) {
        externalUrl = link;
        entryType = "link";
      }
      const { error } = await supabaseClient.from("competition_entries").update({
        title,
        description: desc,
        file_url: fileUrl,
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        mime_type: mimeType,
        external_url: externalUrl,
        entry_type: entryType,
        submitted_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id);
      if (error) throw error;
      alert("Entry submitted successfully! \u{1F389}");
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Submit entry error:", err);
      alert(`Failed to submit: ${err.message}`);
    }
  }
  async function evtCastVote(eventId2, entryId) {
    if (!confirm("Cast your vote? This cannot be changed.")) return;
    try {
      const { error } = await supabaseClient.from("competition_votes").insert({
        event_id: eventId2,
        voter_id: globalThis.evtCurrentUser.id,
        entry_id: entryId
      });
      if (error) {
        if (error.message?.includes("Self-voting")) {
          alert("You cannot vote for your own entry!");
          return;
        }
        if (error.code === "23505") {
          alert("You have already voted in this competition!");
          return;
        }
        throw error;
      }
      alert("Vote cast! \u{1F5F3}\uFE0F");
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Vote error:", err);
      alert(`Failed to vote: ${err.message}`);
    }
  }
  async function evtModerateEntry(eventId2, entryId) {
    const reason = prompt("Reason for removing this entry:");
    if (reason === null) return;
    try {
      const { error } = await supabaseClient.from("competition_entries").update({
        moderated: true,
        moderated_by: globalThis.evtCurrentUser.id,
        moderation_reason: reason || "Removed by host"
      }).eq("id", entryId);
      if (error) throw error;
      alert("Entry removed.");
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Moderate entry error:", err);
      alert(`Failed to remove: ${err.message}`);
    }
  }
  async function evtContributeToPrizePool(eventId2) {
    const dollars = prompt("How much would you like to contribute? ($)");
    if (!dollars) return;
    const cents = Math.round(parseFloat(dollars) * 100);
    if (!cents || cents < 100) {
      alert("Minimum contribution is $1.");
      return;
    }
    try {
      const { data, error } = await callEdgeFunction("create-event-checkout", {
        event_id: eventId2,
        type: "prize_pool",
        amount_cents: cents
      });
      if (error) throw new Error(error);
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error("Prize pool contribution error:", err);
      alert(`Failed: ${err.message}`);
    }
  }
  async function evtStartPhase(eventId2, phaseNum) {
    try {
      const { error } = await supabaseClient.from("competition_phases").update({ status: "active" }).eq("event_id", eventId2).eq("phase_num", phaseNum);
      if (error) throw error;
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Start phase error:", err);
      alert(`Failed: ${err.message}`);
    }
  }
  async function evtAdvancePhase(eventId2, currentPhaseNum) {
    if (!confirm(`Complete Phase ${currentPhaseNum} and advance to next?`)) return;
    try {
      const { error: e1 } = await supabaseClient.from("competition_phases").update({ status: "completed" }).eq("event_id", eventId2).eq("phase_num", currentPhaseNum);
      if (e1) throw e1;
      const nextNum = currentPhaseNum + 1;
      if (nextNum <= 4) {
        const { error: e2 } = await supabaseClient.from("competition_phases").update({ status: "active" }).eq("event_id", eventId2).eq("phase_num", nextNum);
        if (e2) throw e2;
      }
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Advance phase error:", err);
      alert(`Failed: ${err.message}`);
    }
  }
  async function evtExtendPhase(eventId2, phaseNum) {
    try {
      const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
      const config = event?.competition_config || {};
      const extensionDays = config.extension_days || 3;
      const { data: phase } = await supabaseClient.from("competition_phases").select("ends_at").eq("event_id", eventId2).eq("phase_num", phaseNum).single();
      if (!phase) throw new Error("Phase not found");
      const newEnd = new Date(phase.ends_at);
      newEnd.setDate(newEnd.getDate() + extensionDays);
      const { error } = await supabaseClient.from("competition_phases").update({
        status: "extended",
        ends_at: newEnd.toISOString(),
        extended_once: true
      }).eq("event_id", eventId2).eq("phase_num", phaseNum);
      if (error) throw error;
      alert(`Phase extended by ${extensionDays} days.`);
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Extend phase error:", err);
      alert(`Failed: ${err.message}`);
    }
  }
  async function evtFinalizeCompetition(eventId2) {
    if (!confirm("Finalize results and announce winners? This cannot be undone.")) return;
    try {
      const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
      const config = event?.competition_config || {};
      const tiers = event?.winner_tier_config || [{ place: 1, pct: 100 }];
      const totalPool = event?.total_prize_pool_cents || 0;
      const housePct = config.house_pct || 0;
      const netPool = Math.round(totalPool * (1 - housePct / 100));
      const { data: entries } = await supabaseClient.from("competition_entries").select("id, user_id, title, vote_count").eq("event_id", eventId2).eq("moderated", false).order("vote_count", { ascending: false });
      if (!entries || entries.length === 0) {
        alert("No entries to finalize.");
        return;
      }
      const winners = [];
      let currentRank = 1;
      for (const tier of tiers) {
        if (currentRank > entries.length) break;
        const targetVoteCount = entries[currentRank - 1].vote_count;
        const tiedEntries = entries.filter(
          (e) => e.vote_count === targetVoteCount && !winners.some((w) => w.entry_id === e.id)
        );
        const tierPrize = Math.round(netPool * tier.pct / 100);
        const splitPrize = Math.round(tierPrize / tiedEntries.length);
        for (const entry of tiedEntries) {
          winners.push({
            event_id: eventId2,
            entry_id: entry.id,
            user_id: entry.user_id,
            place: tier.place,
            prize_amount_cents: splitPrize,
            payout_status: splitPrize > 0 ? "pending" : "paid",
            needs_1099: splitPrize >= 6e4
            // $600 threshold
          });
        }
        currentRank += tiedEntries.length;
      }
      if (winners.length > 0) {
        const { error } = await supabaseClient.from("competition_winners").insert(winners);
        if (error) throw error;
      }
      await supabaseClient.from("competition_phases").update({ status: "completed" }).eq("event_id", eventId2).eq("phase_num", 4);
      await supabaseClient.from("events").update({ status: "completed" }).eq("id", eventId2);
      alert("Competition finalized! Winners announced! \u{1F3C6}\u{1F389}");
      await globalThis.evtLoadEvents();
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Finalize competition error:", err);
      alert(`Failed: ${err.message}`);
    }
  }
  function evtRecalcCompTiers() {
    const t1 = parseInt(document.getElementById("compTier1Pct")?.value) || 0;
    const t2 = parseInt(document.getElementById("compTier2Pct")?.value) || 0;
    const t3 = parseInt(document.getElementById("compTier3Pct")?.value) || 0;
    const totalEl = document.getElementById("compTierTotal");
    const total = t1 + t2 + t3;
    if (totalEl) {
      totalEl.textContent = `Total: ${total}%`;
      totalEl.classList.toggle("text-red-500", total !== 100);
      totalEl.classList.toggle("text-gray-400", total === 100);
    }
  }
  window.PortalEvents = window.PortalEvents || {};
  window.PortalEvents.competition = window.PortalEvents.competition || {};
  window.PortalEvents.competition.buildHtml = evtBuildCompetitionHtml2;
  window.PortalEvents.competition.buildSubmitFormHtml = evtBuildSubmitFormHtml;
  window.PortalEvents.competition.join = evtJoinCompetition;
  window.PortalEvents.competition.submitEntry = evtSubmitEntry;
  window.PortalEvents.competition.castVote = evtCastVote;
  window.PortalEvents.competition.moderateEntry = evtModerateEntry;
  window.PortalEvents.competition.contributeToPrizePool = evtContributeToPrizePool;
  window.PortalEvents.competition.startPhase = evtStartPhase;
  window.PortalEvents.competition.advancePhase = evtAdvancePhase;
  window.PortalEvents.competition.extendPhase = evtExtendPhase;
  window.PortalEvents.competition.finalize = evtFinalizeCompetition;
  window.PortalEvents.competition.recalcTiers = evtRecalcCompTiers;
  publishGlobals({
    evtBuildCompetitionHtml: evtBuildCompetitionHtml2,
    evtBuildSubmitFormHtml,
    evtJoinCompetition,
    evtSubmitEntry,
    evtCastVote,
    evtModerateEntry,
    evtContributeToPrizePool,
    evtStartPhase,
    evtAdvancePhase,
    evtExtendPhase,
    evtFinalizeCompetition,
    evtRecalcCompTiers
  });

  // js/portal/events/detail/scrapbook.js
  async function evtBuildScrapbookHtml2(event, hasRsvp) {
    if (event.status !== "completed") return "";
    const { data: photos } = await supabaseClient.from("event_photos").select("*, profiles:user_id(first_name, last_name, profile_picture_url)").eq("event_id", event.id).order("uploaded_at", { ascending: false });
    const photoList = photos || [];
    const canUpload = hasRsvp || typeof canManageEvents === "function" && canManageEvents();
    let galleryHtml = "";
    if (photoList.length) {
      galleryHtml = `
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                ${photoList.map((p) => {
        const name = p.profiles ? `${p.profiles.first_name || ""} ${p.profiles.last_name || ""}`.trim() : "Member";
        const canDelete = p.user_id === globalThis.evtCurrentUser.id || typeof canManageEvents === "function" && canManageEvents();
        return `
                        <div class="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
                            <img src="${p.file_url}" alt="${evtEscapeHtml(p.caption || "")}" class="w-full h-full object-cover cursor-pointer" ${evtDataAction("evtViewPhoto", p.file_url, evtEscapeHtml(p.caption || ""), evtEscapeHtml(name))}>
                            ${p.caption ? `<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p class="text-white text-[10px] leading-tight truncate">${evtEscapeHtml(p.caption)}</p>
                            </div>` : ""}
                            <div class="absolute top-1 left-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                                <span class="text-white text-[9px] font-medium">${evtEscapeHtml(name)}</span>
                            </div>
                            ${canDelete ? `
                            <button ${evtDataAction("evtDeletePhoto", event.id, p.id, p.file_url)} class="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs">&times;</button>
                            ` : ""}
                        </div>`;
      }).join("")}
            </div>`;
    } else {
      galleryHtml = `<p class="text-xs text-gray-400 mt-2">No photos yet. Be the first to share a memory!</p>`;
    }
    const uploadHtml = canUpload ? `
        <div class="mt-3 p-3 border-2 border-dashed border-gray-200 rounded-xl text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition" id="scrapbookDropzone" onclick="document.getElementById('scrapbookFileInput').click()">
            <input type="file" id="scrapbookFileInput" accept="image/*" multiple class="hidden" onchange="evtHandlePhotoSelect('${event.id}')">
            <svg class="w-6 h-6 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <p class="text-xs text-gray-400">Drop photos or tap to upload</p>
            <p class="text-[10px] text-gray-300 mt-0.5">JPG, PNG, WebP \u2022 Max 10MB per photo</p>
        </div>
        <div id="scrapbookUploadProgress" class="hidden mt-2">
            <div class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-brand-500" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                <span class="text-xs text-brand-600" id="scrapbookUploadText">Uploading...</span>
            </div>
        </div>
    ` : "";
    return `
        <div class="mt-6 p-4 bg-white rounded-xl border border-gray-200/80">
            <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    \u{1F4F8} Scrapbook
                    <span class="text-xs font-normal text-gray-400">(${photoList.length} photo${photoList.length !== 1 ? "s" : ""})</span>
                </h4>
            </div>
            ${galleryHtml}
            ${uploadHtml}
        </div>
    `;
  }
  async function evtHandlePhotoSelect(eventId2) {
    const input = document.getElementById("scrapbookFileInput");
    const files = Array.from(input?.files || []);
    if (!files.length) return;
    const progress = document.getElementById("scrapbookUploadProgress");
    const progressText = document.getElementById("scrapbookUploadText");
    if (progress) progress.classList.remove("hidden");
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    let uploaded = 0;
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        alert(`Skipped "${file.name}" \u2014 only JPG, PNG, WebP, GIF allowed.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`Skipped "${file.name}" \u2014 max 10MB per photo.`);
        continue;
      }
      if (progressText) progressText.textContent = `Uploading ${uploaded + 1} of ${files.length}...`;
      try {
        const ext = file.name.split(".").pop();
        const filePath = `${globalThis.evtCurrentUser.id}/${eventId2}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadErr } = await supabaseClient.storage.from("event-photos").upload(filePath, file, { upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabaseClient.storage.from("event-photos").getPublicUrl(filePath);
        let caption = null;
        if (files.length === 1) {
          caption = prompt("Add a caption? (optional)");
        }
        const { error: insertErr } = await supabaseClient.from("event_photos").insert({
          event_id: eventId2,
          user_id: globalThis.evtCurrentUser.id,
          file_url: urlData.publicUrl,
          caption: caption || null
        });
        if (insertErr) throw insertErr;
        uploaded++;
      } catch (err) {
        console.error("Photo upload error:", err);
        alert("Failed to upload photo: " + (err.message || "Unknown error"));
      }
    }
    if (progress) progress.classList.add("hidden");
    if (input) input.value = "";
    if (uploaded > 0) {
      alert(`\u2705 ${uploaded} photo${uploaded > 1 ? "s" : ""} uploaded!`);
      globalThis.evtOpenDetail(eventId2);
    }
  }
  async function evtDeletePhoto(eventId2, photoId, fileUrl) {
    if (!confirm("Delete this photo?")) return;
    try {
      const { error } = await supabaseClient.from("event_photos").delete().eq("id", photoId);
      if (error) throw error;
      try {
        const url = new URL(fileUrl);
        const path = url.pathname.split("/event-photos/")[1];
        if (path) {
          await supabaseClient.storage.from("event-photos").remove([decodeURIComponent(path)]);
        }
      } catch (e) {
        console.warn("Storage cleanup failed (non-critical):", e);
      }
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Delete photo error:", err);
      alert("Failed to delete photo.");
    }
  }
  function evtViewPhoto(url, caption, name) {
    const existing = document.getElementById("photoLightbox");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "photoLightbox";
    overlay.className = "fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4";
    overlay.innerHTML = `
        <div class="max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <img src="${url}" alt="${caption}" class="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl">
            ${caption || name ? `
            <div class="mt-3 text-center">
                ${caption ? `<p class="text-white text-sm">${evtEscapeHtml(caption)}</p>` : ""}
                ${name ? `<p class="text-gray-400 text-xs mt-1">\u{1F4F7} ${evtEscapeHtml(name)}</p>` : ""}
            </div>` : ""}
        </div>
        <button class="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light transition" onclick="document.getElementById('photoLightbox').remove()">&times;</button>
    `;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }
  publishGlobals({
    evtBuildScrapbookHtml: evtBuildScrapbookHtml2,
    evtHandlePhotoSelect,
    evtDeletePhoto,
    evtViewPhoto
  });

  // js/portal/events/detail/scanner.js
  function evtParseQrData(raw) {
    try {
      const url = new URL(raw);
      const ticket = url.searchParams.get("ticket");
      const slug = url.searchParams.get("e");
      if (ticket && slug) {
        const evt = globalThis.evtAllEvents.find((ev) => ev.slug === slug);
        if (evt) return { e: evt.id, t: ticket };
        return { slug, t: ticket };
      }
    } catch (_) {
    }
    try {
      const obj = JSON.parse(raw);
      if (obj.e && obj.t) return obj;
    } catch (_) {
    }
    return null;
  }
  async function evtOpenScanner(eventId2) {
    try {
      if (typeof window.evtEnsureJsQR === "function") await window.evtEnsureJsQR();
    } catch (err) {
      console.error("jsQR load error:", err);
      const result2 = document.getElementById("scanResult");
      if (result2) result2.innerHTML = '<span class="text-red-500">Scanner library failed to load. Please refresh.</span>';
      return;
    }
    globalThis.evtToggleModal("scannerModal", true);
    const video = document.getElementById("scannerVideo");
    const canvas = document.getElementById("scannerCanvas");
    const result = document.getElementById("scanResult");
    result.innerHTML = `<span class="text-gray-400">Point camera at attendee's QR code\u2026</span>`;
    try {
      let tick = function() {
        if (!globalThis.evtScannerStream) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (typeof jsQR !== "undefined") {
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
            if (code) {
              const qrData = evtParseQrData(code.data);
              if (qrData && qrData.t) {
                evtProcessCheckin(qrData.e || eventId2, qrData.t, result);
                return;
              }
            }
          }
        }
        globalThis.evtScannerAnimFrame = requestAnimationFrame(tick);
      };
      globalThis.evtScannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = globalThis.evtScannerStream;
      video.play();
      const ctx = canvas.getContext("2d");
      globalThis.evtScannerAnimFrame = requestAnimationFrame(tick);
    } catch (err) {
      console.error("Camera error:", err);
      result.innerHTML = '<span class="text-red-500">Camera access denied or unavailable.</span>';
    }
  }
  async function evtProcessCheckin(eventId2, qrToken, resultEl) {
    if (globalThis.evtScannerAnimFrame) cancelAnimationFrame(globalThis.evtScannerAnimFrame);
    resultEl.innerHTML = '<span class="text-gray-500">Checking in\u2026</span>';
    try {
      const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
      if (event?.location_required) {
        const { data: locRecord } = await supabaseClient.from("event_locations").select("sharing_active").eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id).maybeSingle();
      }
      const { data: rsvp, error: findErr } = await supabaseClient.from("event_rsvps").select("id, user_id, status, profiles!event_rsvps_user_id_fkey(first_name, last_name)").eq("event_id", eventId2).eq("qr_token", qrToken).maybeSingle();
      if (findErr) throw findErr;
      if (rsvp) {
        const { data: existing } = await supabaseClient.from("event_checkins").select("id").eq("event_id", eventId2).eq("user_id", rsvp.user_id).maybeSingle();
        if (existing) {
          const name2 = `${rsvp.profiles?.first_name || ""} ${rsvp.profiles?.last_name || ""}`.trim();
          resultEl.innerHTML = `<span class="text-amber-600">\u2705 Already checked in \u2014 ${evtEscapeHtml(name2)}</span>`;
          evtResumeScanner(3e3);
          return;
        }
        const { error: ciErr } = await supabaseClient.from("event_checkins").insert({
          event_id: eventId2,
          user_id: rsvp.user_id,
          checked_in_by: globalThis.evtCurrentUser.id,
          checkin_mode: "attendee_ticket"
        });
        if (ciErr) throw ciErr;
        const name = `${rsvp.profiles?.first_name || ""} ${rsvp.profiles?.last_name || ""}`.trim();
        resultEl.innerHTML = `<span class="text-emerald-600 text-base">\u2705 Checked in \u2014 ${evtEscapeHtml(name)}</span>`;
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        evtResumeScanner(3e3);
        return;
      }
      const { data: guestRsvp, error: gErr } = await supabaseClient.from("event_guest_rsvps").select("id, guest_name, guest_email, guest_token, paid").eq("event_id", eventId2).eq("guest_token", qrToken).maybeSingle();
      if (gErr) throw gErr;
      if (!guestRsvp || !guestRsvp.paid) {
        resultEl.innerHTML = '<span class="text-red-500">\u274C Invalid ticket \u2014 no matching RSVP found.</span>';
        evtResumeScanner(3e3);
        return;
      }
      const { data: gExisting } = await supabaseClient.from("event_checkins").select("id").eq("event_id", eventId2).eq("guest_token", guestRsvp.guest_token).maybeSingle();
      if (gExisting) {
        resultEl.innerHTML = `<span class="text-amber-600">\u2705 Already checked in \u2014 ${evtEscapeHtml(guestRsvp.guest_name)} (Guest)</span>`;
        evtResumeScanner(3e3);
        return;
      }
      const { error: gciErr } = await supabaseClient.from("event_checkins").insert({
        event_id: eventId2,
        guest_token: guestRsvp.guest_token,
        checked_in_by: globalThis.evtCurrentUser.id,
        checkin_mode: "attendee_ticket"
      });
      if (gciErr) throw gciErr;
      resultEl.innerHTML = `<span class="text-emerald-600 text-base">\u2705 Checked in \u2014 ${evtEscapeHtml(guestRsvp.guest_name)} (Guest)</span>`;
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      evtResumeScanner(3e3);
    } catch (err) {
      console.error("Check-in error:", err);
      resultEl.innerHTML = `<span class="text-red-500">Check-in failed: ${err.message}</span>`;
      evtResumeScanner(3e3);
    }
  }
  function evtResumeScanner(delay) {
    setTimeout(() => {
      if (globalThis.evtScannerStream) {
        let tick = function() {
          if (!globalThis.evtScannerStream) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            if (typeof jsQR !== "undefined") {
              const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
              if (code) {
                const qrData = evtParseQrData(code.data);
                if (qrData && qrData.t) {
                  evtProcessCheckin(qrData.e || eventId, qrData.t, result);
                  return;
                }
              }
            }
          }
          globalThis.evtScannerAnimFrame = requestAnimationFrame(tick);
        };
        const video = document.getElementById("scannerVideo");
        const canvas = document.getElementById("scannerCanvas");
        const ctx = canvas.getContext("2d");
        const result = document.getElementById("scanResult");
        result.innerHTML = '<span class="text-gray-400">Point camera at next QR code\u2026</span>';
        globalThis.evtScannerAnimFrame = requestAnimationFrame(tick);
      }
    }, delay);
  }
  function evtCloseScanner() {
    if (globalThis.evtScannerStream) {
      globalThis.evtScannerStream.getTracks().forEach((t) => t.stop());
      globalThis.evtScannerStream = null;
    }
    if (globalThis.evtScannerAnimFrame) {
      cancelAnimationFrame(globalThis.evtScannerAnimFrame);
      globalThis.evtScannerAnimFrame = null;
    }
    globalThis.evtToggleModal("scannerModal", false);
  }
  publishGlobals({
    evtParseQrData,
    evtOpenScanner,
    evtProcessCheckin,
    evtResumeScanner,
    evtCloseScanner
  });

  // js/portal/events/engagement/rsvp.js
  function evtIsGoingRsvp(rsvp) {
    return !!(rsvp && (rsvp.status === "going" || rsvp.paid === true));
  }
  function evtIsRaffleEntriesOpen(event) {
    if (!event) return false;
    const now = /* @__PURE__ */ new Date();
    const isClosed = event.status === "completed" || event.status === "cancelled";
    const isPast = new Date(event.start_date) < now && event.status !== "active";
    const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
    return !isClosed && !isPast && !deadlined;
  }
  function evtIsRaffleBundledWithPaidRsvp(event) {
    return event.pricing_mode === "paid" && event.rsvp_enabled !== false;
  }
  function evtCanEnterMemberRaffle(event, rsvp, myRaffleEntry) {
    if (!event?.raffle_enabled || !evtIsRaffleEntriesOpen(event) || myRaffleEntry) return false;
    if (evtIsRaffleBundledWithPaidRsvp(event)) return !!(rsvp && rsvp.paid === true);
    return evtIsGoingRsvp(rsvp);
  }
  window.evtIsGoingRsvp = evtIsGoingRsvp;
  window.evtIsRaffleEntriesOpen = evtIsRaffleEntriesOpen;
  window.evtIsRaffleBundledWithPaidRsvp = evtIsRaffleBundledWithPaidRsvp;
  window.evtCanEnterMemberRaffle = evtCanEnterMemberRaffle;
  async function evtHandleRsvp(eventId2, status) {
    try {
      const event = (window.evtAllEvents || globalThis.evtAllEvents).find((e) => e.id === eventId2);
      if (!event) return;
      const now = /* @__PURE__ */ new Date();
      const isClosed = event.status === "completed" || event.status === "cancelled";
      const isPast = new Date(event.start_date) < now && event.status !== "active";
      const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
      if (isClosed || isPast || deadlined) {
        alert("RSVPs are closed for this event.");
        return;
      }
      const isPaid = event.pricing_mode === "paid" && event.rsvp_cost_cents > 0;
      const rsvpMap = window.evtAllRsvps || globalThis.evtAllRsvps;
      const existing = rsvpMap[eventId2];
      if (isPaid && status === "going") {
        if (existing?.paid) {
          alert("You have already paid for this RSVP.");
          return;
        }
        const confirmPay = confirm(
          `RSVP costs ${formatCurrency(event.rsvp_cost_cents)}.

By completing your RSVP, you agree that your payment is non-refundable unless this event is cancelled or rescheduled by LLC staff.

Proceed to checkout?`
        );
        if (!confirmPay) return;
        const { url } = await callEdgeFunction("create-event-checkout", {
          event_id: eventId2,
          type: "rsvp"
        });
        if (url) {
          window.location.href = url;
        }
        return;
      }
      if (existing) {
        if (existing.paid) {
          alert("Paid RSVPs cannot be cancelled. Contact an admin for assistance.");
          return;
        }
        if (existing.status === status) {
          const { error } = await supabaseClient.from("event_rsvps").delete().eq("id", existing.id);
          if (error) throw error;
          delete globalThis.evtAllRsvps[eventId2];
          if (window.evtAllRsvps) delete window.evtAllRsvps[eventId2];
        } else {
          const { error } = await supabaseClient.from("event_rsvps").update({ status }).eq("id", existing.id);
          if (error) throw error;
          if (globalThis.evtAllRsvps[eventId2]) globalThis.evtAllRsvps[eventId2].status = status;
          if (window.evtAllRsvps?.[eventId2]) window.evtAllRsvps[eventId2].status = status;
        }
      } else {
        const { data, error } = await supabaseClient.from("event_rsvps").upsert({ event_id: eventId2, user_id: globalThis.evtCurrentUser.id, status }, { onConflict: "event_id,user_id" }).select().single();
        if (error) throw error;
        globalThis.evtAllRsvps[eventId2] = data;
        window.evtAllRsvps = window.evtAllRsvps || {};
        window.evtAllRsvps[eventId2] = data;
      }
      const wantSmsOptIn = status === "going" && !!document.getElementById("evtSmsOptInCheck")?.checked;
      evtRenderEvents();
      await globalThis.evtOpenDetail(eventId2);
      if (wantSmsOptIn) {
        await evtHandleEventSmsOptIn(eventId2, true);
      }
      if (status === "going" && window.evtCtaRaffleIntent === eventId2) {
        window.evtCtaRaffleIntent = null;
        evtOpenCtaPanel("raffle", eventId2);
      }
    } catch (err) {
      console.error("RSVP error:", err);
      alert("Failed to update RSVP. Please try again.");
    }
  }
  async function evtHandleEventSmsOptIn(eventId2, optIn) {
    try {
      await callEdgeFunction("upsert-event-sms-recipient", {
        event_id: eventId2,
        sms_opt_in: !!optIn,
        sms_consent_text_version: "event_sms_v1"
      });
    } catch (err) {
      console.error("Event SMS preference error:", err);
      alert(err.message || "Failed to save SMS preference. Please try again.");
      const checkbox = document.getElementById("evtSmsOptInCheck");
      if (checkbox) checkbox.checked = !optIn;
    }
  }
  async function evtHandleRaffleEntry(eventId2) {
    try {
      const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
      if (!event || !event.raffle_enabled) return;
      const now = /* @__PURE__ */ new Date();
      const isClosed = event.status === "completed" || event.status === "cancelled";
      const isPast = new Date(event.start_date) < now && event.status !== "active";
      const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
      if (isClosed || isPast || deadlined) {
        alert("Raffle entries are closed for this event.");
        return;
      }
      if (!event.raffle_entry_cost_cents) {
        alert("Use Enter Raffle \u2014 Free for no-cost raffle entries.");
        return;
      }
      const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId2];
      if (evtIsRaffleBundledWithPaidRsvp(event)) {
        alert("Raffle entry is included with your paid RSVP for this event.");
        return;
      }
      if (!evtIsGoingRsvp(rsvp)) {
        alert("Please RSVP before entering the raffle.");
        return;
      }
      const confirmPay = confirm(
        `Raffle entry costs ${formatCurrency(event.raffle_entry_cost_cents)}.

Raffle entry is non-refundable. Proceed to checkout?`
      );
      if (!confirmPay) return;
      const { url } = await callEdgeFunction("create-event-checkout", {
        event_id: eventId2,
        type: "raffle_entry"
      });
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error("Raffle entry error:", err);
      alert("Failed to start raffle entry checkout. Please try again.");
    }
  }
  async function evtHandleFreeRaffleEntry(eventId2) {
    try {
      const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
      if (!event || !event.raffle_enabled) return;
      const now = /* @__PURE__ */ new Date();
      const isClosed = event.status === "completed" || event.status === "cancelled";
      const isPast = new Date(event.start_date) < now && event.status !== "active";
      const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
      if (isClosed || isPast || deadlined) {
        alert("Raffle entries are closed for this event.");
        return;
      }
      const { data: session } = await supabaseClient.auth.getSession();
      if (!session?.session?.user) {
        alert("Please sign in to enter.");
        return;
      }
      const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps)[eventId2];
      if (evtIsRaffleBundledWithPaidRsvp(event)) {
        alert("Raffle entry is included with your paid RSVP for this event.");
        return;
      }
      if (!evtIsGoingRsvp(rsvp)) {
        alert("Please RSVP before entering the raffle.");
        return;
      }
      const { error } = await supabaseClient.from("event_raffle_entries").upsert({ event_id: eventId2, user_id: session.session.user.id, paid: true }, { onConflict: "event_id,user_id" });
      if (error) throw error;
      alert("You're entered into the raffle! Good luck! \u{1F39F}\uFE0F");
      globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Free raffle entry error:", err);
      alert(err.message || "Failed to enter raffle. Please try again.");
    }
  }
  async function evtUpdateStatus(eventId2, newStatus) {
    if (newStatus === "cancelled" && !confirm("Are you sure you want to cancel this event?")) return;
    if (newStatus === "completed" && !confirm("Mark this event as completed?")) return;
    try {
      const { error } = await supabaseClient.from("events").update({ status: newStatus }).eq("id", eventId2);
      if (error) throw error;
      await globalThis.evtLoadEvents();
      globalThis.evtNavigateToList();
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update event status.");
    }
  }
  async function evtJoinWaitlist(eventId2) {
    try {
      const { data: maxPos } = await supabaseClient.from("event_waitlist").select("position").eq("event_id", eventId2).order("position", { ascending: false }).limit(1).maybeSingle();
      const nextPos = (maxPos?.position || 0) + 1;
      const { error } = await supabaseClient.from("event_waitlist").insert({
        event_id: eventId2,
        user_id: globalThis.evtCurrentUser.id,
        position: nextPos,
        status: "waiting"
      });
      if (error) throw error;
      alert(`You're #${nextPos} on the waitlist! We'll notify you if a spot opens.`);
      await globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Join waitlist error:", err);
      alert(err.message?.includes("duplicate") ? "You are already on the waitlist." : "Failed to join waitlist.");
    }
  }
  async function evtLeaveWaitlist(eventId2) {
    if (!confirm("Leave the waitlist for this event?")) return;
    try {
      const { error } = await supabaseClient.from("event_waitlist").delete().eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id);
      if (error) throw error;
      await globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Leave waitlist error:", err);
      alert("Failed to leave waitlist.");
    }
  }
  async function evtClaimWaitlistSpot(eventId2) {
    try {
      const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
      if (!event) return;
      const confirmPay = confirm(
        `A spot has opened up!

RSVP costs ${formatCurrency(event.rsvp_cost_cents)}.

By completing your RSVP, you agree that your payment is non-refundable unless this event is cancelled or rescheduled by LLC staff.

Proceed to checkout?`
      );
      if (!confirmPay) return;
      await supabaseClient.from("event_waitlist").update({ status: "claimed" }).eq("event_id", eventId2).eq("user_id", globalThis.evtCurrentUser.id);
      const { url } = await callEdgeFunction("create-event-checkout", {
        event_id: eventId2,
        type: "rsvp",
        from_waitlist: true
      });
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error("Claim waitlist error:", err);
      alert("Failed to claim waitlist spot. Please try again.");
    }
  }
  async function evtCancelEvent(eventId2) {
    const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
    if (!event) return;
    const isLlc = event.event_type === "llc";
    let nonRefundableCents = 0;
    let cancellationNote = "";
    if (isLlc) {
      cancellationNote = prompt("Cancellation reason (visible to attendees):");
      if (cancellationNote === null) return;
      const nonRefundableStr = prompt(
        "Enter the total non-refundable expenses already incurred (in dollars).\nThis amount will be deducted from each refund proportionally.\nEnter 0 if fully refundable.",
        "0"
      );
      if (nonRefundableStr === null) return;
      nonRefundableCents = Math.round(parseFloat(nonRefundableStr || "0") * 100);
      if (isNaN(nonRefundableCents) || nonRefundableCents < 0) nonRefundableCents = 0;
      const msg = nonRefundableCents > 0 ? `Cancel this event?

Non-refundable expenses: ${formatCurrency(nonRefundableCents)}
This will be deducted proportionally from each attendee's refund.` : "Cancel this event? All paid attendees will receive a full refund.";
      if (!confirm(msg)) return;
    } else {
      if (!confirm("Are you sure you want to cancel this event?")) return;
    }
    try {
      const result = await callEdgeFunction("process-event-cancellation", {
        event_id: eventId2,
        reason: "event_cancelled",
        cancellation_note: cancellationNote || "Event cancelled by host",
        non_refundable_expenses_cents: nonRefundableCents
      });
      alert(result.message || "Event cancelled successfully.");
      await globalThis.evtLoadEvents();
      globalThis.evtNavigateToList();
    } catch (err) {
      console.error("Cancel event error:", err);
      alert("Failed to cancel event: " + (err.message || "Unknown error"));
    }
  }
  async function evtRescheduleEvent(eventId2) {
    const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
    if (!event) return;
    const newDate = prompt("Enter new start date & time (YYYY-MM-DD HH:MM):", "");
    if (!newDate) return;
    const parsed = new Date(newDate.replace(" ", "T"));
    if (isNaN(parsed.getTime())) {
      alert("Invalid date format. Use YYYY-MM-DD HH:MM");
      return;
    }
    if (parsed <= /* @__PURE__ */ new Date()) {
      alert("New date must be in the future.");
      return;
    }
    const confirmMsg = `Reschedule this event to ${parsed.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}?

All attendees will receive a 72-hour grace window to request a full refund if the new date doesn't work for them.`;
    if (!confirm(confirmMsg)) return;
    try {
      const now = /* @__PURE__ */ new Date();
      const graceEnd = new Date(now.getTime() + 72 * 60 * 60 * 1e3);
      const { error } = await supabaseClient.from("events").update({
        original_start_date: event.original_start_date || event.start_date,
        start_date: parsed.toISOString(),
        rescheduled_at: now.toISOString(),
        grace_window_end: graceEnd.toISOString()
      }).eq("id", eventId2);
      if (error) throw error;
      await supabaseClient.from("event_rsvps").update({ grace_refund_eligible: true }).eq("event_id", eventId2).eq("paid", true);
      alert("Event rescheduled! Attendees have been notified and have 72 hours to request a refund.");
      await globalThis.evtLoadEvents();
      await globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Reschedule error:", err);
      alert("Failed to reschedule event.");
    }
  }
  async function evtRequestGraceRefund(eventId2) {
    if (!confirm("Request a full refund because the rescheduled date doesn't work for you?\n\nThis action cannot be undone.")) return;
    try {
      const result = await callEdgeFunction("process-event-cancellation", {
        event_id: eventId2,
        reason: "reschedule_grace",
        user_id: globalThis.evtCurrentUser.id,
        single_user_refund: true
      });
      alert(result.message || "Refund processed. You will receive it within 5-10 business days.");
      await globalThis.evtLoadEvents();
      await globalThis.evtOpenDetail(eventId2);
    } catch (err) {
      console.error("Grace refund error:", err);
      alert("Failed to process refund: " + (err.message || "Unknown error"));
    }
  }
  async function evtDeleteEvent(eventId2) {
    const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
    if (!event) return;
    if (typeof canManageEvents !== "function" || !canManageEvents()) {
      alert("Only users with event management permission can delete events.");
      return;
    }
    const typed = prompt(`This will permanently delete "${event.title}" and all associated RSVPs, check-ins, raffle entries, documents, and photos.

Type the event title to confirm:`);
    if (!typed || typed.trim() !== event.title.trim()) {
      if (typed !== null) alert("Event title did not match. Deletion cancelled.");
      return;
    }
    try {
      const { error } = await supabaseClient.from("events").delete().eq("id", eventId2);
      if (error) throw error;
      alert("Event deleted successfully.");
      globalThis.evtNavigateToList();
      await globalThis.evtLoadEvents();
    } catch (err) {
      console.error("Delete event error:", err);
      alert("Failed to delete event: " + (err.message || "Unknown error"));
    }
  }
  async function evtDuplicateEvent(eventId2) {
    const event = globalThis.evtAllEvents.find((e) => e.id === eventId2);
    if (!event) return;
    if (!confirm("Create a duplicate of this event? It will open in draft mode for editing.")) return;
    try {
      const newSlug = evtGenerateSlug(event.title + " copy");
      const record = {
        title: event.title + " (Copy)",
        slug: newSlug,
        description: event.description,
        event_type: event.event_type,
        category: event.category,
        member_only: event.member_only,
        banner_url: event.banner_url,
        location_text: event.location_text,
        location_url: event.location_url,
        gate_time: event.gate_time,
        gate_location: event.gate_location,
        gate_notes: event.gate_notes,
        gated_notes: event.gated_notes,
        max_participants: event.max_participants,
        pricing_mode: event.pricing_mode,
        rsvp_cost_cents: event.rsvp_cost_cents,
        raffle_enabled: event.raffle_enabled,
        raffle_prizes: event.raffle_prizes,
        raffle_entry_cost_cents: event.raffle_entry_cost_cents,
        checkin_mode: event.checkin_mode,
        created_by: globalThis.evtCurrentUser.id,
        status: "draft",
        // LLC fields
        llc_cut_pct: event.llc_cut_pct,
        invest_eligible: event.invest_eligible,
        min_participants: event.min_participants,
        cost_breakdown: event.cost_breakdown,
        transportation_mode: event.transportation_mode,
        transportation_estimate_cents: event.transportation_estimate_cents,
        location_required: event.location_required
      };
      Object.keys(record).forEach((k) => {
        if (record[k] == null) delete record[k];
      });
      const { data: newEvent, error } = await supabaseClient.from("events").insert(record).select().single();
      if (error) throw error;
      if (event.event_type === "llc") {
        const { data: origItems } = await supabaseClient.from("event_cost_items").select("*").eq("event_id", eventId2).order("sort_order");
        if (origItems && origItems.length > 0) {
          const newItems = origItems.map((item) => ({
            event_id: newEvent.id,
            name: item.name,
            category: item.category,
            total_cost_cents: item.total_cost_cents,
            included_in_buyin: item.included_in_buyin,
            avg_per_person_cents: item.avg_per_person_cents,
            notes: item.notes,
            sort_order: item.sort_order
          }));
          await supabaseClient.from("event_cost_items").insert(newItems);
        }
      }
      alert("Event duplicated! Opening the copy in draft mode.");
      await globalThis.evtLoadEvents();
      const dupEvent = globalThis.evtAllEvents.find((e) => e.id === newEvent.id);
      if (dupEvent && dupEvent.slug) {
        globalThis.evtNavigateToEvent(dupEvent.slug);
      } else {
        await globalThis.evtOpenDetail(newEvent.id);
      }
    } catch (err) {
      console.error("Duplicate event error:", err);
      alert("Failed to duplicate event: " + (err.message || "Unknown error"));
    }
  }
  publishGlobals({
    evtIsGoingRsvp,
    evtIsRaffleEntriesOpen,
    evtIsRaffleBundledWithPaidRsvp,
    evtCanEnterMemberRaffle,
    evtHandleRsvp,
    evtHandleEventSmsOptIn,
    evtHandleRaffleEntry,
    evtHandleFreeRaffleEntry,
    evtUpdateStatus,
    evtJoinWaitlist,
    evtLeaveWaitlist,
    evtClaimWaitlistSpot,
    evtCancelEvent,
    evtRescheduleEvent,
    evtRequestGraceRefund,
    evtDeleteEvent,
    evtDuplicateEvent
  });

  // js/portal/events/create/geocode.js
  var STREET_ABBREVS = {
    "crt": "court",
    "ct": "court",
    "dr": "drive",
    "st": "street",
    "ave": "avenue",
    "blvd": "boulevard",
    "ln": "lane",
    "rd": "road",
    "pl": "place",
    "cir": "circle",
    "pkwy": "parkway",
    "hwy": "highway",
    "trl": "trail",
    "ter": "terrace",
    "trce": "trace",
    "cv": "cove",
    "pt": "point",
    "aly": "alley",
    "way": "way"
  };
  var STATE_ABBREVS = {
    "al": "alabama",
    "ak": "alaska",
    "az": "arizona",
    "ar": "arkansas",
    "ca": "california",
    "co": "colorado",
    "ct": "connecticut",
    "de": "delaware",
    "fl": "florida",
    "ga": "georgia",
    "hi": "hawaii",
    "id": "idaho",
    "il": "illinois",
    "in": "indiana",
    "ia": "iowa",
    "ks": "kansas",
    "ky": "kentucky",
    "la": "louisiana",
    "me": "maine",
    "md": "maryland",
    "ma": "massachusetts",
    "mi": "michigan",
    "mn": "minnesota",
    "ms": "mississippi",
    "mo": "missouri",
    "mt": "montana",
    "ne": "nebraska",
    "nv": "nevada",
    "nh": "new hampshire",
    "nj": "new jersey",
    "nm": "new mexico",
    "ny": "new york",
    "nc": "north carolina",
    "nd": "north dakota",
    "oh": "ohio",
    "ok": "oklahoma",
    "or": "oregon",
    "pa": "pennsylvania",
    "ri": "rhode island",
    "sc": "south carolina",
    "sd": "south dakota",
    "tn": "tennessee",
    "tx": "texas",
    "ut": "utah",
    "vt": "vermont",
    "va": "virginia",
    "wa": "washington",
    "wv": "west virginia",
    "wi": "wisconsin",
    "wy": "wyoming",
    "dc": "district of columbia"
  };
  function evtExpandAddress(raw) {
    let words = raw.trim().split(/\s+/);
    const streetTypes = new Set(Object.values(STREET_ABBREVS));
    let streetTypeIdx = -1;
    words = words.map((w, i) => {
      const lower = w.toLowerCase();
      if (STREET_ABBREVS[lower]) {
        streetTypeIdx = i;
        return STREET_ABBREVS[lower];
      }
      if (streetTypes.has(lower)) {
        streetTypeIdx = i;
      }
      return w;
    });
    words = words.map((w) => STATE_ABBREVS[w.toLowerCase()] || w);
    const expanded = words.join(" ");
    if (raw.includes(",")) return expanded;
    const zipMatch = expanded.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    if (!zipMatch) return expanded;
    const beforeZip = zipMatch[1];
    const zip = zipMatch[2];
    const bParts = beforeZip.split(" ");
    let stateStart = -1;
    const stateVals = Object.values(STATE_ABBREVS);
    if (bParts.length >= 3) {
      const twoWord = (bParts[bParts.length - 2] + " " + bParts[bParts.length - 1]).toLowerCase();
      if (stateVals.includes(twoWord)) stateStart = bParts.length - 2;
    }
    if (stateStart < 0 && bParts.length >= 2) {
      if (stateVals.includes(bParts[bParts.length - 1].toLowerCase())) stateStart = bParts.length - 1;
    }
    if (stateStart < 0) return expanded;
    const statePart = bParts.slice(stateStart).join(" ");
    const preState = bParts.slice(0, stateStart);
    if (streetTypeIdx >= 0 && streetTypeIdx < preState.length - 1) {
      const street = preState.slice(0, streetTypeIdx + 1).join(" ");
      const city = preState.slice(streetTypeIdx + 1).join(" ");
      return `${street}, ${city}, ${statePart} ${zip}`;
    }
    return preState.join(" ") + ", " + statePart + " " + zip;
  }
  async function evtGeocodeCensus(address) {
    const url = `${getFunctionUrl("geocode-address")}?address=${encodeURIComponent(address)}`;
    try {
      const resp = await fetch(url, {
        headers: { "apikey": SUPABASE_ANON_KEY }
      });
      const data = await resp.json();
      if (data?.found) {
        return {
          lat: data.lat,
          lng: data.lng,
          display: data.display
        };
      }
    } catch (err) {
      console.warn("Census geocoder failed:", err);
    }
    return null;
  }
  async function evtGeocodeNominatim(address) {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(address)}`,
        { headers: { "Accept-Language": "en" } }
      );
      const results = await resp.json();
      if (results && results.length > 0) {
        const best = results.find((r) => r.class === "place" || r.class === "building") || results[0];
        return { lat: parseFloat(best.lat), lng: parseFloat(best.lon), display: best.display_name };
      }
    } catch (err) {
      console.warn("Nominatim geocoder failed:", err);
    }
    return null;
  }
  async function evtGeocodeAddress(address) {
    const expanded = evtExpandAddress(address);
    let result = await evtGeocodeCensus(address);
    if (result) return result;
    if (expanded !== address) {
      result = await evtGeocodeCensus(expanded);
      if (result) return result;
    }
    result = await evtGeocodeNominatim(expanded);
    if (result) return result;
    if (expanded !== address) {
      result = await evtGeocodeNominatim(address);
      if (result) return result;
    }
    return null;
  }
  globalThis.evtExpandAddress = evtExpandAddress;
  globalThis.evtGeocodeCensus = evtGeocodeCensus;
  globalThis.evtGeocodeNominatim = evtGeocodeNominatim;
  globalThis.evtGeocodeAddress = evtGeocodeAddress;

  // js/portal/events/create/legacy-costs.js
  var COST_CATEGORIES = [
    { value: "lodging", label: "\u{1F3E0} Lodging" },
    { value: "transportation", label: "\u{1F697} Transportation" },
    { value: "food", label: "\u{1F355} Food" },
    { value: "gear", label: "\u{1F3BF} Gear / Rentals" },
    { value: "entertainment", label: "\u{1F3AD} Entertainment" },
    { value: "other", label: "\u{1F4E6} Other" }
  ];
  globalThis.evtCostItems = window.evtCostItems || [];
  function evtToggleLlcFields() {
    const type = document.getElementById("eventType").value;
    const isLlc = type === "llc";
    const isComp = type === "competition";
    const llcSection = document.getElementById("llcFieldsSection");
    const compSection = document.getElementById("compFieldsSection");
    if (llcSection) llcSection.classList.toggle("hidden", !isLlc);
    if (compSection) compSection.classList.toggle("hidden", !isComp);
    if (isLlc) {
      const pm = document.getElementById("pricingMode");
      pm.value = "paid";
      pm.dispatchEvent(new Event("change"));
      const rsvpCostGroup = document.getElementById("rsvpCostGroup");
      if (rsvpCostGroup) rsvpCostGroup.classList.add("hidden");
    }
    if (isComp) {
      document.getElementById("memberOnly").checked = true;
    }
  }
  function evtAddCostItem() {
    const id = crypto.randomUUID();
    window.evtCostItems.push({ id, name: "", category: "other", total_cost_cents: 0, included_in_buyin: true, avg_per_person_cents: 0, notes: "" });
    evtRenderCostItems();
  }
  function evtRemoveCostItem(itemId) {
    globalThis.evtCostItems = window.evtCostItems.filter((i) => i.id !== itemId);
    evtRenderCostItems();
    evtRecalcCostSummary();
  }
  function evtRenderCostItems() {
    const container = document.getElementById("costItemsList");
    if (!container) return;
    const items = window.evtCostItems;
    container.innerHTML = items.map((item, idx) => `
    <div class="bg-white border border-gray-200 rounded-xl p-3 space-y-2" data-cost-id="${item.id}">
        <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-400">#${idx + 1}</span>
            <button type="button" ${evtDataAction("evtRemoveCostItem", item.id)} class="text-red-400 hover:text-red-600 transition p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Item name" value="${evtEscapeHtml(item.name)}" onchange="evtUpdateCostItem('${item.id}','name',this.value)"
                   class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            <select onchange="evtUpdateCostItem('${item.id}','category',this.value)"
                    class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                ${COST_CATEGORIES.map((c) => `<option value="${c.value}" ${item.category === c.value ? "selected" : ""}>${c.label}</option>`).join("")}
            </select>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <div>
                <label class="text-xs text-gray-500">Total Cost ($)</label>
                <input type="number" min="0" step="1" value="${item.total_cost_cents ? item.total_cost_cents / 100 : ""}" placeholder="0"
                       onchange="evtUpdateCostItem('${item.id}','total_cost_cents',Math.round(this.value*100))"
                       class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            </div>
            <div>
                <label class="text-xs text-gray-500">Type</label>
                <select onchange="evtUpdateCostItem('${item.id}','included_in_buyin',this.value==='true')"
                        class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                    <option value="true" ${item.included_in_buyin ? "selected" : ""}>Included in Buy-In</option>
                    <option value="false" ${!item.included_in_buyin ? "selected" : ""}>Out of Pocket</option>
                </select>
            </div>
        </div>
        ${!item.included_in_buyin ? `
        <div>
            <label class="text-xs text-gray-500">Avg Per Person ($)</label>
            <input type="number" min="0" step="1" value="${item.avg_per_person_cents ? item.avg_per_person_cents / 100 : ""}" placeholder="0"
                   onchange="evtUpdateCostItem('${item.id}','avg_per_person_cents',Math.round(this.value*100))"
                   class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
        </div>` : ""}
        <input type="text" placeholder="Notes / source link (optional)" value="${evtEscapeHtml(item.notes || "")}" onchange="evtUpdateCostItem('${item.id}','notes',this.value)"
               class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent">
    </div>`).join("");
  }
  function evtUpdateCostItem(itemId, field, value) {
    const item = window.evtCostItems.find((i) => i.id === itemId);
    if (item) {
      item[field] = value;
      if (field === "included_in_buyin") evtRenderCostItems();
      evtRecalcCostSummary();
    }
  }
  function evtRecalcCostSummary() {
    const summary = document.getElementById("costSummary");
    if (!summary) return;
    const minPart = parseInt(document.getElementById("eventMinParticipants")?.value) || 0;
    const llcCutPct = parseFloat(document.getElementById("eventLlcCut").value) || 0;
    const items = window.evtCostItems;
    const totalIncluded = items.filter((i) => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
    const totalOop = items.filter((i) => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);
    if (items.length === 0) {
      summary.classList.add("hidden");
      return;
    }
    summary.classList.remove("hidden");
    const baseBuyIn = minPart > 0 ? Math.ceil(totalIncluded / minPart) : 0;
    const llcCutAmount = Math.round(baseBuyIn * llcCutPct / 100);
    const finalBuyIn = baseBuyIn + llcCutAmount;
    document.getElementById("costTotalIncluded").textContent = formatCurrency(totalIncluded);
    document.getElementById("costMaxPart").textContent = minPart > 0 ? minPart : "\u2014";
    document.getElementById("costBuyIn").textContent = minPart > 0 ? `${formatCurrency(finalBuyIn)}/person` : "Set min participants";
    document.getElementById("costOop").textContent = `~${formatCurrency(totalOop)}/person`;
    document.getElementById("costGrandTotal").textContent = minPart > 0 ? `~${formatCurrency(finalBuyIn + totalOop)}` : "\u2014";
    const llcRow = document.getElementById("costLlcCutRow");
    if (llcCutPct > 0 && minPart > 0) {
      llcRow.classList.remove("hidden");
      document.getElementById("costLlcPct").textContent = llcCutPct;
      document.getElementById("costLlcAmount").textContent = `+${formatCurrency(llcCutAmount)}`;
    } else {
      llcRow.classList.add("hidden");
    }
    const overrideInput = document.getElementById("llcRsvpOverride");
    if (minPart > 0 && overrideInput && !overrideInput.dataset.userEdited) {
      overrideInput.value = Math.ceil(finalBuyIn / 100);
      overrideInput.placeholder = `Suggested: $${Math.ceil(finalBuyIn / 100)}`;
    }
  }
  publishGlobals({
    evtToggleLlcFields,
    evtAddCostItem,
    evtRemoveCostItem,
    evtRenderCostItems,
    evtUpdateCostItem,
    evtRecalcCostSummary
  });

  // js/portal/events/create/legacy-location.js
  window._evtLocGeoCache = null;
  var _evtLocDebounce = null;
  function evtSetLocationIcon(state) {
    const wrap = document.getElementById("locationIcon");
    const spinner = document.getElementById("locIconSpinner");
    const check = document.getElementById("locIconCheck");
    const warn = document.getElementById("locIconWarn");
    if (!wrap) return;
    spinner.classList.add("hidden");
    check.classList.add("hidden");
    warn.classList.add("hidden");
    if (state === "hide") {
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    if (state === "spin") spinner.classList.remove("hidden");
    if (state === "check") check.classList.remove("hidden");
    if (state === "warn") warn.classList.remove("hidden");
  }
  function evtSetLocationStatus(text, color) {
    const el = document.getElementById("locationStatus");
    if (!el) return;
    if (!text) {
      el.classList.add("hidden");
      el.textContent = "";
      return;
    }
    el.textContent = text;
    el.className = `text-xs mt-1 ${color}`;
    el.classList.remove("hidden");
  }
  async function evtValidateLocation() {
    const input = document.getElementById("eventLocation");
    const address = input ? input.value.trim() : "";
    if (!address) {
      window._evtLocGeoCache = null;
      evtSetLocationIcon("hide");
      evtSetLocationStatus("", "");
      return;
    }
    if (window._evtLocGeoCache && window._evtLocGeoCache.address === address) return;
    evtSetLocationIcon("spin");
    evtSetLocationStatus("Validating address\u2026", "text-gray-400");
    const result = await window.evtGeocodeAddress(address);
    const current = input.value.trim();
    if (current !== address) return;
    window._evtLocGeoCache = { address, result };
    if (result) {
      evtSetLocationIcon("check");
      evtSetLocationStatus(`\u2713 ${result.display}`, "text-green-600");
    } else {
      evtSetLocationIcon("warn");
      evtSetLocationStatus("Address not found \u2014 event will have no map pin", "text-amber-600");
    }
  }
  function evtInitLocationValidation() {
    const input = document.getElementById("eventLocation");
    if (!input) return;
    input.addEventListener("input", () => {
      clearTimeout(_evtLocDebounce);
      _evtLocDebounce = setTimeout(evtValidateLocation, 800);
    });
    input.addEventListener("blur", () => {
      clearTimeout(_evtLocDebounce);
      evtValidateLocation();
    });
  }
  publishGlobals({
    evtSetLocationIcon,
    evtSetLocationStatus,
    evtValidateLocation,
    evtInitLocationValidation
  });

  // js/portal/events/create/legacy-preview.js
  function evtHandlePreview() {
    const title = document.getElementById("eventTitle").value.trim() || "Untitled Event";
    const desc = document.getElementById("eventDescription").value.trim() || "No description yet.";
    const start = document.getElementById("eventStart").value;
    const location2 = document.getElementById("eventLocation").value.trim();
    const dateStr = start ? new Date(start).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "TBD";
    const timeStr = start ? new Date(start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD";
    const bannerBg = globalThis.evtBannerFile ? `background-image:url('${URL.createObjectURL(globalThis.evtBannerFile)}');background-size:cover;background-position:center;` : `background:linear-gradient(135deg,#6366f1,#8b5cf6);`;
    const gateTime = document.getElementById("gateTime").checked;
    const gateLocation = document.getElementById("gateLocation").checked;
    document.getElementById("eventsDetailView").innerHTML = `
    <div class="relative" style="${bannerBg} min-height:280px;">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none"></div>
        <div class="absolute top-0 left-0" style="padding-top:max(1rem, env(safe-area-inset-top)); padding-left:1rem;">
            <button ${evtDataAction("evtClosePreview")} class="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 hover:bg-black/50 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back to Editor
            </button>
        </div>
        <div class="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div class="mb-2"><span class="type-tag bg-amber-100 text-amber-700">PREVIEW</span></div>
            <h2 class="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">${evtEscapeHtml(title)}</h2>
        </div>
    </div>
    <div class="p-5 sm:p-6">
        <div class="mt-4 space-y-2 text-gray-600">
            <div class="flex items-center gap-2.5">
                <svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="text-lg font-bold text-gray-900">${dateStr}</span>
            </div>
            ${!gateTime ? `<div class="flex items-center gap-2.5 ml-[30px]"><span class="text-base font-semibold text-gray-700">${timeStr}</span></div>` : '<div class="flex items-center gap-2 text-gray-400 italic text-sm"><svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Time revealed after RSVP</span></div>'}
            ${location2 && !gateLocation ? `<div class="flex items-center gap-2.5 mt-1"><svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><span class="text-base font-semibold text-gray-700">${evtEscapeHtml(location2)}</span></div>` : location2 && gateLocation ? '<div class="flex items-center gap-2 text-gray-400 italic text-sm"><svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Location revealed after RSVP</span></div>' : ""}
        </div>
        <div class="mt-5"><p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">${evtEscapeHtml(desc)}</p></div>
        <div class="mt-6 p-4 bg-amber-50 rounded-xl text-center">
            <p class="text-sm text-amber-700 font-semibold">This is a preview \u2014 the event is not published yet.</p>
        </div>
    </div>
`;
    globalThis.evtToggleModal("createModal", false);
    document.getElementById("eventsListView")?.classList.add("hidden");
    document.getElementById("eventsDetailView")?.classList.remove("hidden");
  }
  function evtClosePreview() {
    document.getElementById("eventsDetailView").innerHTML = "";
    document.getElementById("eventsDetailView")?.classList.add("hidden");
    document.getElementById("eventsListView")?.classList.remove("hidden");
    globalThis.evtToggleModal("createModal", true);
  }
  publishGlobals({ evtHandlePreview, evtClosePreview });

  // js/portal/events/create/legacy-submit.js
  async function evtHandleCreate(e) {
    e.preventDefault();
    const publishBtn = document.getElementById("publishEventBtn");
    publishBtn.disabled = true;
    publishBtn.textContent = "Publishing\u2026";
    try {
      const title = document.getElementById("eventTitle").value.trim();
      const slug = evtGenerateSlug(title);
      const checkinMode = document.querySelector('input[name="checkinMode"]:checked').value;
      const eventType = document.getElementById("eventType").value;
      const isLlc = eventType === "llc";
      const checkinEnabled = document.getElementById("checkinEnabled").checked;
      const rsvpEnabled = document.getElementById("rsvpEnabled").checked;
      let bannerUrl = null;
      if (globalThis.evtBannerFile) {
        const ext = globalThis.evtBannerFile.name.split(".").pop();
        const path = `${slug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseClient.storage.from("event-banners").upload(path, globalThis.evtBannerFile, { contentType: globalThis.evtBannerFile.type });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabaseClient.storage.from("event-banners").getPublicUrl(path);
        bannerUrl = publicUrl;
      }
      let embedImageUrl = null;
      if (globalThis.evtEmbedImageFile) {
        const ext = globalThis.evtEmbedImageFile.name.split(".").pop();
        const path = `embeds/${slug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseClient.storage.from("event-banners").upload(path, globalThis.evtEmbedImageFile, { contentType: globalThis.evtEmbedImageFile.type });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabaseClient.storage.from("event-banners").getPublicUrl(path);
        embedImageUrl = publicUrl;
      }
      const pricingMode = document.getElementById("pricingMode").value;
      const raffleEnabled = document.getElementById("raffleEnabled").checked;
      const raffleEntryCostDollars = parseInt(document.getElementById("raffleEntryCostDollars").value) || 0;
      const maxPart = document.getElementById("eventMax").value ? parseInt(document.getElementById("eventMax").value) : null;
      const minPart = document.getElementById("eventMinParticipants")?.value ? parseInt(document.getElementById("eventMinParticipants").value) : null;
      let rsvpCostCents = 0;
      let costBreakdownSummary = null;
      const costItems = window.evtCostItems || [];
      if (isLlc && costItems.length > 0 && (minPart || maxPart)) {
        const llcCutPct = parseFloat(document.getElementById("eventLlcCut").value) || 0;
        const totalIncluded = costItems.filter((i) => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
        const totalOop = costItems.filter((i) => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);
        const divisor = minPart || maxPart;
        const baseBuyIn = Math.ceil(totalIncluded / divisor);
        const llcCut = Math.round(baseBuyIn * llcCutPct / 100);
        const suggestedCents = baseBuyIn + llcCut;
        costBreakdownSummary = { total_included_cents: totalIncluded, total_oop_per_person_cents: totalOop, base_buyin_cents: baseBuyIn, llc_cut_cents: llcCut, final_buyin_cents: suggestedCents };
        const overrideVal = parseInt(document.getElementById("llcRsvpOverride")?.value);
        rsvpCostCents = overrideVal > 0 ? overrideVal * 100 : suggestedCents;
      } else if (isLlc) {
        const overrideVal = parseInt(document.getElementById("llcRsvpOverride")?.value) || 0;
        rsvpCostCents = overrideVal * 100;
      } else if (!isLlc) {
        const rsvpCostDollars = parseInt(document.getElementById("rsvpCostDollars").value) || 0;
        rsvpCostCents = pricingMode === "paid" ? rsvpCostDollars * 100 : 0;
      }
      const record = {
        created_by: globalThis.evtCurrentUser.id,
        event_type: eventType,
        title,
        slug,
        category: document.getElementById("eventCategory").value,
        description: document.getElementById("eventDescription").value.trim(),
        gated_notes: document.getElementById("eventGatedNotes").value.trim() || null,
        banner_url: bannerUrl,
        embed_image_url: embedImageUrl,
        start_date: new Date(document.getElementById("eventStart").value).toISOString(),
        end_date: document.getElementById("eventEnd").value ? new Date(document.getElementById("eventEnd").value).toISOString() : null,
        timezone: document.getElementById("eventTimezone").value,
        location_nickname: document.getElementById("eventLocationNickname").value.trim() || null,
        location_text: document.getElementById("eventLocation").value.trim() || null,
        max_participants: maxPart,
        rsvp_deadline: document.getElementById("eventRsvpDeadline").value ? new Date(document.getElementById("eventRsvpDeadline").value).toISOString() : null,
        checkin_mode: checkinEnabled ? checkinMode : null,
        checkin_enabled: checkinEnabled,
        rsvp_enabled: rsvpEnabled,
        member_only: document.getElementById("memberOnly").checked,
        gate_time: document.getElementById("gateTime").checked,
        gate_location: document.getElementById("gateLocation").checked,
        gate_notes: document.getElementById("gateNotes").checked,
        pricing_mode: pricingMode,
        rsvp_cost_cents: rsvpCostCents,
        raffle_entry_cost_cents: raffleEnabled && pricingMode !== "paid" ? raffleEntryCostDollars * 100 : 0,
        raffle_enabled: raffleEnabled,
        status: "open"
      };
      if (record.location_text) {
        let geo = null;
        if (window._evtLocGeoCache && window._evtLocGeoCache.address === record.location_text && window._evtLocGeoCache.result) {
          geo = window._evtLocGeoCache.result;
        } else {
          publishBtn.textContent = "Validating address\u2026";
          geo = await window.evtGeocodeAddress(record.location_text);
        }
        if (geo) {
          record.location_lat = geo.lat;
          record.location_lng = geo.lng;
        } else {
          if (!confirm("Could not verify that address on the map. The event will be created without a map pin.\n\nPublish anyway?")) {
            publishBtn.disabled = false;
            publishBtn.textContent = "Publish Event";
            return;
          }
        }
        publishBtn.textContent = "Publishing\u2026";
      }
      if (isLlc) {
        record.min_participants = parseInt(document.getElementById("eventMinParticipants").value) || null;
        record.llc_cut_pct = parseFloat(document.getElementById("eventLlcCut").value) || 0;
        record.invest_eligible = document.getElementById("investEligible").checked;
        record.show_cost_breakdown = document.getElementById("showCostBreakdown").checked;
        record.cost_breakdown = costBreakdownSummary;
        const transportEnabled = document.getElementById("transportationEnabled").checked;
        record.transportation_enabled = transportEnabled;
        record.transportation_mode = transportEnabled ? document.getElementById("eventTransportation").value : null;
        record.transportation_estimate_cents = transportEnabled && document.getElementById("eventTransportation").value === "self_arranged" ? Math.round((parseFloat(document.getElementById("eventTransportEstimate").value) || 0) * 100) : null;
        record.location_required = document.getElementById("locationRequired").checked;
      }
      const isComp = eventType === "competition";
      if (isComp) {
        const tier1 = parseInt(document.getElementById("compTier1Pct").value) || 100;
        const tier2 = parseInt(document.getElementById("compTier2Pct").value) || 0;
        const tier3 = parseInt(document.getElementById("compTier3Pct").value) || 0;
        const entryFeeDollars = parseFloat(document.getElementById("compEntryFee").value) || 0;
        record.competition_config = {
          entry_type: document.getElementById("compEntryType").value,
          entry_fee_cents: Math.round(entryFeeDollars * 100),
          house_pct: parseFloat(document.getElementById("compHousePct").value) || 0,
          min_entries: parseInt(document.getElementById("compMinEntries").value) || 2,
          extension_days: parseInt(document.getElementById("compExtensionDays").value) || 3,
          entries_visible_before_voting: document.getElementById("compEntriesVisible").checked,
          voter_eligibility: document.getElementById("compVoterEligibility").value,
          vote_tally_visible: document.getElementById("compVoteTallyVisible").checked
        };
        record.winner_tier_config = [
          { place: 1, pct: tier1 },
          ...tier2 > 0 ? [{ place: 2, pct: tier2 }] : [],
          ...tier3 > 0 ? [{ place: 3, pct: tier3 }] : []
        ];
        record.member_only = true;
        record.pricing_mode = entryFeeDollars > 0 ? "paid" : "free";
        record.rsvp_cost_cents = 0;
      }
      if (checkinEnabled && checkinMode === "venue_scan") {
        record.venue_qr_token = crypto.randomUUID();
      }
      if (raffleEnabled) {
        record.raffle_type = document.getElementById("raffleType").value;
        record.raffle_draw_trigger = document.getElementById("raffleDrawTrigger").value;
        const prizesContainer = document.getElementById("rafflePrizesList");
        const prizeInputs = prizesContainer ? prizesContainer.querySelectorAll('input[type="text"]') : document.querySelectorAll('input[name="rafflePrize"]');
        const prizes = [];
        prizeInputs.forEach((input, i) => {
          const desc = input.value.trim();
          if (desc) prizes.push({ place: i + 1, description: desc });
        });
        record.raffle_prizes = prizes.length > 0 ? prizes : null;
      }
      const { data, error } = await supabaseClient.from("events").insert(record).select().single();
      if (error) throw error;
      if (isLlc && costItems.length > 0) {
        const costRows = costItems.map((item, idx) => ({
          event_id: data.id,
          name: item.name,
          category: item.category,
          total_cost_cents: item.total_cost_cents || 0,
          included_in_buyin: item.included_in_buyin,
          avg_per_person_cents: item.avg_per_person_cents || 0,
          notes: item.notes || null,
          sort_order: idx
        }));
        const { error: costErr } = await supabaseClient.from("event_cost_items").insert(costRows);
        if (costErr) console.error("Cost items insert error:", costErr);
      }
      if (isComp) {
        const eventStart = new Date(document.getElementById("eventStart").value);
        const p1End = document.getElementById("compPhase1End").value ? new Date(document.getElementById("compPhase1End").value) : null;
        const p2End = document.getElementById("compPhase2End").value ? new Date(document.getElementById("compPhase2End").value) : null;
        const p3End = document.getElementById("compPhase3End").value ? new Date(document.getElementById("compPhase3End").value) : null;
        const phases = [
          { event_id: data.id, phase_num: 1, name: "Registration", description: "Sign up as a competitor and build the prize pool.", starts_at: eventStart.toISOString(), ends_at: p1End ? p1End.toISOString() : eventStart.toISOString(), status: "pending" },
          { event_id: data.id, phase_num: 2, name: "Active Competition", description: "Submit your entry before the deadline.", starts_at: p1End ? p1End.toISOString() : eventStart.toISOString(), ends_at: p2End ? p2End.toISOString() : eventStart.toISOString(), status: "pending" },
          { event_id: data.id, phase_num: 3, name: "Voting", description: "Vote for your favorite entry. One vote per person.", starts_at: p2End ? p2End.toISOString() : eventStart.toISOString(), ends_at: p3End ? p3End.toISOString() : eventStart.toISOString(), status: "pending" },
          { event_id: data.id, phase_num: 4, name: "Results", description: "Winners announced and prizes distributed.", starts_at: p3End ? p3End.toISOString() : eventStart.toISOString(), ends_at: document.getElementById("eventEnd").value ? new Date(document.getElementById("eventEnd").value).toISOString() : p3End ? p3End.toISOString() : eventStart.toISOString(), status: "pending" }
        ];
        const { error: phaseErr } = await supabaseClient.from("competition_phases").insert(phases);
        if (phaseErr) console.error("Competition phases insert error:", phaseErr);
      }
      document.getElementById("createEventForm").reset();
      globalThis.evtBannerFile = null;
      globalThis.evtEmbedImageFile = null;
      globalThis.evtCostItems = [];
      window._evtLocGeoCache = null;
      window.evtSetLocationIcon("hide");
      window.evtSetLocationStatus("", "");
      document.getElementById("bannerPreviewWrap").classList.add("hidden");
      document.getElementById("bannerUploadHint").classList.remove("hidden");
      document.getElementById("embedImagePreviewWrap")?.classList.add("hidden");
      document.getElementById("embedImageUploadHint")?.classList.remove("hidden");
      document.getElementById("llcFieldsSection")?.classList.add("hidden");
      document.getElementById("compFieldsSection")?.classList.add("hidden");
      document.getElementById("costItemsList") && (document.getElementById("costItemsList").innerHTML = "");
      document.getElementById("costSummary")?.classList.add("hidden");
      globalThis.evtToggleModal("createModal", false);
      await globalThis.evtLoadEvents();
      globalThis.evtNavigateToEvent(data.slug);
    } catch (err) {
      console.error("Create event error:", err);
      alert(`Failed to create event: ${err.message}`);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = "Publish Event";
    }
  }
  publishGlobals({ evtHandleCreate });

  // js/portal/events/create/step-basics.js
  function _esc(s) {
    return window.EventsCreateSteps.esc(s);
  }
  function _setImageFile(imageFile, fileKey, previewKey) {
    const STATE4 = window.EventsCreateSteps.getState();
    if (!imageFile) return;
    if (!imageFile.type.match(/^image\/(png|jpeg|webp)$/)) {
      alert("Please choose a PNG, JPG, or WebP image.");
      return;
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      alert("File must be under 5 MB.");
      return;
    }
    STATE4[fileKey] = imageFile;
    const reader = new FileReader();
    reader.onload = () => {
      STATE4[previewKey] = reader.result;
      window.EventsCreateSteps.render();
    };
    reader.readAsDataURL(imageFile);
  }
  function _wireImageUpload(dropId, fileId, clearId, fileKey, previewKey) {
    const STATE4 = window.EventsCreateSteps.getState();
    const drop = document.getElementById(dropId);
    const file = document.getElementById(fileId);
    if (drop && window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
      const dt = drop.querySelector(".ec-drop-hint-desktop");
      const tt = drop.querySelector(".ec-drop-hint-touch");
      if (dt) dt.style.display = "";
      if (tt) tt.style.display = "none";
    }
    drop?.addEventListener("click", () => file.click());
    drop?.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("ec-banner-drop--over");
    });
    drop?.addEventListener("dragleave", (e) => {
      if (!drop.contains(e.relatedTarget)) {
        drop.classList.remove("ec-banner-drop--over");
      }
    });
    drop?.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("ec-banner-drop--over");
      _setImageFile(e.dataTransfer?.files?.[0], fileKey, previewKey);
    });
    file?.addEventListener("change", () => _setImageFile(file.files[0], fileKey, previewKey));
    document.getElementById(clearId)?.addEventListener("click", () => {
      STATE4[fileKey] = null;
      STATE4[previewKey] = null;
      if (file) file.value = "";
      window.EventsCreateSteps.render();
    });
  }
  function html() {
    const STATE4 = window.EventsCreateSteps.getState();
    const CATEGORIES2 = window.EventsCreateSteps.CATEGORIES;
    const f = STATE4.form;
    const types = [
      { key: "member", emoji: "\u{1F465}", label: "Member event", sub: "Anyone can RSVP", enabled: true },
      { key: "llc", emoji: "\u{1F3E2}", label: "LLC event", sub: "Use legacy editor for now", enabled: false },
      { key: "competition", emoji: "\u{1F3C6}", label: "Competition", sub: "Use legacy editor for now", enabled: false }
    ];
    return `
        <div class="ec-row">
            <label class="ec-label">Event type</label>
            <div class="ec-grid-2" style="grid-template-columns:1fr 1fr 1fr">
                ${types.map((t) => `
                    <div class="ec-type-card ${f.event_type === t.key ? "active" : ""} ${!t.enabled ? "disabled" : ""}" data-type="${t.key}" ${!t.enabled ? 'data-disabled="1"' : ""}>
                        <div class="ec-type-emoji">${t.emoji}</div>
                        <div class="text-sm font-bold text-gray-800 mt-1">${t.label}</div>
                        <div class="text-xs text-gray-500">${t.sub}</div>
                    </div>
                `).join("")}
            </div>
            <p class="ec-help">LLC &amp; Competition events use the legacy form \u2014 select Member to continue here.</p>
        </div>

        <div class="ec-row">
            <label class="ec-label">Title</label>
            <input id="ecTitle" class="ec-input" type="text" maxlength="120" placeholder="What's the occasion?" value="${_esc(f.title)}">
        </div>

        <div class="ec-row">
            <label class="ec-label">Category</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${CATEGORIES2.map(
      (c) => `<button type="button" class="ec-pill ${f.category === c.key ? "active" : ""}" data-cat="${c.key}">${c.label}</button>`
    ).join("")}
            </div>
        </div>

        <div class="ec-row">
            <label class="ec-label">Description</label>
            <textarea id="ecDesc" class="ec-input ec-textarea" maxlength="2000" placeholder="Tell members what to expect\u2026">${_esc(f.description)}</textarea>
        </div>

        <div class="ec-row">
            <label class="ec-label">Banner image (optional)</label>
            <input id="ecBannerFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none">
            ${STATE4.bannerPreviewUrl ? `<div><img src="${STATE4.bannerPreviewUrl}" class="ec-banner-preview" alt=""><button type="button" id="ecBannerClear" class="text-xs text-red-600 font-semibold mt-1">Remove</button></div>` : `<div id="ecBannerDrop" class="ec-banner-drop">
                        <div style="font-size:28px">\u{1F5BC}\uFE0F</div>
                        <div class="text-sm font-semibold text-gray-700 mt-1"><span class="ec-drop-hint-desktop" style="display:none">Drag &amp; drop or click to upload</span><span class="ec-drop-hint-touch">Tap to upload</span></div>
                        <div class="text-xs text-gray-400">PNG / JPG / WebP \xB7 max 5 MB</div>
                   </div>`}
            <p class="ec-help">Landscape image for event pages and cards.</p>
        </div>

        <div class="ec-row">
            <label class="ec-label">Embed image (optional)</label>
            <input id="ecEmbedImageFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none">
            ${STATE4.embedImagePreviewUrl ? `<div><img src="${STATE4.embedImagePreviewUrl}" class="ec-embed-preview" alt=""><button type="button" id="ecEmbedImageClear" class="text-xs text-red-600 font-semibold mt-1">Remove</button></div>` : `<div id="ecEmbedImageDrop" class="ec-banner-drop">
                        <div style="font-size:28px">\u25A3</div>
                        <div class="text-sm font-semibold text-gray-700 mt-1"><span class="ec-drop-hint-desktop" style="display:none">Drag &amp; drop or click to upload</span><span class="ec-drop-hint-touch">Tap to upload</span></div>
                        <div class="text-xs text-gray-400">Portrait works best \xB7 PNG / JPG / WebP \xB7 max 5 MB</div>
                   </div>`}
            <p class="ec-help">Used only for iMessage, Discord, and other link previews. Falls back to the banner if empty.</p>
        </div>
    `;
  }
  function wire() {
    const STATE4 = window.EventsCreateSteps.getState();
    document.querySelectorAll("[data-type]").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.disabled) return;
        STATE4.form.event_type = el.dataset.type;
        window.EventsCreateSteps.render();
      });
    });
    document.querySelectorAll("[data-cat]").forEach((el) => {
      el.addEventListener("click", () => {
        STATE4.form.category = el.dataset.cat;
        window.EventsCreateSteps.render();
      });
    });
    document.getElementById("ecTitle")?.addEventListener("input", (e) => STATE4.form.title = e.target.value);
    document.getElementById("ecDesc")?.addEventListener("input", (e) => STATE4.form.description = e.target.value);
    _wireImageUpload("ecBannerDrop", "ecBannerFile", "ecBannerClear", "bannerFile", "bannerPreviewUrl");
    _wireImageUpload("ecEmbedImageDrop", "ecEmbedImageFile", "ecEmbedImageClear", "embedImageFile", "embedImagePreviewUrl");
  }
  var createStepBasicsApi = { html, wire };
  globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
  globalThis.EventsCreateSteps.basics = createStepBasicsApi;

  // js/portal/events/create/step-when.js
  var _locDebounce;
  function _esc2(s) {
    return window.EventsCreateSteps.esc(s);
  }
  function html2() {
    const STATE4 = window.EventsCreateSteps.getState();
    const TIMEZONES2 = window.EventsCreateSteps.TIMEZONES;
    const f = STATE4.form;
    return `
        <div class="ec-grid-2">
            <div class="ec-row">
                <label class="ec-label">Starts</label>
                <input id="ecStart" class="ec-input" type="datetime-local" value="${_esc2(f.start_date)}">
            </div>
            <div class="ec-row">
                <label class="ec-label">Ends (optional)</label>
                <input id="ecEnd" class="ec-input" type="datetime-local" value="${_esc2(f.end_date)}">
            </div>
        </div>

        <div class="ec-row">
            <label class="ec-label">Timezone</label>
            <select id="ecTz" class="ec-input">
                ${TIMEZONES2.map((tz) => `<option value="${tz}" ${tz === f.timezone ? "selected" : ""}>${tz.replace("_", " ")}</option>`).join("")}
            </select>
        </div>

        <div class="ec-row">
            <label class="ec-label">Location nickname</label>
            <input id="ecLocNick" class="ec-input" type="text" maxlength="60" placeholder="e.g. Mom's house, Cabin in the woods" value="${_esc2(f.location_nickname)}">
            <p class="ec-help">Shown on the banner instead of the full address.</p>
        </div>

        <div class="ec-row">
            <label class="ec-label">Address</label>
            <input id="ecLoc" class="ec-input" type="text" placeholder="123 Main St, City, ST" value="${_esc2(f.location_text)}">
            <div id="ecLocStatus" class="ec-loc-status" style="color:#9ca3af">${STATE4.geocode ? `\u{1F4CD} ${_esc2(STATE4.geocode.display || "Located")}` : "Type an address to geocode (optional)."}</div>
        </div>

        <div class="ec-grid-2">
            <div class="ec-row">
                <label class="ec-label">Max attendees (optional)</label>
                <input id="ecMax" class="ec-input" type="number" min="1" placeholder="No limit" value="${_esc2(f.max_participants)}">
            </div>
            <div class="ec-row">
                <label class="ec-label">RSVP deadline (optional)</label>
                <input id="ecDeadline" class="ec-input" type="datetime-local" value="${_esc2(f.rsvp_deadline)}">
            </div>
        </div>
    `;
  }
  function wire2() {
    const STATE4 = window.EventsCreateSteps.getState();
    const get = (id) => document.getElementById(id);
    get("ecStart")?.addEventListener("input", (e) => STATE4.form.start_date = e.target.value);
    get("ecEnd")?.addEventListener("input", (e) => STATE4.form.end_date = e.target.value);
    get("ecTz")?.addEventListener("change", (e) => STATE4.form.timezone = e.target.value);
    get("ecLocNick")?.addEventListener("input", (e) => STATE4.form.location_nickname = e.target.value);
    get("ecMax")?.addEventListener("input", (e) => STATE4.form.max_participants = e.target.value);
    get("ecDeadline")?.addEventListener("input", (e) => STATE4.form.rsvp_deadline = e.target.value);
    const loc = get("ecLoc");
    loc?.addEventListener("input", (e) => {
      STATE4.form.location_text = e.target.value;
      STATE4.geocode = null;
      clearTimeout(_locDebounce);
      const status = get("ecLocStatus");
      if (status) {
        status.textContent = "\u2026";
        status.style.color = "#9ca3af";
      }
      _locDebounce = setTimeout(_doGeocode, 700);
    });
  }
  async function _doGeocode() {
    const STATE4 = window.EventsCreateSteps.getState();
    const status = document.getElementById("ecLocStatus");
    const addr = (STATE4.form.location_text || "").trim();
    if (!addr || addr.length < 6) {
      if (status) {
        status.textContent = "Type an address to geocode (optional).";
        status.style.color = "#9ca3af";
      }
      return;
    }
    try {
      if (typeof globalThis.evtGeocodeAddress === "function") {
        const r = await window.evtGeocodeAddress(addr);
        if (r && r.lat && r.lng) {
          STATE4.geocode = { lat: r.lat, lng: r.lng, display: r.display || addr };
          if (status) {
            status.textContent = `\u{1F4CD} ${STATE4.geocode.display}`;
            status.style.color = "#059669";
          }
          return;
        }
      }
      if (status) {
        status.textContent = "\u26A0\uFE0F Could not locate \u2014 saved as text only.";
        status.style.color = "#d97706";
      }
    } catch (_) {
      if (status) {
        status.textContent = "\u26A0\uFE0F Geocoding error \u2014 saved as text only.";
        status.style.color = "#d97706";
      }
    }
  }
  var createStepWhenApi = { html: html2, wire: wire2 };
  globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
  globalThis.EventsCreateSteps.when = createStepWhenApi;

  // js/portal/events/create/step-pricing.js
  function _esc3(s) {
    return window.EventsCreateSteps.esc(s);
  }
  function html3() {
    const STATE4 = window.EventsCreateSteps.getState();
    const f = STATE4.form;
    const modes = [
      { key: "free", label: "Free", sub: "No payment required" },
      { key: "paid", label: "Paid RSVP", sub: "Stripe checkout on RSVP" },
      { key: "free_paid_raffle", label: "Free + paid raffle", sub: "Free entry, paid raffle entries" }
    ];
    const showRsvpCost = f.pricing_mode === "paid";
    const showRaffleConfig = f.raffle_enabled;
    const raffleBuilderHtml = window.EventsCreateSteps.raffleBuilderHtml;
    return `
        <div class="ec-row">
            <label class="ec-label">Pricing mode</label>
            <div style="display:flex;flex-direction:column;gap:8px">
                ${modes.map((m) => `
                    <label class="ec-checkbox-row" style="cursor:pointer">
                        <input type="radio" name="ecMode" value="${m.key}" ${f.pricing_mode === m.key ? "checked" : ""}>
                        <div class="flex-1">
                            <div class="text-sm font-bold text-gray-800">${m.label}</div>
                            <div class="text-xs text-gray-500">${m.sub}</div>
                        </div>
                    </label>
                `).join("")}
            </div>
        </div>

        ${showRsvpCost ? `
        <div class="ec-row">
            <label class="ec-label">RSVP price (USD)</label>
            <input id="ecCost" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc3(f.rsvp_cost_dollars)}">
        </div>
        ` : ""}

        <div class="ec-row">
            <label class="ec-checkbox-row">
                <input type="checkbox" id="ecRaffleEnabled" ${f.raffle_enabled ? "checked" : ""}>
                <div class="flex-1">
                    <div class="text-sm font-bold text-gray-800">Add a raffle</div>
                    <div class="text-xs text-gray-500">Members can buy raffle entries for prizes.</div>
                </div>
            </label>
        </div>

        ${showRaffleConfig && typeof raffleBuilderHtml === "function" ? `
        ${raffleBuilderHtml()}
        ` : ""}

        <div class="ec-row">
            <label class="ec-checkbox-row">
                <input type="checkbox" id="ecMemberOnly" ${f.member_only ? "checked" : ""}>
                <div class="flex-1">
                    <div class="text-sm font-bold text-gray-800">Members only</div>
                    <div class="text-xs text-gray-500">Hide from the public event page; logged-in members only.</div>
                </div>
            </label>
        </div>
    `;
  }
  function wire3() {
    const STATE4 = window.EventsCreateSteps.getState();
    const render = window.EventsCreateSteps.render;
    const ensureRaffleConfig2 = window.EventsCreateSteps.ensureRaffleConfig;
    const wireRaffleBuilder = window.EventsCreateSteps.wireRaffleBuilder;
    document.querySelectorAll('input[name="ecMode"]').forEach((el) => {
      el.addEventListener("change", () => {
        STATE4.form.pricing_mode = el.value;
        render();
      });
    });
    document.getElementById("ecCost")?.addEventListener("input", (e) => STATE4.form.rsvp_cost_dollars = e.target.value);
    document.getElementById("ecRaffleEnabled")?.addEventListener("change", (e) => {
      STATE4.form.raffle_enabled = e.target.checked;
      if (STATE4.form.raffle_enabled) ensureRaffleConfig2();
      render();
    });
    document.getElementById("ecRafflePrice")?.addEventListener("input", (e) => STATE4.form.raffle_entry_cost_dollars = e.target.value);
    if (typeof wireRaffleBuilder === "function") wireRaffleBuilder();
    document.getElementById("ecMemberOnly")?.addEventListener("change", (e) => STATE4.form.member_only = e.target.checked);
  }
  var createStepPricingApi = { html: html3, wire: wire3 };
  globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
  globalThis.EventsCreateSteps.pricing = createStepPricingApi;

  // js/portal/events/create/step-review.js
  function _esc4(s) {
    return window.EventsCreateSteps.esc(s);
  }
  function html4() {
    const STATE4 = window.EventsCreateSteps.getState();
    const CATEGORIES2 = window.EventsCreateSteps.CATEGORIES;
    const f = STATE4.form;
    const cat = CATEGORIES2.find((c) => c.key === f.category)?.label || f.category;
    const start = f.start_date ? new Date(f.start_date).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "\u2014";
    const pricingLabel = { free: "Free", paid: `Paid \xB7 $${f.rsvp_cost_dollars || "0.00"}`, free_paid_raffle: "Free + paid raffle" }[f.pricing_mode];
    const raffleReviewHtml = window.EventsCreateSteps.raffleReviewHtml;
    return `
        <div id="ecError"></div>

        ${STATE4.bannerPreviewUrl ? `<img src="${STATE4.bannerPreviewUrl}" class="ec-banner-preview mb-3" alt="">` : ""}

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">${_esc4(f.title || "Untitled event")}</h3>
            <div class="ec-review-row"><span>Type</span><span>${f.event_type}</span></div>
            <div class="ec-review-row"><span>Category</span><span>${cat}</span></div>
            ${f.description ? `<div class="ec-review-row"><span>Description</span><span style="max-width:60%">${_esc4(f.description.slice(0, 120))}${f.description.length > 120 ? "\u2026" : ""}</span></div>` : ""}
        </div>

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">When & Where</h3>
            <div class="ec-review-row"><span>Starts</span><span>${start}</span></div>
            <div class="ec-review-row"><span>Timezone</span><span>${f.timezone}</span></div>
            ${f.location_nickname ? `<div class="ec-review-row"><span>Location</span><span>${_esc4(f.location_nickname)}</span></div>` : ""}
            ${f.location_text ? `<div class="ec-review-row"><span>Address</span><span style="max-width:60%">${_esc4(f.location_text)}${STATE4.geocode ? " \u{1F4CD}" : ""}</span></div>` : ""}
            ${f.max_participants ? `<div class="ec-review-row"><span>Max attendees</span><span>${f.max_participants}</span></div>` : ""}
        </div>

        <div class="ec-review-card">
            <h3 class="font-bold text-gray-800 text-sm mb-2">Pricing</h3>
            <div class="ec-review-row"><span>Mode</span><span>${pricingLabel}</span></div>
            <div class="ec-review-row"><span>Raffle</span><span>${f.raffle_enabled ? `Yes \xB7 $${f.raffle_entry_cost_dollars || "0.00"}/entry` : "No"}</span></div>
            ${f.raffle_enabled && typeof raffleReviewHtml === "function" ? raffleReviewHtml() : ""}
            <div class="ec-review-row"><span>Visibility</span><span>${f.member_only ? "Members only" : "Public"}</span></div>
        </div>

        <p class="text-xs text-gray-400 text-center">Tap <strong>Publish</strong> to go live, or <strong>Save draft</strong> to finish later.</p>
    `;
  }
  function wire4() {
  }
  var createStepReviewApi = { html: html4, wire: wire4 };
  globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
  globalThis.EventsCreateSteps.review = createStepReviewApi;

  // js/portal/events/create/raffle-builder.js
  function _steps() {
    return window.EventsCreateSteps;
  }
  function _state() {
    return _steps().getState();
  }
  function _render() {
    _steps().render();
  }
  function _esc5(s) {
    return _steps().esc(s);
  }
  function raffleModel() {
    if (!window.EventsRaffleModel) throw new Error("Raffle model helper is not loaded.");
    return window.EventsRaffleModel;
  }
  function ensureRaffleConfig() {
    const STATE4 = _state();
    const model = raffleModel();
    if (!STATE4.form.raffle_config) STATE4.form.raffle_config = model.createDefaultConfig();
    STATE4.form.raffle_config = model.normalizeConfig(STATE4.form.raffle_config);
    return STATE4.form.raffle_config;
  }
  function normalizeRaffleConfig() {
    const STATE4 = _state();
    STATE4.form.raffle_config = raffleModel().normalizeConfig(STATE4.form.raffle_config);
    return STATE4.form.raffle_config;
  }
  function _drawModeOptions(selected) {
    const options = [
      ["specific_item", "Specific items"],
      ["random_item", "Random item in category"],
      ["winner_choice", "Winner chooses later"]
    ];
    return options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
  }
  function builderHtml() {
    const STATE4 = _state();
    const model = raffleModel();
    const config = ensureRaffleConfig();
    const categories = model.getOrderedCategories(config);
    const items = config.items || [];
    const validation = model.validateConfig(config);
    const totalWinners = model.getTotalWinnerCount(config);
    return `
        <div class="ec-row">
            <label class="ec-label">Raffle entry price (USD)</label>
            <input id="ecRafflePrice" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc5(STATE4.form.raffle_entry_cost_dollars)}">
            <p class="ec-help">Use 0.00 for a free raffle. Prize images come later; emoji fallbacks are available now.</p>
        </div>

        <div class="ec-row ec-raffle-box">
            <div class="ec-raffle-head">
                <div>
                    <div class="text-sm font-extrabold text-gray-900">Prize categories</div>
                    <div class="text-xs text-gray-500">Draw order follows the category order below.</div>
                </div>
                <button type="button" class="ec-mini-btn" data-ec-raffle-add-category>Add category</button>
            </div>
            ${categories.map((category, index) => `
                <div class="ec-raffle-section" data-ec-category-row="${index}">
                    <div class="ec-raffle-grid">
                        <div>
                            <label class="ec-label">Category</label>
                            <input class="ec-input" data-ec-category-field="label" data-ec-category-id="${_esc5(category.id)}" value="${_esc5(category.label)}" maxlength="80">
                        </div>
                        <div>
                            <label class="ec-label">Draw mode</label>
                            <select class="ec-input" data-ec-category-field="draw_mode" data-ec-category-id="${_esc5(category.id)}">
                                ${_drawModeOptions(category.draw_mode)}
                            </select>
                        </div>
                        <div>
                            <label class="ec-label">Winners</label>
                            <input class="ec-input" type="number" min="0" step="1" data-ec-category-field="winner_count" data-ec-category-id="${_esc5(category.id)}" value="${category.winner_count ?? ""}">
                        </div>
                        <div style="display:flex;gap:4px">
                            <button type="button" class="ec-icon-btn" title="Move up" data-ec-category-move="up" data-ec-category-id="${_esc5(category.id)}">\u2191</button>
                            <button type="button" class="ec-icon-btn" title="Move down" data-ec-category-move="down" data-ec-category-id="${_esc5(category.id)}">\u2193</button>
                            <button type="button" class="ec-icon-btn" title="Remove" data-ec-category-remove="${_esc5(category.id)}">\xD7</button>
                        </div>
                    </div>
                </div>
            `).join("")}
        </div>

        <div class="ec-row ec-raffle-box">
            <div class="ec-raffle-head">
                <div>
                    <div class="text-sm font-extrabold text-gray-900">Prize items</div>
                    <div class="text-xs text-gray-500">Add the items being given away. Emoji is used when no image is uploaded.</div>
                </div>
                <button type="button" class="ec-mini-btn" data-ec-raffle-add-item>Add item</button>
            </div>
            ${items.length ? items.map((item, index) => {
      const preview = STATE4.prizeImagePreviews[item.id] || item.image_url || null;
      const fileName = STATE4.prizeImageFiles[item.id]?.name || null;
      return `
                <div class="ec-raffle-item-wrap" data-ec-item-row="${index}">
                    <div class="ec-raffle-item-grid">
                        <div>
                            <label class="ec-label">Emoji</label>
                            <input class="ec-input" data-ec-item-field="emoji" data-ec-item-id="${_esc5(item.id)}" value="${_esc5(item.emoji || "\u{1F381}")}" maxlength="4">
                        </div>
                        <div>
                            <label class="ec-label">Item name</label>
                            <input class="ec-input" data-ec-item-field="name" data-ec-item-id="${_esc5(item.id)}" value="${_esc5(item.name)}" maxlength="120">
                        </div>
                        <div>
                            <label class="ec-label">Category</label>
                            <select class="ec-input" data-ec-item-field="category_id" data-ec-item-id="${_esc5(item.id)}">
                                ${categories.map((category) => `<option value="${_esc5(category.id)}" ${item.category_id === category.id ? "selected" : ""}>${_esc5(category.label)}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label class="ec-label">Qty</label>
                            <input class="ec-input" type="number" min="1" step="1" data-ec-item-field="quantity" data-ec-item-id="${_esc5(item.id)}" value="${item.quantity || 1}">
                        </div>
                        <div style="display:flex;gap:4px">
                            <button type="button" class="ec-icon-btn" title="Move up" data-ec-item-move="up" data-ec-item-id="${_esc5(item.id)}">\u2191</button>
                            <button type="button" class="ec-icon-btn" title="Move down" data-ec-item-move="down" data-ec-item-id="${_esc5(item.id)}">\u2193</button>
                            <button type="button" class="ec-icon-btn" title="Remove" data-ec-item-remove="${_esc5(item.id)}">\xD7</button>
                        </div>
                    </div>
                    <div class="ec-prize-img-row">
                        <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-ec-prize-file="${_esc5(item.id)}">
                        <div class="ec-prize-img-drop" data-ec-prize-drop="${_esc5(item.id)}" title="Click or drag an image here">
                            ${preview ? `<img src="${_esc5(preview)}" alt="Prize image">` : `<span style="font-size:18px">\u{1F4F7}</span>`}
                        </div>
                        <div class="ec-prize-img-label">
                            ${preview ? `<strong>${fileName ? _esc5(fileName) : "Image set"}</strong><span>Drag a new image or click the thumbnail to replace</span>` : `<strong>Prize image</strong><span>Click or drag &amp; drop a photo (PNG/JPG/WebP \xB7 max 5 MB)</span>`}
                        </div>
                        ${preview ? `<button type="button" class="ec-prize-img-clear" data-ec-prize-clear="${_esc5(item.id)}">Remove</button>` : ""}
                    </div>
                </div>`;
    }).join("") : `<div class="text-xs text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl p-3">No prize items yet. Add at least one item before publishing.</div>`}

            <div class="ec-raffle-summary">
                <span class="ec-raffle-chip">${categories.length} categories</span>
                <span class="ec-raffle-chip">${items.length} items</span>
                <span class="ec-raffle-chip">${totalWinners} winners</span>
            </div>
            ${validation.valid ? "" : `<div class="ec-error" style="margin-top:10px">${validation.errors.map(_esc5).join("<br>")}</div>`}
        </div>
    `;
  }
  function _setPrizeImage(itemId, file) {
    const STATE4 = _state();
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      alert("Please use a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }
    STATE4.prizeImageFiles[itemId] = file;
    const reader = new FileReader();
    reader.onload = () => {
      STATE4.prizeImagePreviews[itemId] = reader.result;
      _render();
    };
    reader.readAsDataURL(file);
  }
  function _updateCategory(categoryId, field, value, rerender = false) {
    const config = ensureRaffleConfig();
    const category = config.categories.find((entry) => entry.id === categoryId);
    if (!category) return;
    if (field === "winner_count") category[field] = value === "" ? null : Math.max(0, Math.floor(Number(value) || 0));
    else category[field] = value;
    normalizeRaffleConfig();
    if (rerender) _render();
  }
  function _updateItem(itemId, field, value, rerender = false) {
    const config = ensureRaffleConfig();
    const item = config.items.find((entry) => entry.id === itemId);
    if (!item) return;
    if (field === "quantity") item[field] = Math.max(1, Math.floor(Number(value) || 1));
    else item[field] = value;
    normalizeRaffleConfig();
    if (rerender) _render();
  }
  function _renumberSortOrders(entries) {
    entries.forEach((entry, index) => entry.sort_order = (index + 1) * 10);
  }
  function _moveEntry(entries, id, direction) {
    const ordered = [...entries].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
    const index = ordered.findIndex((entry) => entry.id === id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    const moving = ordered[index];
    ordered[index] = ordered[targetIndex];
    ordered[targetIndex] = moving;
    _renumberSortOrders(ordered);
    entries.splice(0, entries.length, ...ordered);
  }
  function _removeCategory(categoryId) {
    const config = ensureRaffleConfig();
    if (config.categories.length <= 1) {
      alert("Keep at least one raffle category.");
      return;
    }
    config.categories = config.categories.filter((category) => category.id !== categoryId);
    const fallbackCategoryId = config.categories[0]?.id || "general";
    config.items.forEach((item) => {
      if (item.category_id === categoryId) item.category_id = fallbackCategoryId;
    });
    _renumberSortOrders(config.categories);
    normalizeRaffleConfig();
    _render();
  }
  function _removeItem(itemId) {
    const config = ensureRaffleConfig();
    config.items = config.items.filter((item) => item.id !== itemId);
    _renumberSortOrders(config.items);
    normalizeRaffleConfig();
    _render();
  }
  function _moveCategory(categoryId, direction) {
    const config = ensureRaffleConfig();
    _moveEntry(config.categories, categoryId, direction);
    normalizeRaffleConfig();
    _render();
  }
  function _moveItem(itemId, direction) {
    const config = ensureRaffleConfig();
    _moveEntry(config.items, itemId, direction);
    normalizeRaffleConfig();
    _render();
  }
  function wire5() {
    const STATE4 = _state();
    if (!STATE4.form.raffle_enabled) return;
    document.querySelectorAll("[data-ec-category-field]").forEach((input) => {
      input.addEventListener("input", () => _updateCategory(input.dataset.ecCategoryId, input.dataset.ecCategoryField, input.value));
      input.addEventListener("change", () => _updateCategory(input.dataset.ecCategoryId, input.dataset.ecCategoryField, input.value, true));
    });
    document.querySelectorAll("[data-ec-item-field]").forEach((input) => {
      input.addEventListener("input", () => _updateItem(input.dataset.ecItemId, input.dataset.ecItemField, input.value));
      input.addEventListener("change", () => _updateItem(input.dataset.ecItemId, input.dataset.ecItemField, input.value, true));
    });
    document.querySelector("[data-ec-raffle-add-category]")?.addEventListener("click", () => {
      const model = raffleModel();
      const config = ensureRaffleConfig();
      const nextOrder = (config.categories.length + 1) * 10;
      config.categories.push(model.createCategory({ label: "New Tier", sort_order: nextOrder, winner_count: 1 }));
      normalizeRaffleConfig();
      _render();
    });
    document.querySelector("[data-ec-raffle-add-item]")?.addEventListener("click", () => {
      const model = raffleModel();
      const config = ensureRaffleConfig();
      if (!config.categories.length) config.categories.push(model.createCategory({ id: "general", label: "Raffle Prizes", sort_order: 10 }));
      const nextOrder = (config.items.length + 1) * 10;
      config.items.push(model.createItem({ category_id: config.categories[0].id, name: "New prize item", sort_order: nextOrder }));
      normalizeRaffleConfig();
      _render();
    });
    document.querySelectorAll("[data-ec-category-remove]").forEach((button) => {
      button.addEventListener("click", () => _removeCategory(button.dataset.ecCategoryRemove));
    });
    document.querySelectorAll("[data-ec-item-remove]").forEach((button) => {
      button.addEventListener("click", () => _removeItem(button.dataset.ecItemRemove));
    });
    document.querySelectorAll("[data-ec-category-move]").forEach((button) => {
      button.addEventListener("click", () => _moveCategory(button.dataset.ecCategoryId, button.dataset.ecCategoryMove));
    });
    document.querySelectorAll("[data-ec-item-move]").forEach((button) => {
      button.addEventListener("click", () => _moveItem(button.dataset.ecItemId, button.dataset.ecItemMove));
    });
    document.querySelectorAll("[data-ec-prize-drop]").forEach((zone) => {
      const itemId = zone.dataset.ecPrizeDrop;
      const fileInput = document.querySelector(`[data-ec-prize-file="${CSS.escape(itemId)}"]`);
      if (!fileInput) return;
      zone.addEventListener("click", () => fileInput.click());
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        zone.classList.add("ec-prize-img-drop--over");
      });
      zone.addEventListener("dragleave", (e) => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove("ec-prize-img-drop--over");
      });
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("ec-prize-img-drop--over");
        const f = e.dataTransfer?.files?.[0];
        if (!f) return;
        _setPrizeImage(itemId, f);
      });
      fileInput.addEventListener("change", () => {
        const f = fileInput.files?.[0];
        if (!f) return;
        _setPrizeImage(itemId, f);
      });
    });
    document.querySelectorAll("[data-ec-prize-clear]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const itemId = btn.dataset.ecPrizeClear;
        delete STATE4.prizeImageFiles[itemId];
        delete STATE4.prizeImagePreviews[itemId];
        const config = ensureRaffleConfig();
        const item = config.items.find((i) => i.id === itemId);
        if (item) item.image_url = null;
        _render();
      });
    });
  }
  function reviewHtml() {
    const model = raffleModel();
    const config = ensureRaffleConfig();
    return model.getOrderedCategories(config).map((category) => {
      const items = model.getItemsForCategory(config, category.id);
      const itemText = items.length ? items.map((item) => `${item.emoji || "\u{1F381}"} ${item.name}${item.quantity > 1 ? ` \xD7${item.quantity}` : ""}`).join(", ") : "No items yet";
      return `<div class="ec-review-row"><span>${_esc5(category.label)}</span><span style="max-width:60%">${_esc5(itemText)}</span></div>`;
    }).join("");
  }
  var createRaffleBuilderApi = {
    builderHtml,
    wire: wire5,
    reviewHtml,
    ensureRaffleConfig,
    normalizeRaffleConfig,
    raffleModel
  };
  globalThis.EventsCreateRaffleBuilder = createRaffleBuilderApi;

  // js/portal/events/create/submit.js
  var _submitting = false;
  function _steps2() {
    return window.EventsCreateSteps;
  }
  function _raffleApi() {
    return window.EventsCreateRaffleBuilder;
  }
  async function submit(status) {
    if (_submitting) return;
    const steps = _steps2();
    const STATE4 = steps.getState();
    const validateStep = steps.validateStep;
    const esc10 = steps.esc;
    const close4 = steps.close;
    if (typeof validateStep === "function") {
      const err = validateStep();
      if (err && status === "open") return alert(err);
    }
    const f = STATE4.form;
    if (!f.title.trim()) return alert("Title is required to save.");
    if (status === "open" && !f.start_date) return alert("Start date is required to publish.");
    const errBox = document.getElementById("ecError");
    if (errBox) errBox.innerHTML = "";
    _submitting = true;
    const nextBtn = document.getElementById("ecNextBtn");
    const draftBtn = document.getElementById("ecDraftBtn");
    const origNext = nextBtn?.textContent;
    const origDraft = draftBtn?.textContent;
    if (nextBtn) nextBtn.disabled = true;
    if (draftBtn) draftBtn.disabled = true;
    if (status === "draft" && draftBtn) draftBtn.textContent = "Saving\u2026";
    if (status === "open" && nextBtn) nextBtn.textContent = "Publishing\u2026";
    try {
      const userId = window.evtCurrentUser && window.evtCurrentUser.id || (await supabaseClient.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not signed in.");
      const slug = typeof globalThis.evtGenerateSlug === "function" ? window.evtGenerateSlug(f.title.trim()) : f.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + Date.now().toString(36);
      let bannerUrl = null;
      if (STATE4.bannerFile) {
        const ext = STATE4.bannerFile.name.split(".").pop();
        const path = `${slug}-${Date.now()}.${ext}`;
        const up = await supabaseClient.storage.from("event-banners").upload(path, STATE4.bannerFile, { contentType: STATE4.bannerFile.type });
        if (up.error) throw new Error("Banner upload failed: " + up.error.message);
        bannerUrl = supabaseClient.storage.from("event-banners").getPublicUrl(path).data.publicUrl;
      }
      let embedImageUrl = null;
      if (STATE4.embedImageFile) {
        const ext = STATE4.embedImageFile.name.split(".").pop();
        const path = `embeds/${slug}-${Date.now()}.${ext}`;
        const up = await supabaseClient.storage.from("event-banners").upload(path, STATE4.embedImageFile, { contentType: STATE4.embedImageFile.type });
        if (up.error) throw new Error("Embed image upload failed: " + up.error.message);
        embedImageUrl = supabaseClient.storage.from("event-banners").getPublicUrl(path).data.publicUrl;
      }
      const rb = _raffleApi();
      const raffleConfig2 = f.raffle_enabled ? rb.raffleModel().normalizeConfig(rb.ensureRaffleConfig()) : null;
      if (raffleConfig2) {
        const prizeUploads = Object.entries(STATE4.prizeImageFiles);
        for (const [itemId, imgFile] of prizeUploads) {
          const item = raffleConfig2.items.find((i) => i.id === itemId);
          if (!item) continue;
          const ext = imgFile.name.split(".").pop().toLowerCase() || "jpg";
          const path = `${slug}/${itemId}-${Date.now()}.${ext}`;
          const up = await supabaseClient.storage.from("event-raffle-prizes").upload(path, imgFile, { contentType: imgFile.type });
          if (up.error) throw new Error(`Prize image upload failed: ${up.error.message}`);
          item.image_url = supabaseClient.storage.from("event-raffle-prizes").getPublicUrl(path).data.publicUrl;
        }
      }
      const startISO = f.start_date ? new Date(f.start_date).toISOString() : null;
      const endISO = f.end_date ? new Date(f.end_date).toISOString() : null;
      const deadline = f.rsvp_deadline ? new Date(f.rsvp_deadline).toISOString() : null;
      const rsvpCents = f.pricing_mode === "paid" ? Math.round(Number(f.rsvp_cost_dollars || 0) * 100) : 0;
      const raffleCents = f.raffle_enabled ? Math.round(Number(f.raffle_entry_cost_dollars || 0) * 100) : 0;
      const raffleWinnerCount = raffleConfig2 ? rb.raffleModel().getTotalWinnerCount(raffleConfig2) : 0;
      const record = {
        created_by: userId,
        event_type: "member",
        title: f.title.trim(),
        slug,
        category: f.category,
        description: f.description.trim() || null,
        banner_url: bannerUrl,
        embed_image_url: embedImageUrl,
        start_date: startISO,
        end_date: endISO,
        timezone: f.timezone,
        location_text: f.location_text.trim() || null,
        location_nickname: f.location_nickname.trim() || null,
        location_lat: STATE4.geocode?.lat || null,
        location_lng: STATE4.geocode?.lng || null,
        max_participants: f.max_participants ? Number(f.max_participants) : null,
        rsvp_deadline: deadline,
        member_only: !!f.member_only,
        pricing_mode: f.pricing_mode,
        rsvp_cost_cents: rsvpCents,
        raffle_enabled: !!f.raffle_enabled,
        raffle_entry_cost_cents: raffleCents,
        raffle_prizes: raffleConfig2,
        raffle_winner_count: raffleWinnerCount,
        status
      };
      const { data, error } = await supabaseClient.from("events").insert(record).select().single();
      if (error) throw error;
      if (typeof close4 === "function") close4();
      document.dispatchEvent(new CustomEvent("events:created", { detail: { event: data, status } }));
      if (status === "open" && data.slug && typeof globalThis.evtNavigateToEvent === "function") {
        window.evtNavigateToEvent(data.slug);
      } else if (typeof globalThis.evtLoadEvents === "function") {
        window.evtLoadEvents();
      }
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      const errBox2 = document.getElementById("ecError");
      if (errBox2 && typeof esc10 === "function") {
        errBox2.innerHTML = `<div class="ec-error">${esc10(msg)}</div>`;
      } else {
        alert("Save failed: " + msg);
      }
    } finally {
      _submitting = false;
      if (nextBtn) {
        nextBtn.disabled = false;
        if (origNext) nextBtn.textContent = origNext;
      }
      if (draftBtn) {
        draftBtn.disabled = false;
        if (origDraft) draftBtn.textContent = origDraft;
      }
    }
  }
  var createSubmitApi = { submit };
  globalThis.EventsCreateSubmit = createSubmitApi;

  // js/portal/events/create/sheet.js
  function isFlagOn() {
    return true;
  }
  var STEPS = [
    { key: "basics", label: "Basics" },
    { key: "when", label: "When & Where" },
    { key: "pricing", label: "Pricing" },
    { key: "review", label: "Review" }
  ];
  var STATE2 = {
    step: 0,
    bannerFile: null,
    bannerPreviewUrl: null,
    embedImageFile: null,
    embedImagePreviewUrl: null,
    geocode: null,
    // { lat, lng, display } or null
    prizeImageFiles: {},
    // item.id → File
    prizeImagePreviews: {},
    // item.id → data-URL
    form: {
      event_type: "member",
      title: "",
      category: "other",
      description: "",
      start_date: "",
      end_date: "",
      timezone: "America/New_York",
      location_text: "",
      location_nickname: "",
      max_participants: "",
      rsvp_deadline: "",
      pricing_mode: "free",
      rsvp_cost_dollars: "",
      raffle_enabled: false,
      raffle_entry_cost_dollars: "",
      raffle_config: null,
      member_only: false
    }
  };
  var CATEGORIES = [
    { key: "party", label: "\u{1F389} Party" },
    { key: "birthday", label: "\u{1F382} Birthday" },
    { key: "trip", label: "\u2708\uFE0F Trip" },
    { key: "cookout", label: "\u{1F354} Cookout" },
    { key: "game_night", label: "\u{1F3AE} Game Night" },
    { key: "meeting", label: "\u{1F4CB} Meeting" },
    { key: "fundraiser", label: "\u{1F4B0} Fundraiser" },
    { key: "volunteer", label: "\u{1F91D} Volunteer" },
    { key: "celebration", label: "\u{1F973} Celebration" },
    { key: "other", label: "\u{1F4CC} Other" }
  ];
  var TIMEZONES = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu"
  ];
  function _ensureMounted() {
    if (document.getElementById("ecSheetRoot")) return;
    const root2 = document.createElement("div");
    root2.id = "ecSheetRoot";
    root2.innerHTML = `
        <div id="ecSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
        <div id="ecSheet" class="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
            <div id="ecSheetPanel" class="bg-white w-full sm:max-w-2xl sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:92vh">
                <header class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Create Event <span class="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px]">BETA</span></p>
                        <h2 id="ecSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">New event</h2>
                        <p id="ecSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                    </div>
                    <button id="ecSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </header>
                <div id="ecSheetSteps" class="flex items-center justify-center gap-2 px-5 py-2 border-b border-gray-100 flex-shrink-0"></div>
                <div id="ecSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5"></div>
                <footer id="ecSheetFooter" class="px-5 sm:px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                    <button id="ecBackBtn" class="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-2">Back</button>
                    <div class="flex items-center gap-2">
                        <button id="ecDraftBtn" class="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-2">Save draft</button>
                        <button id="ecNextBtn" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition">Next</button>
                    </div>
                </footer>
            </div>
        </div>
        <style>
            .ec-step-dot { width:8px; height:8px; border-radius:50%; background:#e5e7eb; transition:background .15s,width .15s; }
            .ec-step-dot.active { background:#4f46e5; width:24px; border-radius:4px; }
            .ec-step-dot.done { background:#a5b4fc; }
            .ec-label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
            .ec-input { width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; font-size:16px; color:#111827; background:#fff; }
            .ec-input:focus { outline:none; border-color:#4f46e5; box-shadow:0 0 0 3px rgba(79,70,229,.12); }
            .ec-textarea { min-height:90px; resize:vertical; font-family:inherit; }
            .ec-help { font-size:11px; color:#9ca3af; margin-top:4px; }
            .ec-row { margin-bottom:14px; }
            .ec-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
            @media(max-width:480px) { .ec-grid-2 { grid-template-columns:1fr; } }
            .ec-type-card { padding:14px; border:2px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:border-color .15s,background .15s; }
            .ec-type-card.active { border-color:#4f46e5; background:#eef2ff; }
            .ec-type-card.disabled { opacity:.45; cursor:not-allowed; }
            .ec-type-emoji { font-size:24px; line-height:1; }
            .ec-banner-drop { border:2px dashed #d1d5db; border-radius:12px; padding:24px; text-align:center; cursor:pointer; transition:border-color .15s,background .15s; }
            .ec-banner-drop:hover { border-color:#a5b4fc; background:#fafafa; }
            .ec-banner-drop--over { border-color:#4f46e5; background:#eef2ff; }
            .ec-banner-preview { width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:12px; }
            .ec-embed-preview { width:100%; max-width:240px; aspect-ratio:4/5; object-fit:cover; border-radius:12px; display:block; }
            .ec-pill { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; background:#f3f4f6; color:#374151; cursor:pointer; border:1px solid transparent; }
            .ec-pill.active { background:#4f46e5; color:#fff; }
            .ec-checkbox-row { display:flex; gap:10px; align-items:flex-start; padding:10px; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; }
            .ec-checkbox-row input { margin-top:3px; }
            .ec-review-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:14px; margin-bottom:10px; }
            .ec-review-row { display:flex; justify-content:space-between; gap:10px; padding:6px 0; font-size:13px; border-bottom:1px solid #f1f5f9; }
            .ec-review-row:last-child { border-bottom:none; }
            .ec-review-row span:first-child { color:#6b7280; }
            .ec-review-row span:last-child { color:#111827; font-weight:600; text-align:right; }
            .ec-error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:10px 12px; border-radius:10px; font-size:13px; margin-bottom:10px; }
            .ec-loc-status { font-size:11px; margin-top:4px; }
            .ec-raffle-box { border:1px solid #e5e7eb; border-radius:14px; padding:12px; background:#fafafa; }
            .ec-raffle-section { border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; margin-top:10px; }
            .ec-raffle-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
            .ec-raffle-grid { display:grid; grid-template-columns:1.2fr .8fr .65fr auto; gap:8px; align-items:end; }
            .ec-raffle-item-grid { display:grid; grid-template-columns:.45fr 1.1fr .9fr .55fr auto; gap:8px; align-items:end; margin-top:8px; }
            .ec-icon-btn { width:34px; height:34px; border-radius:9px; border:1px solid #e5e7eb; background:#fff; color:#4b5563; font-weight:800; display:inline-flex; align-items:center; justify-content:center; }
            .ec-icon-btn:hover { border-color:#c7d2fe; color:#4f46e5; background:#eef2ff; }
            .ec-mini-btn { border:1px solid #e5e7eb; background:#fff; color:#374151; border-radius:9px; padding:7px 10px; font-size:12px; font-weight:700; }
            .ec-mini-btn:hover { border-color:#c7d2fe; color:#4f46e5; background:#eef2ff; }
            .ec-raffle-summary { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
            .ec-raffle-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:11px; font-weight:700; }
            .ec-raffle-item-wrap { border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; margin-top:8px; }
            .ec-prize-img-row { margin-top:8px; display:flex; align-items:center; gap:8px; }
            .ec-prize-img-drop { flex:0 0 auto; width:72px; height:72px; border:2px dashed #d1d5db; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:pointer; transition:border-color .15s,background .15s; font-size:11px; color:#9ca3af; text-align:center; overflow:hidden; }
            .ec-prize-img-drop:hover, .ec-prize-img-drop--over { border-color:#4f46e5; background:#eef2ff; color:#4f46e5; }
            .ec-prize-img-drop img { width:100%; height:100%; object-fit:cover; border-radius:8px; display:block; }
            .ec-prize-img-label { flex:1; min-width:0; font-size:11px; color:#6b7280; }
            .ec-prize-img-label strong { display:block; color:#374151; font-size:12px; margin-bottom:1px; }
            .ec-prize-img-clear { border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:7px; padding:4px 8px; font-size:11px; font-weight:700; white-space:nowrap; }
            .ec-prize-img-clear:hover { background:#fee2e2; }
            @media(max-width:560px) { .ec-raffle-grid, .ec-raffle-item-grid { grid-template-columns:1fr; } .ec-icon-btn { width:100%; } }
            @media(max-width:639px){ #ecSheetPanel { max-height: 94vh; } }
        </style>
    `;
    document.body.appendChild(root2);
    document.getElementById("ecSheetClose").addEventListener("click", _confirmClose);
    document.getElementById("ecSheetBackdrop").addEventListener("click", _confirmClose);
    document.getElementById("ecBackBtn").addEventListener("click", _back);
    document.getElementById("ecNextBtn").addEventListener("click", _next);
    document.getElementById("ecDraftBtn").addEventListener("click", () => _submit("draft"));
  }
  function open3() {
    _ensureMounted();
    STATE2.step = 0;
    STATE2.bannerFile = null;
    STATE2.bannerPreviewUrl = null;
    STATE2.embedImageFile = null;
    STATE2.embedImagePreviewUrl = null;
    STATE2.geocode = null;
    STATE2.prizeImageFiles = {};
    STATE2.prizeImagePreviews = {};
    Object.assign(STATE2.form, {
      event_type: "member",
      title: "",
      category: "other",
      description: "",
      start_date: "",
      end_date: "",
      timezone: "America/New_York",
      location_text: "",
      location_nickname: "",
      max_participants: "",
      rsvp_deadline: "",
      pricing_mode: "free",
      rsvp_cost_dollars: "",
      raffle_enabled: false,
      raffle_entry_cost_dollars: "",
      raffle_config: null,
      member_only: false
    });
    _render2();
    const sheet = document.getElementById("ecSheet");
    const panel = document.getElementById("ecSheetPanel");
    const backdrop = document.getElementById("ecSheetBackdrop");
    sheet.classList.add("ec-open");
    backdrop.classList.remove("opacity-0", "pointer-events-none");
    backdrop.classList.add("opacity-100");
    requestAnimationFrame(() => {
      panel.classList.remove("translate-y-full", "sm:translate-y-4", "sm:opacity-0");
      panel.classList.add("translate-y-0", "sm:opacity-100");
    });
    document.body.style.overflow = "hidden";
  }
  function close2() {
    const sheet = document.getElementById("ecSheet");
    if (!sheet || !sheet.classList.contains("ec-open")) return;
    const panel = document.getElementById("ecSheetPanel");
    const backdrop = document.getElementById("ecSheetBackdrop");
    panel.classList.add("translate-y-full", "sm:translate-y-4", "sm:opacity-0");
    panel.classList.remove("translate-y-0", "sm:opacity-100");
    backdrop.classList.add("opacity-0", "pointer-events-none");
    backdrop.classList.remove("opacity-100");
    document.body.style.overflow = "";
    setTimeout(() => sheet.classList.remove("ec-open"), 250);
  }
  function _confirmClose() {
    if (STATE2.form.title || STATE2.bannerFile || STATE2.embedImageFile) {
      if (!confirm("Discard this event? Your draft will not be saved.")) return;
    }
    close2();
  }
  function _render2() {
    const dots = document.getElementById("ecSheetSteps");
    dots.innerHTML = STEPS.map(
      (s, i) => `<div class="ec-step-dot ${i === STATE2.step ? "active" : i < STATE2.step ? "done" : ""}" title="${s.label}"></div>`
    ).join("");
    document.getElementById("ecSheetSub").textContent = `Step ${STATE2.step + 1} of ${STEPS.length} \xB7 ${STEPS[STATE2.step].label}`;
    document.getElementById("ecBackBtn").style.visibility = STATE2.step === 0 ? "hidden" : "visible";
    document.getElementById("ecNextBtn").textContent = STATE2.step === STEPS.length - 1 ? "Publish" : "Next";
    const key = STEPS[STATE2.step].key;
    const c = document.getElementById("ecSheetContent");
    const steps = window.EventsCreateSteps || {};
    if (key === "basics" && steps.basics) {
      c.innerHTML = steps.basics.html();
      steps.basics.wire();
    }
    if (key === "when" && steps.when) {
      c.innerHTML = steps.when.html();
      steps.when.wire();
    }
    if (key === "pricing" && steps.pricing) {
      c.innerHTML = steps.pricing.html();
      steps.pricing.wire();
    }
    if (key === "review" && steps.review) {
      c.innerHTML = steps.review.html();
      steps.review.wire();
    }
  }
  function _raffleApi2() {
    return window.EventsCreateRaffleBuilder;
  }
  function _validateStep() {
    const f = STATE2.form;
    const key = STEPS[STATE2.step].key;
    if (key === "basics") {
      if (!f.title.trim()) return "Title is required.";
      if (f.title.trim().length < 3) return "Title must be at least 3 characters.";
      if (f.event_type !== "member") return 'M4a only supports Member events. Use the legacy "Create Event" button for LLC or Competition.';
    }
    if (key === "when") {
      if (!f.start_date) return "Start date is required.";
      if (f.end_date && f.end_date < f.start_date) return "End date must be after start date.";
      if (f.rsvp_deadline && f.rsvp_deadline > f.start_date) return "RSVP deadline must be before the event starts.";
    }
    if (key === "pricing") {
      if (f.pricing_mode === "paid" && (!f.rsvp_cost_dollars || Number(f.rsvp_cost_dollars) <= 0)) return "Paid events need a price greater than zero.";
      if (f.raffle_enabled && Number(f.raffle_entry_cost_dollars || 0) < 0) return "Raffle entry price cannot be negative.";
      if (f.raffle_enabled) {
        const rb = _raffleApi2();
        const result = rb.raffleModel().validateConfig(rb.ensureRaffleConfig());
        if (!result.valid) return result.errors[0];
      }
    }
    return null;
  }
  function _back() {
    if (STATE2.step === 0) return;
    STATE2.step--;
    _render2();
  }
  function _next() {
    const err = _validateStep();
    if (err) return alert(err);
    if (STATE2.step < STEPS.length - 1) {
      STATE2.step++;
      _render2();
    } else {
      _submit("open");
    }
  }
  function _submit(status) {
    window.EventsCreateSubmit.submit(status);
  }
  function _esc6(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function _bindCreateStepsApi() {
    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.getState = () => STATE2;
    window.EventsCreateSteps.render = _render2;
    window.EventsCreateSteps.validateStep = _validateStep;
    window.EventsCreateSteps.close = close2;
    window.EventsCreateSteps.esc = _esc6;
    window.EventsCreateSteps.CATEGORIES = CATEGORIES;
    window.EventsCreateSteps.TIMEZONES = TIMEZONES;
    const rb = _raffleApi2();
    window.EventsCreateSteps.raffleBuilderHtml = rb.builderHtml;
    window.EventsCreateSteps.raffleReviewHtml = rb.reviewHtml;
    window.EventsCreateSteps.ensureRaffleConfig = rb.ensureRaffleConfig;
    window.EventsCreateSteps.wireRaffleBuilder = rb.wire;
  }
  _bindCreateStepsApi();
  var eventsCreateApi = { open: open3, close: close2, isFlagOn };
  globalThis.EventsCreate = eventsCreateApi;
  var PortalEvents13 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents13.create = PortalEvents13.create || {};
  PortalEvents13.create.open = eventsCreateApi.open;
  PortalEvents13.create.close = eventsCreateApi.close;
  PortalEvents13.create.isFlagOn = eventsCreateApi.isFlagOn;

  // js/portal/events/engagement/raffle.js
  async function evtOpenRaffleDraw(eventId2, eventOverride) {
    const eventList = typeof globalThis.evtAllEvents !== "undefined" ? globalThis.evtAllEvents : [];
    const event = eventOverride || eventList.find((e) => e.id === eventId2);
    if (!event || !event.raffle_enabled) return;
    window.__evtRaffleEventCache = window.__evtRaffleEventCache || {};
    window.__evtRaffleEventCache[eventId2] = event;
    const modal = document.getElementById("raffleDrawModal");
    const content = document.getElementById("raffleDrawContent");
    if (!modal || !content) return;
    content.innerHTML = `<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto"></div><p class="text-sm text-gray-500 mt-3">Loading raffle pool\u2026</p></div>`;
    globalThis.evtToggleModal("raffleDrawModal", true);
    try {
      const { data: entries, error } = await supabaseClient.from("event_raffle_entries").select("id, user_id, guest_token, profiles:user_id(first_name, last_name, profile_picture_url)").eq("event_id", eventId2).eq("paid", true);
      if (error) throw error;
      const pool = entries || [];
      const existingWinners = await evtLoadRaffleWinnersForDraw(eventId2);
      const wonUserIds = new Set((existingWinners || []).map((w) => w.user_id).filter(Boolean));
      const wonGuestTokens = new Set((existingWinners || []).map((w) => w.guest_token).filter(Boolean));
      const alreadyDrawnCount = (existingWinners || []).length;
      const eligible = pool.filter(
        (e) => !(e.user_id && wonUserIds.has(e.user_id)) && !(e.guest_token && wonGuestTokens.has(e.guest_token))
      );
      const raffleConfig2 = evtGetRaffleConfig(event);
      const drawQueue = evtGetRaffleDrawQueue(event, existingWinners || []);
      const winnerCount = event.raffle_winner_count || window.EventsRaffleModel?.getTotalWinnerCount(raffleConfig2) || drawQueue.length || 1;
      const remainingDraws = Math.max(0, drawQueue.length || winnerCount - alreadyDrawnCount);
      content.innerHTML = evtRenderDrawUI(eventId2, eligible, raffleConfig2, drawQueue, alreadyDrawnCount, remainingDraws, existingWinners || []);
    } catch (err) {
      console.error("Raffle draw error:", err);
      content.innerHTML = `<div class="text-center py-8"><p class="text-sm text-red-600">Failed to load raffle pool. Please try again.</p></div>`;
    }
  }
  function evtRenderDrawUI(eventId2, eligible, raffleConfig2, drawQueue, alreadyDrawnCount, remainingDraws, existingWinners) {
    let winnersHtml = "";
    if (existingWinners.length > 0) {
      winnersHtml = `
        <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <h4 class="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Already Drawn</h4>
            ${existingWinners.map((w) => `
                <div class="flex items-center gap-2 text-sm py-1">
                    <span class="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">${w.place}</span>
                    <span class="text-gray-700">${w.user_id ? "Member" : "Guest"}</span>
                </div>
            `).join("")}
        </div>`;
    }
    if (remainingDraws <= 0) {
      return `
            <div class="text-center py-4">
                <span class="text-4xl">\u{1F3C6}</span>
                <h3 class="text-lg font-bold text-gray-900 mt-2">All Winners Drawn!</h3>
                <p class="text-sm text-gray-500 mt-1">The raffle is complete.</p>
            </div>
            ${winnersHtml}
            <button onclick="globalThis.evtToggleModal('raffleDrawModal',false)" class="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition">Close</button>`;
    }
    const nextPlace = alreadyDrawnCount + 1;
    const nextSlot = drawQueue[0] || null;
    const nextPrizeLabel = evtPrizeSlotLabel(nextSlot) || evtLegacyPrizeLabel(raffleConfig2, nextPlace);
    return `
        <div class="text-center">
            <span class="text-4xl">\u{1F3B0}</span>
            <h3 class="text-lg font-bold text-gray-900 mt-2">Raffle Draw</h3>
            <p class="text-sm text-gray-500 mt-1">${eligible.length} eligible entries \u2022 ${remainingDraws} draw${remainingDraws > 1 ? "s" : ""} remaining</p>
        </div>

        ${winnersHtml}

        <div class="mt-4 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl text-center">
            <p class="text-xs font-bold text-violet-600 uppercase tracking-wide">Drawing for Place #${nextPlace}</p>
            ${nextPrizeLabel ? `<p class="text-sm font-semibold text-gray-800 mt-1">${evtEscapeHtml(nextPrizeLabel)}</p>` : ""}
            ${nextSlot?.category_label ? `<p class="text-xs text-violet-500 mt-1">${evtEscapeHtml(nextSlot.category_label)} \xB7 ${evtDrawModeLabel(nextSlot.draw_mode)}</p>` : ""}
        </div>

        <div id="raffleAnimation" class="mt-4 h-20 flex items-center justify-center hidden">
            <div class="text-center">
                <div class="text-3xl animate-bounce" id="raffleEmoji">\u{1F3B2}</div>
                <p class="text-sm text-gray-500 mt-1 animate-pulse">Drawing\u2026</p>
            </div>
        </div>
        <div id="raffleWinnerResult" class="mt-4 hidden"></div>

        ${eligible.length > 0 ? `
        <button id="drawWinnerBtn" ${evtDataAction("evtDrawWinner", eventId2, nextPlace)} class="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
            \u{1F3B2} Draw Winner #${nextPlace}
        </button>` : `
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
            <p class="text-sm text-red-600 font-semibold">No eligible entries remaining</p>
        </div>`}

        <button onclick="globalThis.evtToggleModal('raffleDrawModal',false)" class="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition">Close</button>`;
  }
  function evtGetRaffleConfig(event) {
    if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
    return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
  }
  function evtGetRaffleDrawQueue(event, existingWinners) {
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getDrawQueue(evtGetRaffleConfig(event), existingWinners || []);
  }
  function evtResolvePrizeSlot(event, existingWinners, place) {
    const queue = evtGetRaffleDrawQueue(event, existingWinners);
    let slot = queue.find((entry) => entry.place === place) || queue[0] || null;
    if (!slot) return null;
    if (slot.draw_mode === "random_item") {
      slot = evtAssignRandomPrizeSlot(event, existingWinners, slot);
    }
    return slot;
  }
  function evtAssignRandomPrizeSlot(event, existingWinners, slot) {
    const model = window.EventsRaffleModel;
    if (!model) return slot;
    const config = evtGetRaffleConfig(event);
    const items = model.getItemsForCategory(config, slot.category_id);
    const usedByPrize = /* @__PURE__ */ new Map();
    (existingWinners || []).forEach((winner) => {
      if (!winner.prize_id) return;
      usedByPrize.set(winner.prize_id, (usedByPrize.get(winner.prize_id) || 0) + 1);
    });
    const availableItems = items.filter((item2) => (usedByPrize.get(item2.id) || 0) < item2.quantity);
    if (!availableItems.length) return slot;
    const item = availableItems[evtCryptoRandomInt(availableItems.length)];
    return {
      ...slot,
      prize_id: item.id,
      prize_name: item.name,
      prize_image_url: item.image_url || null,
      prize_emoji: item.emoji || model.DEFAULT_EMOJI || "\u{1F381}",
      selection_status: "assigned"
    };
  }
  function evtPrizeSlotLabel(slot) {
    if (!slot) return "";
    if (slot.prize_name) return slot.prize_name;
    if (slot.draw_mode === "winner_choice") return `${slot.category_label || "Prize tier"} choice`;
    if (slot.category_label) return slot.category_label;
    return "";
  }
  function evtLegacyPrizeLabel(raffleConfig2, place) {
    if (Array.isArray(raffleConfig2)) return raffleConfig2[place - 1]?.label || raffleConfig2[place - 1] || "";
    if (!window.EventsRaffleModel || !raffleConfig2) return "";
    const queue = window.EventsRaffleModel.getDrawQueue(raffleConfig2, []);
    return evtPrizeSlotLabel(queue.find((slot) => slot.place === place));
  }
  function evtDrawModeLabel(drawMode) {
    if (drawMode === "random_item") return "Random prize assigned";
    if (drawMode === "winner_choice") return "Winner chooses later";
    return "Specific prize";
  }
  async function evtInsertRaffleWinner(winnerRecord) {
    const result = await supabaseClient.from("event_raffle_winners").insert(winnerRecord);
    if (!result.error) return result;
    const message = result.error.message || "";
    const canRetryLegacy = /prize_id|category_id|category_label|draw_mode|prize_image_url|prize_emoji|selection_status|schema cache|column/i.test(message);
    if (!canRetryLegacy) return result;
    const legacyRecord = {
      event_id: winnerRecord.event_id,
      place: winnerRecord.place,
      user_id: winnerRecord.user_id,
      guest_token: winnerRecord.guest_token,
      prize_description: winnerRecord.prize_description
    };
    return supabaseClient.from("event_raffle_winners").insert(legacyRecord);
  }
  async function evtLoadRaffleWinnersForDraw(eventId2) {
    const fullSelect = "user_id, guest_token, place, prize_id, category_id, category_label, draw_mode, prize_description, prize_image_url, prize_emoji, selection_status";
    const full = await supabaseClient.from("event_raffle_winners").select(fullSelect).eq("event_id", eventId2);
    if (!full.error) return full.data || [];
    const message = full.error.message || "";
    if (!/prize_id|category_id|category_label|draw_mode|prize_image_url|prize_emoji|selection_status|schema cache|column/i.test(message)) {
      throw full.error;
    }
    const legacy = await supabaseClient.from("event_raffle_winners").select("user_id, guest_token, place, prize_description").eq("event_id", eventId2);
    if (legacy.error) throw legacy.error;
    return legacy.data || [];
  }
  async function evtDrawWinner(eventId2, place) {
    const btn = document.getElementById("drawWinnerBtn");
    const animEl = document.getElementById("raffleAnimation");
    const resultEl = document.getElementById("raffleWinnerResult");
    if (btn) btn.disabled = true;
    if (animEl) animEl.classList.remove("hidden");
    try {
      const { data: entries } = await supabaseClient.from("event_raffle_entries").select("id, user_id, guest_token, profiles:user_id(first_name, last_name, profile_picture_url)").eq("event_id", eventId2).eq("paid", true);
      const existingWinners = await evtLoadRaffleWinnersForDraw(eventId2);
      const wonUserIds = new Set((existingWinners || []).map((w) => w.user_id).filter(Boolean));
      const wonGuestTokens = new Set((existingWinners || []).map((w) => w.guest_token).filter(Boolean));
      const eligible = (entries || []).filter(
        (e) => !(e.user_id && wonUserIds.has(e.user_id)) && !(e.guest_token && wonGuestTokens.has(e.guest_token))
      );
      if (eligible.length === 0) {
        if (resultEl) resultEl.innerHTML = `<p class="text-sm text-red-600 text-center font-semibold">No eligible entries!</p>`;
        resultEl?.classList.remove("hidden");
        if (animEl) animEl.classList.add("hidden");
        return;
      }
      const randomIndex = evtCryptoRandomInt(eligible.length);
      const winner = eligible[randomIndex];
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const eventList = typeof globalThis.evtAllEvents !== "undefined" ? globalThis.evtAllEvents : [];
      const event = window.__evtRaffleEventCache?.[eventId2] || eventList.find((e) => e.id === eventId2);
      const slot = evtResolvePrizeSlot(event, existingWinners || [], place);
      const prizeDesc = evtPrizeSlotLabel(slot) || evtLegacyPrizeLabel(evtGetRaffleConfig(event), place) || null;
      const winnerRecord = {
        event_id: eventId2,
        place,
        prize_description: prizeDesc,
        prize_id: slot?.prize_id || null,
        category_id: slot?.category_id || null,
        category_label: slot?.category_label || null,
        draw_mode: slot?.draw_mode || null,
        prize_image_url: slot?.prize_image_url || null,
        prize_emoji: slot?.prize_emoji || null,
        selection_status: slot?.selection_status || "assigned"
      };
      if (winner.user_id) {
        winnerRecord.user_id = winner.user_id;
      } else {
        winnerRecord.guest_token = winner.guest_token;
      }
      const { error } = await evtInsertRaffleWinner(winnerRecord);
      if (error) throw error;
      const p = winner.profiles;
      let name = "";
      let initials = "?";
      let avatar = "";
      if (p) {
        name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        initials = ((p.first_name?.[0] || "") + (p.last_name?.[0] || "")).toUpperCase();
        avatar = p.profile_picture_url ? `<img src="${p.profile_picture_url}" class="w-16 h-16 rounded-full object-cover border-4 border-amber-300 shadow-lg" alt="">` : `<div class="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-300 shadow-lg flex items-center justify-center text-amber-700 text-xl font-bold">${initials}</div>`;
      } else if (winner.guest_token) {
        const { data: guestInfo } = await supabaseClient.from("event_guest_rsvps").select("guest_name").eq("guest_token", winner.guest_token).maybeSingle();
        name = guestInfo?.guest_name || "Guest";
        initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
        avatar = `<div class="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-300 shadow-lg flex items-center justify-center text-amber-700 text-xl font-bold">${initials}</div>`;
      } else {
        name = "Unknown";
        avatar = `<div class="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-300 shadow-lg flex items-center justify-center text-amber-700 text-xl font-bold">?</div>`;
      }
      if (animEl) animEl.classList.add("hidden");
      if (resultEl) {
        resultEl.innerHTML = `
                <div class="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl shadow-lg animate-in">
                    <div class="text-3xl mb-2">\u{1F389}\u{1F3C6}\u{1F389}</div>
                    ${avatar}
                    <h4 class="text-lg font-extrabold text-gray-900 mt-3">${evtEscapeHtml(name)}</h4>
                    <p class="text-sm text-amber-700 font-semibold mt-1">${place}${evtOrdinalSuffix(place)} Place Winner!</p>
                    ${prizeDesc ? `<p class="text-sm text-gray-600 mt-1">\u{1F381} ${evtEscapeHtml(prizeDesc)}</p>` : ""}
                </div>`;
        resultEl.classList.remove("hidden");
      }
      evtCelebrate();
      document.dispatchEvent(new CustomEvent("events:raffle:drawn", { detail: { eventId: eventId2 } }));
      if (btn) {
        const nextPlace = place + 1;
        const totalWinners = event?.raffle_winner_count || window.EventsRaffleModel?.getTotalWinnerCount(evtGetRaffleConfig(event)) || 1;
        if (nextPlace <= totalWinners) {
          btn.textContent = `\u{1F3B2} Draw Winner #${nextPlace}`;
          btn.onclick = () => evtDrawWinner(eventId2, nextPlace);
          btn.disabled = false;
        } else {
          btn.textContent = "\u{1F3C6} All Winners Drawn!";
          btn.classList.replace("bg-violet-600", "bg-emerald-600");
          btn.classList.replace("hover:bg-violet-700", "hover:bg-emerald-700");
          btn.onclick = () => {
            globalThis.evtToggleModal("raffleDrawModal", false);
            globalThis.evtOpenDetail(eventId2);
          };
          btn.disabled = false;
        }
      }
    } catch (err) {
      console.error("Draw error:", err);
      if (animEl) animEl.classList.add("hidden");
      if (resultEl) {
        resultEl.innerHTML = `<p class="text-sm text-red-600 text-center font-semibold">Draw failed: ${err.message}</p>`;
        resultEl.classList.remove("hidden");
      }
      if (btn) btn.disabled = false;
    }
  }
  function evtCryptoRandomInt(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  }
  function evtOrdinalSuffix(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }
  function evtCelebrate() {
    const container = document.getElementById("raffleDrawContent") || document.body;
    const colors = ["#f59e0b", "#8b5cf6", "#ef4444", "#10b981", "#3b82f6", "#ec4899"];
    for (let i = 0; i < 60; i++) {
      const confetti = document.createElement("div");
      confetti.style.cssText = `
            position: absolute;
            width: ${4 + Math.random() * 6}px;
            height: ${4 + Math.random() * 6}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
            top: 50%;
            left: ${10 + Math.random() * 80}%;
            opacity: 1;
            pointer-events: none;
            z-index: 100;
            animation: evtConfettiFall ${1 + Math.random() * 1.5}s ease-out forwards;
        `;
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.appendChild(confetti);
      setTimeout(() => confetti.remove(), 3e3);
    }
    if (!document.getElementById("evtConfettiStyle")) {
      const style = document.createElement("style");
      style.id = "evtConfettiStyle";
      style.textContent = `
            @keyframes evtConfettiFall {
                0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
                100% { transform: translateY(${150 + Math.random() * 100}px) rotate(${360 + Math.random() * 360}deg) scale(0.5); opacity: 0; }
            }
        `;
      document.head.appendChild(style);
    }
  }
  function evtCloseRaffleDraw() {
    globalThis.evtToggleModal("raffleDrawModal", false);
  }
  publishGlobals({
    evtOpenRaffleDraw,
    evtRenderDrawUI,
    evtGetRaffleConfig,
    evtGetRaffleDrawQueue,
    evtResolvePrizeSlot,
    evtAssignRandomPrizeSlot,
    evtPrizeSlotLabel,
    evtLegacyPrizeLabel,
    evtDrawModeLabel,
    evtInsertRaffleWinner,
    evtLoadRaffleWinnersForDraw,
    evtDrawWinner,
    evtCryptoRandomInt,
    evtOrdinalSuffix,
    evtCelebrate,
    evtCloseRaffleDraw
  });

  // js/portal/events/manage/shell.js
  var M3A_TABS = [
    { key: "overview", label: "Overview" },
    { key: "images", label: "Images" },
    { key: "rsvps", label: "RSVPs" },
    { key: "notifications", label: "Notifications" },
    { key: "money", label: "Money" },
    { key: "docs", label: "Docs" },
    { key: "raffle", label: "Raffle" },
    { key: "comp", label: "Comp" },
    { key: "danger", label: "Danger Zone" }
  ];
  function api8() {
    return window.EventsManageShellApi || {};
  }
  function getState2() {
    return api8().getState?.() || {};
  }
  function ensureMounted2() {
    if (document.getElementById("emSheetRoot")) return;
    const root2 = document.createElement("div");
    root2.id = "emSheetRoot";
    root2.innerHTML = `
        <div id="emSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
        <div id="emSheet" class="em-sheet-hidden fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
            <div id="emSheetPanel" class="bg-white w-full sm:max-w-3xl sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-none translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:90vh">
                <header id="emSheetHeader" class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Manage Event</p>
                        <h2 id="emSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">\u2026</h2>
                        <p id="emSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                    </div>
                    <button id="emSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </header>
                <nav id="emSheetTabs" class="flex gap-1 px-3 sm:px-4 border-b border-gray-100 overflow-x-auto flex-shrink-0" style="scrollbar-width:none;-ms-overflow-style:none"></nav>
                <div id="emSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"></div>
            </div>
        </div>
        <style>
            .em-sheet-hidden { display:none !important; }
            #emSheetTabs::-webkit-scrollbar { display: none; }
            .em-tab { white-space:nowrap; padding:10px 12px; font-size:13px; font-weight:600; color:#6b7280; border-bottom:2px solid transparent; transition:color .15s,border-color .15s; cursor:pointer; }
            .em-tab:hover { color:#374151; }
            .em-tab.active { color:#4f46e5; border-bottom-color:#4f46e5; }
            .em-tab.placeholder { color:#cbd5e1; }
            .em-tab.placeholder.active { color:#9ca3af; border-bottom-color:#cbd5e1; }
            .em-card { background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:16px; padding:16px; }
            .em-op-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:12px; }
            .em-op-card { min-height:150px; display:flex; flex-direction:column; gap:12px; }
            .em-op-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
            .em-op-kicker { font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#9ca3af; margin:0 0 3px; }
            .em-op-title { font-size:15px; font-weight:800; color:#111827; margin:0; line-height:1.15; }
            .em-op-icon { width:34px; height:34px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; flex-shrink:0; }
            .em-op-copy { font-size:12px; line-height:1.45; color:#6b7280; margin:0; }
            .em-op-meta { margin-top:auto; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
            .em-op-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:999px; background:#f8fafc; color:#475569; font-size:11px; font-weight:700; }
            .em-op-progress { height:7px; border-radius:999px; overflow:hidden; background:#eef2f7; margin-top:auto; }
            .em-op-progress span { display:block; height:100%; width:0; border-radius:inherit; background:#4f46e5; }
            .em-command-card { background:linear-gradient(135deg,#111827,#312e81); color:#fff; border:0; overflow:hidden; position:relative; }
            .em-command-card:after { content:""; position:absolute; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,.08); right:-70px; top:-80px; }
            .em-command-eyebrow { font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#c7d2fe; margin:0 0 6px; }
            .em-command-title { font-size:20px; font-weight:850; margin:0; line-height:1.15; }
            .em-command-copy { font-size:12px; line-height:1.5; color:#dbeafe; margin:8px 0 0; max-width:560px; }
            .em-metric-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
            .em-metric { background:#fff; border:1px solid rgba(15,23,42,.06); border-radius:16px; padding:13px; min-width:0; }
            .em-metric span { display:block; font-size:10px; font-weight:800; letter-spacing:.08em; color:#94a3b8; text-transform:uppercase; }
            .em-metric strong { display:block; margin-top:5px; font-size:22px; line-height:1; color:#0f172a; }
            .em-metric small { display:block; margin-top:5px; color:#64748b; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .em-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
            .em-section-title { margin:0; color:#111827; font-size:14px; font-weight:850; }
            .em-section-sub { margin:3px 0 0; color:#94a3b8; font-size:12px; line-height:1.4; }
            .em-attendee-card { display:flex; gap:12px; align-items:flex-start; padding:13px 0; border-top:1px solid #f1f5f9; }
            .em-attendee-card:first-of-type { border-top:0; padding-top:0; }
            .em-attendee-main { flex:1; min-width:0; }
            .em-attendee-name { margin:0; font-size:14px; font-weight:800; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .em-attendee-sub { margin:2px 0 0; color:#64748b; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .em-money-layout { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(260px,.9fr); gap:12px; align-items:start; }
            .em-money-row { display:flex; justify-content:space-between; gap:14px; padding:11px 0; border-top:1px solid #f1f5f9; font-size:13px; }
            .em-money-row:first-child { border-top:0; padding-top:0; }
            .em-money-row span { color:#64748b; }
            .em-money-row strong { color:#111827; }
            .em-stat { display:flex; flex-direction:column; gap:4px; }
            .em-stat-label { font-size:11px; text-transform:uppercase; letter-spacing:.04em; font-weight:600; color:#6b7280; }
            .em-stat-num { font-size:24px; font-weight:800; color:#111827; }
            .em-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f1f5f9; }
            .em-row:last-child { border-bottom:none; }
            .em-avatar { width:32px; height:32px; border-radius:50%; background:#e0e7ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; overflow:hidden; }
            .em-avatar img { width:100%; height:100%; object-fit:cover; }
            .em-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
            .em-pill-going { background:#d1fae5; color:#065f46; }
            .em-pill-maybe { background:#fce7f3; color:#9d174d; }
            .em-pill-not { background:#fee2e2; color:#991b1b; }
            .em-pill-paid { background:#fef3c7; color:#92400e; }
            .em-pill-checked { background:#ede9fe; color:#5b21b6; }
            .em-danger-card { background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:14px; margin-bottom:10px; }
            .em-danger-title { font-weight:700; color:#991b1b; font-size:14px; }
            .em-danger-sub { font-size:12px; color:#7f1d1d; margin-top:2px; margin-bottom:10px; }
            .em-btn-danger { background:#dc2626; color:#fff; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
            .em-btn-danger:hover { background:#b91c1c; }
            .em-btn-ghost { background:#f3f4f6; color:#374151; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
            .em-btn-ghost:hover { background:#e5e7eb; }
            .em-btn-primary { background:#4f46e5; color:#fff; padding:9px 14px; border-radius:10px; font-size:13px; font-weight:700; border:none; cursor:pointer; }
            .em-btn-primary:hover { background:#4338ca; }
            .em-btn-primary:disabled { opacity:.55; cursor:not-allowed; }
            .em-input { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:9px 11px; font-size:13px; color:#111827; background:#fff; }
            .em-input:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.18); }
            .em-textarea { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:9px 11px; font-size:13px; color:#111827; background:#fff; resize:vertical; min-height:92px; }
            .em-textarea:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.18); }
            .em-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; color:#9ca3af; }
            .em-placeholder svg { width:48px; height:48px; margin-bottom:12px; opacity:.4; }
            .em-notif-row { align-items:flex-start; }
            .em-notif-row input[type="checkbox"] { margin-top:4px; flex-shrink:0; }
            @media(max-width:639px){
                #emSheetPanel { max-height: 92vh; }
                .em-op-grid { grid-template-columns:1fr; }
                .em-metric-grid { grid-template-columns:1fr 1fr; }
                .em-money-layout { grid-template-columns:1fr; }
            }
            @media(min-width:640px) and (max-width:900px){ .em-op-grid { grid-template-columns:1fr 1fr; } .em-money-layout { grid-template-columns:1fr; } }
        </style>
    `;
    document.body.appendChild(root2);
    document.getElementById("emSheetClose").addEventListener("click", () => api8().onClose?.());
    document.getElementById("emSheetBackdrop").addEventListener("click", () => api8().onClose?.());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.getElementById("emSheet")?.classList.contains("em-open")) api8().onClose?.();
    });
  }
  function renderHeader2() {
    const e = getState2().event;
    if (!e) return;
    document.getElementById("emSheetTitle").textContent = e.title;
    const dateStr = new Date(e.start_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const typeLabel = { llc: "LLC", member: "Member", competition: "Competition" }[e.event_type] || e.event_type;
    document.getElementById("emSheetSub").textContent = `${typeLabel} \xB7 ${dateStr} \xB7 ${(e.status || "").toUpperCase()}`;
  }
  function getVisibleTabs() {
    const st = getState2();
    return M3A_TABS.filter((t) => {
      if (t.key !== "notifications") return true;
      return !!st.canManageNotifications;
    });
  }
  function renderTabs2() {
    const STATE4 = getState2();
    const bar = document.getElementById("emSheetTabs");
    const tabs = getVisibleTabs();
    bar.innerHTML = tabs.map(
      (t) => `<button class="em-tab${t.placeholder ? " placeholder" : ""}${t.key === STATE4.activeTab ? " active" : ""}" data-tab="${t.key}">${t.label}${t.placeholder ? ' <span style="font-size:9px;opacity:.7">soon</span>' : ""}</button>`
    ).join("");
    bar.querySelectorAll(".em-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const st = getState2();
        st.activeTab = btn.dataset.tab;
        renderTabs2();
        api8().renderTab?.(st.activeTab);
        btn.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
      });
    });
  }
  function renderContent2(html5) {
    document.getElementById("emSheetContent").innerHTML = html5;
  }
  function setLoadingChrome2() {
    document.getElementById("emSheetTitle").textContent = "Loading event\u2026";
    document.getElementById("emSheetSub").textContent = "";
    renderTabs2();
    renderContent2('<div class="em-placeholder"><div style="font-size:13px">Loading\u2026</div></div>');
  }
  function openPanel2() {
    const sheet = document.getElementById("emSheet");
    const panel = document.getElementById("emSheetPanel");
    const backdrop = document.getElementById("emSheetBackdrop");
    sheet.classList.remove("em-sheet-hidden");
    sheet.classList.add("em-open");
    backdrop.classList.remove("opacity-0", "pointer-events-none");
    backdrop.classList.add("opacity-100");
    requestAnimationFrame(() => {
      panel.classList.remove("pointer-events-none", "translate-y-full", "sm:translate-y-4", "sm:opacity-0");
      panel.classList.add("pointer-events-auto", "translate-y-0", "sm:opacity-100");
    });
    document.body.style.overflow = "hidden";
  }
  function closePanel2() {
    const sheet = document.getElementById("emSheet");
    const panel = document.getElementById("emSheetPanel");
    const backdrop = document.getElementById("emSheetBackdrop");
    if (!sheet || !sheet.classList.contains("em-open")) return;
    panel.classList.add("pointer-events-none", "translate-y-full", "sm:translate-y-4", "sm:opacity-0");
    panel.classList.remove("pointer-events-auto", "translate-y-0", "sm:opacity-100");
    backdrop.classList.add("opacity-0", "pointer-events-none");
    backdrop.classList.remove("opacity-100");
    document.body.style.overflow = "";
    setTimeout(() => {
      sheet.classList.remove("em-open");
      sheet.classList.add("em-sheet-hidden");
    }, 250);
  }
  var manageShellApi = {
    ensureMounted: ensureMounted2,
    renderHeader: renderHeader2,
    renderTabs: renderTabs2,
    renderContent: renderContent2,
    setLoadingChrome: setLoadingChrome2,
    openPanel: openPanel2,
    closePanel: closePanel2,
    /** Full tab definitions (single source of truth). */
    tabs: M3A_TABS,
    getTabs: () => M3A_TABS,
    getVisibleTabs
  };
  globalThis.EventsManageShell = manageShellApi;

  // js/portal/events/manage/overview.js
  var PUBLIC_SITE_URL = "https://justicemcneal.com";
  function api9() {
    return window.EventsManageOverviewApi || {};
  }
  function getState3() {
    return api9().getState?.() || {};
  }
  function esc(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function money(cents) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format((cents || 0) / 100);
  }
  function publicEventUrl(event) {
    const slug = event?.slug || "";
    if (typeof globalThis.evtPublicEventInviteUrl === "function") {
      return globalThis.evtPublicEventInviteUrl(slug);
    }
    return PUBLIC_SITE_URL + "/events/?e=" + encodeURIComponent(slug);
  }
  function safeFilename(value) {
    return String(value || "event").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "event";
  }
  function downloadCanvasPng(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
  async function shareInviteUrl(url, event, btn) {
    const title = event?.title ? event.title + " | Justice McNeal LLC" : "Justice McNeal LLC Event";
    const text = event?.rsvp_enabled === false ? "View event details." : "RSVP today.";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (_) {
      }
    }
    await navigator.clipboard.writeText(url);
    if (btn) {
      btn.textContent = "Link copied \u2713";
      setTimeout(() => {
        btn.textContent = "Share invite";
      }, 1500);
    }
  }
  function overviewHtml() {
    const STATE4 = getState3();
    const e = STATE4.event;
    const guestGoing = STATE4.guestRsvps.filter((r) => r.status === "going").length;
    const going = STATE4.rsvps.filter((r) => r.status === "going").length + guestGoing;
    const maybe = STATE4.rsvps.filter((r) => r.status === "maybe").length;
    const paid = STATE4.rsvps.filter((r) => r.paid).length + STATE4.guestRsvps.filter((r) => r.paid).length;
    const checked = STATE4.checkins.length;
    const revenue = paid * (e.rsvp_cost_cents || 0);
    const startLocal = new Date(e.start_date).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const isLlc = e.event_type === "llc";
    const minNeeded = Number(e.min_participants || 0);
    const thresholdPct = minNeeded ? Math.min(100, Math.round(going / minNeeded * 100)) : 0;
    const thresholdMet = minNeeded ? going >= minNeeded : false;
    const deadline = e.rsvp_deadline ? new Date(e.rsvp_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    const transportMode = e.transportation_mode;
    const transportEstimate = e.transportation_estimate_cents ? money(e.transportation_estimate_cents) : "";
    const thresholdCopy = thresholdMet ? `${going} confirmed RSVP${going === 1 ? "" : "s"}; minimum was ${minNeeded}${deadline ? ` by ${deadline}` : ""}. This event can stay confirmed.` : `${going} of ${minNeeded} required RSVP${minNeeded === 1 ? "" : "s"}${deadline ? ` by ${deadline}` : ""}. ${Math.max(0, minNeeded - going)} more RSVP${minNeeded - going === 1 ? "" : "s"} needed.`;
    const inviteUrl = publicEventUrl(e);
    const portalLink = `<a href="../portal/events.html?event=${encodeURIComponent(e.slug || "")}" class="em-btn-ghost" style="text-decoration:none;display:inline-block">Open in portal \u2192</a>`;
    const thresholdCard = isLlc && minNeeded ? `
        <div class="em-card em-op-card">
            <div class="em-op-head">
                <div><p class="em-op-kicker">Minimum</p><p class="em-op-title">${thresholdMet ? "Threshold met" : "Needs momentum"}</p></div>
                <span class="em-op-icon">${thresholdMet ? "\u2705" : "\u26A0\uFE0F"}</span>
            </div>
            <p class="em-op-copy">${thresholdCopy}</p>
            <div class="em-op-progress"><span style="width:${thresholdPct}%"></span></div>
            <div class="em-op-meta"><span class="em-op-chip">${thresholdPct}% filled</span><button class="em-btn-ghost" data-overview-tab="rsvps">Review RSVPs</button></div>
        </div>` : "";
    const transportCard = isLlc && transportMode ? `
        <div class="em-card em-op-card">
            <div class="em-op-head">
                <div><p class="em-op-kicker">Transportation</p><p class="em-op-title">${transportMode === "llc_provides" ? "LLC provided" : "Self-arranged"}</p></div>
                <span class="em-op-icon">${transportMode === "llc_provides" ? "\u2708\uFE0F" : "\u{1F9F3}"}</span>
            </div>
            <p class="em-op-copy">${transportMode === "llc_provides" ? "Upload tickets or travel documents in Docs when they are ready for members." : `Members book travel themselves${transportEstimate ? `, estimated around ${transportEstimate}` : ""}.`}</p>
            <div class="em-op-meta"><button class="em-btn-ghost" data-overview-tab="docs">Open Docs</button><span class="em-op-chip">${transportMode === "llc_provides" ? "Document handoff" : "Member-owned"}</span></div>
        </div>` : "";
    const documentsCard = isLlc ? `
        <div class="em-card em-op-card">
            <div class="em-op-head">
                <div><p class="em-op-kicker">Documents</p><p class="em-op-title">Handoff hub</p></div>
                <span class="em-op-icon">\u{1F4C4}</span>
            </div>
            <p class="em-op-copy">Upload group files or member-specific tickets here. Attendees only see a retrieval button on the event page.</p>
            <div class="em-op-meta"><button class="em-btn-primary" data-overview-tab="docs">Manage Docs</button></div>
        </div>` : "";
    const operationsHtml = [thresholdCard, transportCard, documentsCard].filter(Boolean).join("");
    const showFeaturedToggle = typeof canManageEventBanners === "function" && canManageEventBanners();
    return `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="em-card em-stat"><span class="em-stat-label">Going</span><span class="em-stat-num">${going}${e.max_participants ? `<span style="font-size:14px;color:#9ca3af;font-weight:500">/${e.max_participants}</span>` : ""}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Interested</span><span class="em-stat-num" style="color:#db2777">${maybe}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Checked In</span><span class="em-stat-num" style="color:#7c3aed">${checked}</span></div>
            <div class="em-card em-stat"><span class="em-stat-label">Revenue</span><span class="em-stat-num" style="color:#059669">${money(revenue)}</span></div>
        </div>

        ${operationsHtml ? `<div class="em-op-grid">${operationsHtml}</div>` : ""}

        <div class="em-card mb-3">
            <h3 class="font-bold text-gray-800 text-sm mb-3">Details</h3>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between gap-3"><span class="text-gray-500">When</span><span class="text-gray-800 font-medium text-right">${startLocal}</span></div>
                ${e.location_nickname ? `<div class="flex justify-between gap-3"><span class="text-gray-500">Where</span><span class="text-gray-800 font-medium text-right truncate">${esc(e.location_nickname)}</span></div>` : ""}
                <div class="flex justify-between gap-3"><span class="text-gray-500">Status</span><span class="text-gray-800 font-medium uppercase tracking-wide text-xs">${e.status}</span></div>
                <div class="flex justify-between gap-3"><span class="text-gray-500">Pricing</span><span class="text-gray-800 font-medium">${e.pricing_mode === "paid" ? `Paid \xB7 ${money(e.rsvp_cost_cents)}` : "Free"}</span></div>
                ${e.rsvp_deadline ? `<div class="flex justify-between gap-3"><span class="text-gray-500">RSVP deadline</span><span class="text-gray-800 font-medium">${new Date(e.rsvp_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>` : ""}
            </div>
        </div>

        <div class="em-card mb-3" id="emCopyEditorCard">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Event copy</h3>
                    <p class="em-section-sub">Edit the title and description shown across the portal and invite page.</p>
                </div>
            </div>
            <form id="emCopyForm" class="space-y-3">
                <div>
                    <label for="emCopyTitle" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Title *</label>
                    <input id="emCopyTitle" class="em-input" type="text" maxlength="120" required value="${esc(e.title || "")}">
                </div>
                <div>
                    <label for="emCopyDescription" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                    <textarea id="emCopyDescription" class="em-textarea" rows="4" maxlength="2000">${esc(e.description || "")}</textarea>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button type="submit" id="emCopySave" class="em-btn-primary">Save changes</button>
                    <button type="button" id="emCopyCancel" class="em-btn-ghost">Cancel</button>
                    <span id="emCopyStatus" class="text-xs text-gray-400"></span>
                </div>
            </form>
        </div>

        ${showFeaturedToggle ? `
        <div class="em-card mb-3">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-bold text-gray-800 text-sm">&#9733; Featured on portal</p>
                    <p class="text-xs text-gray-500 mt-0.5">Show this event in the hero banner on the portal events page.</p>
                </div>
                <button id="emFeaturedToggle"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${STATE4.event.is_featured ? "bg-brand-600" : "bg-gray-200"}"
                    role="switch" aria-checked="${STATE4.event.is_featured ? "true" : "false"}"
                    onclick="window._emToggleFeatured()"
                >
                    <span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${STATE4.event.is_featured ? "translate-x-5" : "translate-x-0"}"></span>
                </button>
            </div>
        </div>` : ""}

        <div class="em-card">
            <h3 class="font-bold text-gray-800 text-sm mb-3">Quick actions</h3>
            <div class="flex flex-wrap gap-2">
                ${portalLink}
                ${e.slug ? `<button class="em-btn-ghost" data-copy-invite-url>Copy invite link</button>` : ""}
                ${e.checkin_enabled !== false && e.checkin_mode === "attendee_ticket" && ["open", "confirmed", "active"].includes(e.status) ? `<button class="em-btn-ghost" onclick="window.EventsManage.close();setTimeout(()=>window.evtOpenScanner&&window.evtOpenScanner('${STATE4.eventId}'),150)"><svg style="width:14px;height:14px;display:inline;vertical-align:-2px;margin-right:4px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>Scan Attendees</button>` : ""}
            </div>
            <p class="text-xs text-gray-400 mt-3">Tap any tab above for Money, Docs, Raffle, or Comp details.</p>
        </div>
        ${e.slug ? `
        <div class="em-card mt-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Invitation QR</h3><p class="em-section-sub">Use this public event link on printed or digital invitations.</p></div></div>
            <canvas id="emInviteQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
            <p class="text-xs text-gray-400 text-center mt-2 break-all">${esc(inviteUrl)}</p>
            <div class="flex flex-wrap justify-center gap-2 mt-3">
                <button class="em-btn-primary" data-share-invite-url>Share invite</button>
                <button class="em-btn-primary" data-download-invite-qr>Download QR</button>
                <button class="em-btn-ghost" data-copy-invite-url>Copy invite link</button>
            </div>
        </div>` : ""}
        ${e.checkin_enabled !== false && e.checkin_mode === "venue_scan" && e.venue_qr_token ? `
        <div class="em-card mt-3">
            <h3 class="font-bold text-gray-800 text-sm mb-3">\u{1F4CD} Venue QR Code</h3>
            <canvas id="emVenueQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
            <p class="text-xs text-gray-400 text-center mt-2">Display this at the entrance for attendees to scan</p>
        </div>` : ""}
    `;
  }
  function wireOverview() {
    const STATE4 = getState3();
    const e = STATE4.event;
    if (!e) return;
    const inviteUrl = publicEventUrl(e);
    renderOverviewQrs(inviteUrl, e);
    document.getElementById("emSheetContent").querySelectorAll("[data-copy-invite-url]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(inviteUrl);
        btn.textContent = "Copied \u2713";
        setTimeout(() => {
          btn.textContent = "Copy invite link";
        }, 1500);
      });
    });
    document.getElementById("emSheetContent").querySelectorAll("[data-share-invite-url]").forEach((btn) => {
      btn.addEventListener("click", () => shareInviteUrl(inviteUrl, e, btn));
    });
    document.getElementById("emSheetContent").querySelectorAll("[data-download-invite-qr]").forEach((btn) => {
      btn.addEventListener("click", () => downloadCanvasPng("emInviteQR", `${safeFilename(e.slug || e.title || "event")}-invite-qr.png`));
    });
    document.getElementById("emSheetContent").querySelectorAll("[data-overview-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        STATE4.activeTab = btn.dataset.overviewTab;
        api9().renderTabs?.();
        api9().renderTab?.(STATE4.activeTab);
      });
    });
    const copyForm = document.getElementById("emCopyForm");
    const copyTitle = document.getElementById("emCopyTitle");
    const copyDescription = document.getElementById("emCopyDescription");
    const copyStatus = document.getElementById("emCopyStatus");
    copyForm?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      saveEventCopy(copyForm);
    });
    document.getElementById("emCopyCancel")?.addEventListener("click", () => {
      if (copyTitle) copyTitle.value = STATE4.event?.title || "";
      if (copyDescription) copyDescription.value = STATE4.event?.description || "";
      if (copyStatus) {
        copyStatus.className = "text-xs text-gray-400";
        copyStatus.textContent = "Changes discarded";
        setTimeout(() => {
          copyStatus.textContent = "";
        }, 1800);
      }
    });
    if (STATE4.editCopyOnOpen) {
      STATE4.editCopyOnOpen = false;
      setTimeout(() => {
        document.getElementById("emCopyEditorCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
        copyTitle?.focus();
        copyTitle?.select();
      }, 100);
    }
  }
  async function saveEventCopy(form) {
    const STATE4 = getState3();
    const e = STATE4.event;
    if (!e || !form) return;
    const titleInput = document.getElementById("emCopyTitle");
    const descriptionInput = document.getElementById("emCopyDescription");
    const saveBtn = document.getElementById("emCopySave");
    const status = document.getElementById("emCopyStatus");
    const title = (titleInput?.value || "").trim();
    const description = (descriptionInput?.value || "").trim();
    function setStatus(message, isError) {
      if (!status) return;
      status.className = isError ? "text-xs text-red-600" : "text-xs text-gray-400";
      status.textContent = message;
    }
    if (!title) {
      setStatus("Title is required.", true);
      titleInput?.focus();
      return;
    }
    if (saveBtn) saveBtn.disabled = true;
    setStatus("Saving...", false);
    try {
      const { data, error } = await supabaseClient.from("events").update({ title, description: description || null }).eq("id", e.id).select("title, description").single();
      if (error) throw error;
      STATE4.event.title = data?.title || title;
      STATE4.event.description = data?.description || null;
      api9().renderHeader?.();
      api9().renderTab?.("overview");
      setTimeout(() => {
        const refreshedStatus = document.getElementById("emCopyStatus");
        if (refreshedStatus) {
          refreshedStatus.className = "text-xs text-emerald-600";
          refreshedStatus.textContent = "Saved changes.";
          setTimeout(() => {
            refreshedStatus.textContent = "";
          }, 2500);
        }
      }, 0);
      api9().notifyParent?.("updated", e.id);
    } catch (err) {
      setStatus("Update failed: " + (err.message || "unknown error"), true);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }
  async function ensureQrCode() {
    if (typeof globalThis.evtEnsureQRCode === "function") return window.evtEnsureQRCode();
    return globalThis.QRCode;
  }
  async function renderOverviewQrs(inviteUrl, e) {
    const inviteCanvas = document.getElementById("emInviteQR");
    const venueCanvas = document.getElementById("emVenueQR");
    if ((!inviteCanvas || !e.slug) && (!venueCanvas || !e.venue_qr_token)) return;
    try {
      const qr = await ensureQrCode();
      if (inviteCanvas?.isConnected && e.slug) {
        qr.toCanvas(inviteCanvas, inviteUrl, { width: 220, margin: 2, color: { dark: "#111827", light: "#ffffff" } });
      }
      if (venueCanvas?.isConnected && e.venue_qr_token) {
        qr.toCanvas(venueCanvas, `${window.location.origin}/events/?e=${encodeURIComponent(e.slug || "")}&checkin=1`, { width: 200, margin: 2 });
      }
    } catch (err) {
      console.warn("[events/manage] QR code renderer unavailable", err);
    }
  }
  async function toggleFeatured() {
    const STATE4 = getState3();
    const btn = document.getElementById("emFeaturedToggle");
    if (!btn) return;
    const newVal = !STATE4.event.is_featured;
    btn.disabled = true;
    const { error } = await supabaseClient.from("events").update({ is_featured: newVal }).eq("id", STATE4.event.id);
    if (error) {
      alert("Failed to update: " + error.message);
      btn.disabled = false;
      return;
    }
    STATE4.event.is_featured = newVal;
    api9().renderTab?.("overview");
    document.dispatchEvent(new CustomEvent("events:manage:updated", { detail: { eventId: STATE4.event.id } }));
  }
  var manageOverviewApi = {
    overviewHtml,
    wireOverview,
    saveEventCopy,
    ensureQrCode,
    renderOverviewQrs,
    toggleFeatured
  };
  globalThis._emToggleFeatured = toggleFeatured;
  globalThis.EventsManageOverview = manageOverviewApi;

  // js/portal/events/manage/images.js
  function api10() {
    return window.EventsManageImagesApi || {};
  }
  function esc2(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  var imgFiles = { banner: null, embed: null };
  function imgDropZone(id, label, hint, currentUrl) {
    const STATE4 = api10().getState?.() || {};
    const hasImg = !!currentUrl;
    return `
        <div id="${id}Zone" class="em-img-zone${hasImg ? " em-img-zone--has" : ""}" data-zone="${id}">
            <input id="${id}FileInput" type="file" accept="image/*" style="display:none">
            <img id="${id}Preview" src="${esc2(currentUrl)}" alt=""
                 style="width:100%;border-radius:10px;object-fit:cover;max-height:200px;margin-bottom:10px;${hasImg ? "" : "display:none"}">
            <div id="${id}Prompt" style="${hasImg ? "display:none" : ""}">
                <svg style="width:32px;height:32px;color:#9ca3af;margin-bottom:8px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4-4a3 3 0 014 0l4 4m-4-4l1.5-1.5a3 3 0 014 0L20 16M14 8h.01M4 19h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z"/></svg>
                <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 2px">${label}</p>
                <p style="font-size:11px;color:#9ca3af;margin:0">${hint}</p>
            </div>
            ${hasImg ? `<p style="font-size:11px;color:#9ca3af;margin:0 0 8px;text-align:center">Click or drop to replace</p>` : ""}
            <button type="button" class="em-btn-ghost" style="font-size:12px;padding:6px 12px" data-pick="${id}">Choose file</button>
        </div>
        <p style="font-size:11px;color:#9ca3af;margin-top:6px">Or paste a URL:</p>
        <input id="${id}UrlInput" class="em-input" type="url" placeholder="https://\u2026" value="${esc2(currentUrl)}" style="margin-top:4px">
    `;
  }
  function imagesHtml() {
    const STATE4 = api10().getState?.() || {};
    const e = STATE4.event;
    return `
        <style>
            .em-img-zone { border:2px dashed #e5e7eb; border-radius:14px; padding:24px 16px; text-align:center; cursor:pointer; transition:border-color .15s,background .15s; display:flex; flex-direction:column; align-items:center; gap:4px; }
            .em-img-zone:hover, .em-img-zone.em-drag-over { border-color:#818cf8; background:#f5f3ff; }
            .em-img-zone--has { padding:14px 16px; }
        </style>

        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Images</p>
            <h3 class="em-command-title">Banner &amp; embed image</h3>
            <p class="em-command-copy">The banner is shown at the top of the event detail page. The embed image is used for social media previews \u2014 if none is set, the banner is used as fallback.</p>
        </div>

        <div class="em-card mb-3">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Event banner</h3>
                    <p class="em-section-sub">Hero image on the public event page. Min 1200\xD7400 px recommended.</p>
                </div>
            </div>
            ${imgDropZone("emBanner", "Drop image here or click to upload", "JPG, PNG, WebP \xB7 max 10 MB", e.banner_url || "")}
        </div>

        <div class="em-card mb-4">
            <div class="em-section-head" style="margin-bottom:12px">
                <div>
                    <h3 class="em-section-title">Embed / social preview image</h3>
                    <p class="em-section-sub">Used when the event link is shared on social media. 1200\xD7630 px recommended. Falls back to the banner.</p>
                </div>
            </div>
            ${imgDropZone("emEmbed", "Drop image here or click to upload", "JPG, PNG, WebP \xB7 max 10 MB \xB7 optional", e.embed_image_url || "")}
        </div>

        <div style="display:flex;align-items:center;gap:10px">
            <button id="emImagesSave" class="em-btn-primary">Save images</button>
            <span id="emImagesSaveStatus" style="font-size:12px;color:#6b7280"></span>
        </div>
    `;
  }
  function wireImages() {
    const STATE4 = api10().getState?.() || {};
    const e = STATE4.event;
    imgFiles.banner = null;
    imgFiles.embed = null;
    ["banner", "embed"].forEach((key) => {
      const zoneId = `em${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const zone = document.getElementById(`${zoneId}Zone`);
      const fileInput = document.getElementById(`${zoneId}FileInput`);
      const urlInput = document.getElementById(`${zoneId}UrlInput`);
      const preview = document.getElementById(`${zoneId}Preview`);
      const prompt2 = document.getElementById(`${zoneId}Prompt`);
      const pickBtn = zone?.querySelector(`[data-pick="${zoneId}"]`);
      if (!zone || !fileInput || !urlInput) return;
      function applyFile(file) {
        if (!file || !file.type.startsWith("image/")) return;
        imgFiles[key] = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          preview.src = ev.target.result;
          preview.style.display = "";
          if (prompt2) prompt2.style.display = "none";
          urlInput.value = "";
        };
        reader.readAsDataURL(file);
      }
      zone.addEventListener("click", (ev) => {
        if (ev.target === pickBtn || pickBtn?.contains(ev.target)) return;
        fileInput.click();
      });
      pickBtn?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        fileInput.click();
      });
      fileInput.addEventListener("change", () => {
        if (fileInput.files[0]) applyFile(fileInput.files[0]);
      });
      zone.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        zone.classList.add("em-drag-over");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("em-drag-over"));
      zone.addEventListener("drop", (ev) => {
        ev.preventDefault();
        zone.classList.remove("em-drag-over");
        const file = ev.dataTransfer.files?.[0];
        if (file) applyFile(file);
      });
      urlInput.addEventListener("input", () => {
        const val = urlInput.value.trim();
        imgFiles[key] = null;
        if (val) {
          preview.src = val;
          preview.style.display = "";
          if (prompt2) prompt2.style.display = "none";
        } else {
          preview.style.display = "none";
          if (prompt2) prompt2.style.display = "";
        }
      });
    });
    document.getElementById("emImagesSave")?.addEventListener("click", async () => {
      const saveBtn = document.getElementById("emImagesSave");
      const status = document.getElementById("emImagesSaveStatus");
      saveBtn.disabled = true;
      const slug = e.slug || e.id;
      async function resolveUrl(key, currentUrl) {
        const file = imgFiles[key];
        if (file) {
          status.textContent = `Uploading ${key}\u2026`;
          const ext = file.name.split(".").pop().toLowerCase() || "jpg";
          const path = key === "embed" ? `embeds/${slug}-${Date.now()}.${ext}` : `${slug}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabaseClient.storage.from("event-banners").upload(path, file, { contentType: file.type, upsert: true });
          if (upErr) throw new Error(`${key} upload failed: ${upErr.message}`);
          return supabaseClient.storage.from("event-banners").getPublicUrl(path).data.publicUrl;
        }
        const zoneId = `em${key.charAt(0).toUpperCase() + key.slice(1)}`;
        return document.getElementById(`${zoneId}UrlInput`)?.value.trim() || null;
      }
      try {
        status.textContent = "Saving\u2026";
        const [bannerUrl, embedUrl] = await Promise.all([
          resolveUrl("banner", e.banner_url),
          resolveUrl("embed", e.embed_image_url)
        ]);
        const { error } = await supabaseClient.from("events").update({ banner_url: bannerUrl, embed_image_url: embedUrl }).eq("id", e.id);
        if (error) throw error;
        STATE4.event.banner_url = bannerUrl;
        STATE4.event.embed_image_url = embedUrl;
        imgFiles.banner = null;
        imgFiles.embed = null;
        status.textContent = "Saved \u2713";
        setTimeout(() => {
          status.textContent = "";
        }, 2500);
        api10().notifyParent?.("updated", e.id);
      } catch (err) {
        status.textContent = "Error: " + (err.message || "save failed");
      } finally {
        saveBtn.disabled = false;
      }
    });
  }
  var manageImagesApi = {
    imagesHtml,
    wireImages
  };
  globalThis.EventsManageImages = manageImagesApi;

  // js/portal/events/manage/docs.js
  function api11() {
    return window.EventsManageDocsApi || {};
  }
  function esc3(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  async function loadDocs() {
    const STATE4 = api11().getState?.() || {};
    const { data, error } = await supabaseClient.from("event_documents").select("id, doc_type, label, file_name, file_size_bytes, file_path, distributed, target_user_id, created_at, profiles:target_user_id(first_name, last_name, profile_picture_url)").eq("event_id", STATE4.eventId).order("created_at", { ascending: true });
    if (error) throw error;
    return { docs: data || [] };
  }
  function docTypeIcon(type) {
    const STATE4 = api11().getState?.() || {};
    return {
      plane_ticket: "\u2708\uFE0F",
      group_ticket: "\u{1F3AB}",
      itinerary: "\u{1F5FA}\uFE0F",
      receipt: "\u{1F9FE}",
      other: "\u{1F4C4}"
    }[type] || "\u{1F4C4}";
  }
  function formatBytes(bytes) {
    const STATE4 = api11().getState?.() || {};
    if (!bytes) return "\u2014";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }
  function docsHtml() {
    const STATE4 = api11().getState?.() || {};
    const docs = STATE4.tabData.docs.docs;
    const groupDocs = docs.filter((d) => !d.target_user_id);
    const memberDocs = docs.filter((d) => d.target_user_id);
    const goingMembers = STATE4.rsvps.filter((r) => r.status === "going").map((r) => {
      const profile = r.profiles || {};
      return {
        id: r.user_id,
        name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Member"
      };
    });
    const distributedCount = docs.filter((d) => d.distributed).length;
    const pendingCount = docs.length - distributedCount;
    const distributedPct = docs.length ? Math.round(distributedCount / docs.length * 100) : 0;
    const totalBytes = docs.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);
    function docRow(d) {
      const distBtn = d.distributed ? `<button class="em-pill em-pill-checked" data-doc-action="undistribute" data-id="${d.id}" style="border:none;cursor:pointer">Distributed \u2713</button>` : `<button class="em-pill em-pill-paid" data-doc-action="distribute" data-id="${d.id}" style="border:none;cursor:pointer">Mark sent</button>`;
      return `
            <div class="em-attendee-card">
                <div class="em-avatar" style="background:#fef3c7;color:#92400e;font-size:16px">${docTypeIcon(d.doc_type)}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc3(d.label || d.file_name || "Document")}</p>
                    <p class="em-attendee-sub">${esc3(d.file_name || "")} \xB7 ${formatBytes(d.file_size_bytes)}</p>
                    <div class="flex flex-wrap gap-1 mt-2">${distBtn}<span class="em-pill em-pill-going">${d.target_user_id ? "Member file" : "Group file"}</span></div>
                </div>
                <button data-doc-action="delete" data-id="${d.id}" class="text-xs text-red-600 font-semibold hover:underline" style="background:none;border:none;cursor:pointer">Delete</button>
            </div>
        `;
    }
    function memberSection(memberDoc) {
      const byUser = {};
      memberDoc.forEach((d) => {
        const uid = d.target_user_id;
        (byUser[uid] = byUser[uid] || { user: d.profiles, docs: [] }).docs.push(d);
      });
      const userList = Object.values(byUser);
      if (!userList.length) return `<p class="text-xs text-gray-400 italic py-2">No per-member documents yet.</p>`;
      return userList.map((u) => {
        const p = u.user || {};
        const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Member";
        return `
                <div style="margin-bottom:14px">
                    <div class="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">${esc3(name)} <span class="text-gray-400 font-normal">\xB7 ${u.docs.length}</span></div>
                    ${u.docs.map(docRow).join("")}
                </div>
            `;
      }).join("");
    }
    const memberOptions = goingMembers.map((m) => `<option value="${esc3(m.id)}">${esc3(m.name)}</option>`).join("");
    const typeOptions = (api11().getDocTypes?.() || []).map((t) => `<option value="${esc3(t.value)}">${esc3(t.label)}</option>`).join("");
    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Document handoff</p>
            <h3 class="em-command-title">${pendingCount ? `${pendingCount} document${pendingCount === 1 ? "" : "s"} pending` : "Documents are caught up"}</h3>
            <p class="em-command-copy">Upload group files or member-specific travel docs here. Attendees only see a retrieval button on the event page.</p>
            <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${distributedPct}%;background:#a7f3d0"></span></div>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Total files</span><strong>${docs.length}</strong><small>${formatBytes(totalBytes)}</small></div>
            <div class="em-metric"><span>Distributed</span><strong>${distributedCount}</strong><small>${distributedPct}% complete</small></div>
            <div class="em-metric"><span>Pending</span><strong>${pendingCount}</strong><small>Need handoff</small></div>
            <div class="em-metric"><span>Member files</span><strong>${memberDocs.length}</strong><small>${groupDocs.length} group</small></div>
        </div>

        <div class="em-card mb-4">
            <div class="em-section-head"><div><h3 class="em-section-title">Upload document</h3><p class="em-section-sub">Choose who can retrieve this file from the attendee-facing document viewer.</p></div></div>
            <div class="grid sm:grid-cols-2 gap-3">
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Visible to
                    <select id="emDocTargetMode" class="em-input mt-1">
                        <option value="group">Everyone RSVP'd</option>
                        <option value="member">Specific member</option>
                    </select>
                </label>
                <label id="emDocMemberWrap" class="text-xs font-bold uppercase tracking-wide text-gray-500 hidden">Member
                    <select id="emDocMember" class="em-input mt-1">
                        ${memberOptions || `<option value="">No RSVP'd members yet</option>`}
                    </select>
                </label>
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Label
                    <input id="emDocLabel" type="text" class="em-input mt-1" placeholder="Flight ticket, itinerary, receipt">
                </label>
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Type
                    <select id="emDocType" class="em-input mt-1">${typeOptions}</select>
                </label>
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500 sm:col-span-2">File
                    <input id="emDocFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" class="em-input mt-1">
                </label>
            </div>
            <div class="flex items-center justify-between gap-3 mt-3">
                <p class="text-xs text-gray-400">Uploads live here in Manage Event. Members only see a document viewer button on the event page.</p>
                <button id="emDocUploadBtn" class="em-btn-primary">Upload</button>
            </div>
        </div>

        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Group documents <span class="text-gray-400 font-normal">\xB7 ${groupDocs.length}</span></h3><p class="em-section-sub">Visible to everyone with RSVP access.</p></div></div>
            ${groupDocs.length ? groupDocs.map(docRow).join("") : `<p class="text-xs text-gray-400 italic py-2">No group documents yet.</p>`}
        </div>

        <div class="em-card">
            <div class="em-section-head"><div><h3 class="em-section-title">Per-member documents <span class="text-gray-400 font-normal">\xB7 ${memberDocs.length}</span></h3><p class="em-section-sub">Private files for individual attendees, like tickets or receipts.</p></div></div>
            ${memberSection(memberDocs)}
        </div>
    `;
  }
  function wireDocs() {
    const STATE4 = api11().getState?.() || {};
    const targetMode = document.getElementById("emDocTargetMode");
    const memberWrap = document.getElementById("emDocMemberWrap");
    const type = document.getElementById("emDocType");
    if (type) type.value = "itinerary";
    targetMode?.addEventListener("change", () => {
      memberWrap?.classList.toggle("hidden", targetMode.value !== "member");
      if (type) type.value = targetMode.value === "member" ? "plane_ticket" : "itinerary";
    });
    document.getElementById("emDocUploadBtn")?.addEventListener("click", uploadDocFromManage);
    document.getElementById("emSheetContent").querySelectorAll("[data-doc-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.dataset.docAction;
        const id = btn.dataset.id;
        if (action === "delete") {
          if (!confirm("Delete this document? This cannot be undone.")) return;
          const doc = STATE4.tabData.docs.docs.find((d) => d.id === id);
          if (doc?.file_path) await supabaseClient.storage.from("event-documents").remove([doc.file_path]);
          const { error } = await supabaseClient.from("event_documents").delete().eq("id", id);
          if (error) return alert("Delete failed: " + error.message);
        } else {
          const { error } = await supabaseClient.from("event_documents").update({ distributed: action === "distribute" }).eq("id", id);
          if (error) return alert("Update failed: " + error.message);
        }
        STATE4.tabData.docs = null;
        api11().renderTab?.("docs");
        api11().notifyParent?.("updated", STATE4.eventId);
      });
    });
  }
  async function uploadDocFromManage() {
    const STATE4 = api11().getState?.() || {};
    const btn = document.getElementById("emDocUploadBtn");
    const mode = document.getElementById("emDocTargetMode")?.value || "group";
    const targetUserId = mode === "member" ? document.getElementById("emDocMember")?.value || "" : "";
    const label = (document.getElementById("emDocLabel")?.value || "").trim();
    const docType = document.getElementById("emDocType")?.value || "other";
    const file = document.getElementById("emDocFile")?.files?.[0];
    if (mode === "member" && !targetUserId) return alert("Choose a member for this document.");
    if (!label) return alert("Add a document label.");
    if (!file) return alert("Choose a file to upload.");
    btn.disabled = true;
    btn.textContent = "Uploading...";
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const storagePath = `${STATE4.eventId}/${targetUserId || "group"}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: uploadErr } = await supabaseClient.storage.from("event-documents").upload(storagePath, file, { contentType: file.type || "application/octet-stream" });
      if (uploadErr) throw uploadErr;
      const { error: dbErr } = await supabaseClient.from("event_documents").insert({
        event_id: STATE4.eventId,
        uploaded_by: globalThis.evtCurrentUser.id,
        target_user_id: targetUserId || null,
        doc_type: docType,
        label,
        file_path: storagePath,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type
      });
      if (dbErr) throw dbErr;
      STATE4.tabData.docs = null;
      api11().renderTab?.("docs");
      api11().notifyParent?.("updated", STATE4.eventId);
    } catch (err) {
      alert("Upload failed: " + (err.message || err));
    } finally {
      btn.disabled = false;
      btn.textContent = "Upload";
    }
  }
  var manageDocsApi = {
    loadDocs,
    docsHtml,
    wireDocs,
    uploadDocFromManage
  };
  globalThis.EventsManageDocs = manageDocsApi;

  // js/portal/events/manage/rsvps.js
  function api12() {
    return window.EventsManageRsvpsApi || {};
  }
  function esc4(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function rsvpsHtml() {
    const STATE4 = api12().getState?.() || {};
    const e = STATE4.event;
    const going = STATE4.rsvps.filter((r) => r.status === "going");
    const maybe = STATE4.rsvps.filter((r) => r.status === "maybe");
    const not = STATE4.rsvps.filter((r) => r.status === "not_going");
    const guestGoing = STATE4.guestRsvps.filter((r) => r.status === "going");
    const checkedSet = new Set(STATE4.checkins.map((c) => c.user_id));
    const guestCheckedSet = new Set(STATE4.checkins.map((c) => c.guest_token).filter(Boolean));
    const totalGoing = going.length + guestGoing.length;
    const checkedTotal = STATE4.checkins.length;
    const capacity = e.max_participants || 0;
    const capacityLeft = capacity ? Math.max(0, capacity - totalGoing) : null;
    const minNeeded = Number(e.min_participants || 0);
    const thresholdLeft = minNeeded ? Math.max(0, minNeeded - totalGoing) : 0;
    const checkedPct = totalGoing ? Math.round(checkedTotal / totalGoing * 100) : 0;
    function memberRow(r) {
      const p = r.profiles || {};
      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Member";
      const initials = ((p.first_name?.[0] || "") + (p.last_name?.[0] || "")).toUpperCase() || "?";
      const avatar = p.profile_picture_url ? `<img src="${esc4(p.profile_picture_url)}" alt="">` : `<span>${initials}</span>`;
      const pills = [];
      if (r.status === "going") pills.push('<span class="em-pill em-pill-going">Going</span>');
      else if (r.status === "maybe") pills.push('<span class="em-pill em-pill-maybe">Maybe</span>');
      else pills.push('<span class="em-pill em-pill-not">Not going</span>');
      if (r.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
      if (checkedSet.has(r.user_id)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
      return `<div class="em-attendee-card"><div class="em-avatar">${avatar}</div><div class="em-attendee-main"><p class="em-attendee-name">${esc4(name)}</p><p class="em-attendee-sub">Member RSVP${r.qr_token ? " \xB7 ticket ready" : ""}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join("")}</div></div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-rsvp="member" data-rsvp-id="${esc4(r.id)}" data-user-id="${esc4(r.user_id)}" data-paid="${r.paid ? "1" : "0"}" data-name="${esc4(name)}">Remove</button></div>`;
    }
    function guestRow(g2) {
      const initials = (g2.guest_name || "G").slice(0, 1).toUpperCase();
      const pills = ['<span class="em-pill em-pill-going">Guest</span>'];
      if (g2.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
      if (guestCheckedSet.has(g2.guest_token)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
      const name = g2.guest_name || "Guest";
      return `<div class="em-attendee-card"><div class="em-avatar" style="background:#fef3c7;color:#92400e"><span>${esc4(initials)}</span></div><div class="em-attendee-main"><p class="em-attendee-name">${esc4(name)}</p><p class="em-attendee-sub">${esc4(g2.guest_email || "Public guest")}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join("")}</div></div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-rsvp="guest" data-rsvp-id="${esc4(g2.id)}" data-guest-token="${esc4(g2.guest_token)}" data-paid="${g2.paid ? "1" : "0"}" data-name="${esc4(name)}">Remove</button></div>`;
    }
    function section(title, list, emptyText) {
      return `
            <div class="em-card mb-3">
                <div class="em-section-head"><div><h3 class="em-section-title">${title} <span class="text-gray-400 font-normal">\xB7 ${list.length}</span></h3></div></div>
                ${list.length ? list.map(memberRow).join("") : `<p class="text-xs text-gray-400 italic py-2">${emptyText}</p>`}
            </div>
        `;
    }
    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Attendance command</p>
            <h3 class="em-command-title">${totalGoing ? `${totalGoing} attending` : "No confirmed attendees yet"}</h3>
            <p class="em-command-copy">${thresholdLeft ? `${thresholdLeft} more RSVP${thresholdLeft === 1 ? "" : "s"} needed to meet the minimum.` : "Minimum and attendance signals are in good shape."} ${capacityLeft !== null ? `${capacityLeft} spot${capacityLeft === 1 ? "" : "s"} still available.` : "Capacity is open-ended."}</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Total going</span><strong>${totalGoing}</strong><small>${going.length} member \xB7 ${guestGoing.length} guest</small></div>
            <div class="em-metric"><span>Checked in</span><strong>${checkedTotal}</strong><small>${checkedPct}% of going</small></div>
            <div class="em-metric"><span>Interested</span><strong>${maybe.length}</strong><small>Member maybes</small></div>
            <div class="em-metric"><span>Capacity</span><strong>${capacityLeft === null ? "Open" : capacityLeft}</strong><small>${capacity ? `${totalGoing}/${capacity} filled` : "No max set"}</small></div>
        </div>

        ${section("Going members", going, "No members are going yet.")}
        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Public guests <span class="text-gray-400 font-normal">\xB7 ${guestGoing.length}</span></h3><p class="em-section-sub">Guests from the public event link and ticket flow.</p></div></div>
            ${guestGoing.length ? guestGoing.map(guestRow).join("") : '<p class="text-xs text-gray-400 italic py-2">No public guests yet.</p>'}
        </div>
        ${section("Interested", maybe, "No interested members.")}
        ${not.length ? section("Not going", not, "") : ""}
    `;
  }
  function wireRsvps() {
    const STATE4 = api12().getState?.() || {};
    document.getElementById("emSheetContent")?.querySelectorAll("[data-remove-rsvp]").forEach((btn) => {
      btn.addEventListener("click", () => api12().removeParticipationPerson?.(btn));
    });
  }
  var manageRsvpsApi = {
    rsvpsHtml,
    wireRsvps
  };
  globalThis.EventsManageRsvps = manageRsvpsApi;

  // js/portal/events/manage/notifications.js
  var SOURCE_LABELS = {
    guest_rsvp: "Guest RSVP",
    member_rsvp: "Member RSVP",
    member_profile: "Member profile",
    admin_manual: "Admin"
  };
  var MESSAGE_TYPES = [
    { value: "manual", label: "Manual update" },
    { value: "cancellation", label: "Cancellation" },
    { value: "update", label: "Schedule / location update" }
  ];
  var UI = {
    filter: "all",
    search: "",
    selected: /* @__PURE__ */ new Set(),
    expandedMessageId: null,
    prefillBody: "",
    messageType: "manual",
    selectAllOptedInOnLoad: false
  };
  function api13() {
    return window.EventsManageNotificationsApi || {};
  }
  function esc5(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function maskPhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length < 4) return "***";
    return `***-***-${digits.slice(-4)}`;
  }
  function contactPhone(row) {
    const c = row.sms_phone_contacts;
    if (!c) return "";
    return Array.isArray(c) ? c[0]?.phone_e164 || "" : c.phone_e164 || "";
  }
  function isGuestRecipient(r) {
    return r.consent_source === "guest_rsvp" || !!r.guest_rsvp_id;
  }
  function isMemberRecipient(r) {
    return !isGuestRecipient(r);
  }
  function optOutLabel(r) {
    if (r.opted_in && !r.opted_out_at) return "Opted in";
    if (r.opted_out_at) return "Opted out";
    return "Not opted in";
  }
  function optOutClass(r) {
    if (r.opted_in && !r.opted_out_at) return "em-pill-going";
    if (r.opted_out_at) return "em-pill-not";
    return "em-pill-maybe";
  }
  function _smsSchemaMissingMessage(err) {
    const code = String(err?.code || "");
    const msg = String(err?.message || err?.details || "").toLowerCase();
    const missing = code === "PGRST205" || code === "42P01" || msg.includes("does not exist") || msg.includes("could not find") || msg.includes("schema cache") || msg.includes("not found");
    if (!missing) return null;
    return "Event SMS tables are not deployed on this Supabase project yet. Apply migration supabase/migrations/094_event_sms_notifications.sql (Supabase Dashboard \u2192 SQL, or `supabase db push` on the linked project), then reload.";
  }
  function _throwIfDbError(err, fallback) {
    if (!err) return;
    throw new Error(_smsSchemaMissingMessage(err) || err.message || fallback);
  }
  async function loadNotifications() {
    const STATE4 = api13().getState?.() || {};
    const eventId2 = STATE4.eventId;
    if (!eventId2) return { recipients: [], messages: [], suppressedPhones: /* @__PURE__ */ new Set(), lastSentAt: null };
    const { data: recipients, error: recErr } = await supabaseClient.from("event_sms_recipients").select(`
            id, contact_id, display_name, email, user_id, guest_rsvp_id, event_rsvp_id,
            opted_in, opted_in_at, opted_out_at, consent_source,
            sms_phone_contacts ( phone_e164 )
        `).eq("event_id", eventId2).order("created_at", { ascending: true });
    _throwIfDbError(recErr, "Failed to load SMS recipients");
    const rows = recipients || [];
    const phones = [...new Set(rows.map(contactPhone).filter(Boolean))];
    let suppressedPhones = /* @__PURE__ */ new Set();
    if (phones.length) {
      const { data: supps } = await supabaseClient.from("sms_global_suppressions").select("phone_e164").in("phone_e164", phones).is("released_at", null);
      suppressedPhones = new Set((supps || []).map((s) => s.phone_e164));
    }
    const { data: messages, error: msgErr } = await supabaseClient.from("sms_messages").select("id, body, message_type, sender_user_id, recipient_count, created_at").eq("event_id", eventId2).order("created_at", { ascending: false });
    _throwIfDbError(msgErr, "Failed to load SMS messages");
    const messageList = messages || [];
    const messageIds = messageList.map((m) => m.id);
    let deliveries = [];
    if (messageIds.length) {
      const { data: delRows, error: delErr } = await supabaseClient.from("sms_message_deliveries").select("id, message_id, event_sms_recipient_id, phone_e164, status, status_updated_at, error_message").in("message_id", messageIds);
      _throwIfDbError(delErr, "Failed to load SMS deliveries");
      deliveries = delRows || [];
    }
    const latestByRecipient = {};
    for (const d of deliveries) {
      if (!d.event_sms_recipient_id) continue;
      const prev = latestByRecipient[d.event_sms_recipient_id];
      const ts = new Date(d.status_updated_at || 0).getTime();
      if (!prev || ts >= prev._ts) {
        latestByRecipient[d.event_sms_recipient_id] = { ...d, _ts: ts };
      }
    }
    const deliveriesByMessage = {};
    for (const d of deliveries) {
      if (!deliveriesByMessage[d.message_id]) deliveriesByMessage[d.message_id] = [];
      deliveriesByMessage[d.message_id].push(d);
    }
    const enriched = rows.map((r) => {
      const phone = contactPhone(r);
      return {
        ...r,
        phone_e164: phone,
        phone_masked: maskPhone(phone),
        globally_suppressed: phone ? suppressedPhones.has(phone) : false,
        latest_delivery: latestByRecipient[r.id] || null
      };
    });
    const lastSentAt = messageList.length ? messageList[0].created_at : null;
    return {
      recipients: enriched,
      messages: messageList,
      deliveriesByMessage,
      suppressedPhones,
      lastSentAt,
      senderProfiles: {}
    };
  }
  function getFilteredRecipients(data) {
    const q = UI.search.trim().toLowerCase();
    return (data.recipients || []).filter((r) => {
      if (UI.filter === "opted_in" && !(r.opted_in && !r.opted_out_at)) return false;
      if (UI.filter === "opted_out" && (r.opted_in && !r.opted_out_at)) return false;
      if (UI.filter === "guests" && !isGuestRecipient(r)) return false;
      if (UI.filter === "members" && !isMemberRecipient(r)) return false;
      if (UI.filter === "failed") {
        const st = r.latest_delivery?.status;
        if (st !== "failed" && st !== "undelivered") return false;
      }
      if (q) {
        const last4 = (r.phone_e164 || "").replace(/\D/g, "").slice(-4);
        const hay = `${r.display_name || ""} ${r.email || ""} ${last4}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
  function isEligibleToSend(r) {
    return !!(r.opted_in && !r.opted_out_at && r.phone_e164 && !r.globally_suppressed);
  }
  function summaryMetrics(data) {
    const all = data.recipients || [];
    const optedIn = all.filter((r) => r.opted_in && !r.opted_out_at).length;
    const optedOutCount = all.filter((r) => r.opted_out_at || !r.opted_in).length;
    const suppressed = all.filter((r) => r.globally_suppressed).length;
    return {
      total: all.length,
      optedIn,
      optedOut: optedOutCount,
      suppressed,
      lastSentAt: data.lastSentAt
    };
  }
  function notificationsHtml() {
    const STATE4 = api13().getState?.() || {};
    const data = STATE4.tabData?.notifications || { recipients: [], messages: [] };
    const metrics = summaryMetrics(data);
    const visible = getFilteredRecipients(data);
    const selectedEligible = [...UI.selected].filter((id) => {
      const row = data.recipients.find((r) => r.id === id);
      return row && isEligibleToSend(row);
    });
    const lastSentLabel = metrics.lastSentAt ? new Date(metrics.lastSentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never";
    const recipientRows = visible.length ? visible.map((r) => {
      const checked = UI.selected.has(r.id) ? " checked" : "";
      const disabled = isEligibleToSend(r) ? "" : " disabled";
      const delivery = r.latest_delivery?.status ? `<span class="em-pill">${esc5(r.latest_delivery.status)}</span>` : '<span class="text-xs text-gray-400">\u2014</span>';
      const suppressed = r.globally_suppressed ? '<span class="em-pill em-pill-not">STOP</span>' : "";
      return `
                <div class="em-row em-notif-row" data-recipient-id="${esc5(r.id)}">
                    <input type="checkbox" class="em-notif-check" data-recipient-id="${esc5(r.id)}"${checked}${disabled} aria-label="Select ${esc5(r.display_name || "recipient")}">
                    <div class="flex-1 min-w-0">
                        <p class="em-attendee-name">${esc5(r.display_name || "Unknown")}</p>
                        <p class="em-attendee-sub">${esc5(r.phone_masked)}${r.email ? ` \xB7 ${esc5(r.email)}` : ""}</p>
                        <div class="flex flex-wrap gap-1 mt-1">
                            <span class="em-pill ${optOutClass(r)}">${esc5(optOutLabel(r))}</span>
                            <span class="em-pill">${esc5(SOURCE_LABELS[r.consent_source] || r.consent_source)}</span>
                            ${suppressed}
                            ${delivery}
                        </div>
                    </div>
                </div>`;
    }).join("") : '<p class="text-xs text-gray-400 italic py-3">No recipients match this filter.</p>';
    const historyRows = (data.messages || []).length ? data.messages.map((m) => {
      const dels = data.deliveriesByMessage?.[m.id] || [];
      const counts = dels.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {});
      const summary = Object.keys(counts).map((k) => `${k}: ${counts[k]}`).join(" \xB7 ") || "No deliveries";
      const expanded = UI.expandedMessageId === m.id;
      const preview = (m.body || "").length > 120 ? `${m.body.slice(0, 120)}\u2026` : m.body || "";
      const detail2 = expanded ? `<div class="mt-2 space-y-1">${dels.map((d) => {
        const name = data.recipients.find((r) => r.id === d.event_sms_recipient_id)?.display_name;
        return `<p class="text-xs text-gray-600">${esc5(name || maskPhone(d.phone_e164))} \xB7 ${esc5(d.status)}${d.error_message ? ` \u2014 ${esc5(d.error_message)}` : ""}</p>`;
      }).join("") || '<p class="text-xs text-gray-400">No per-recipient rows.</p>'}</div>` : "";
      return `
                <div class="em-card mb-2">
                    <button type="button" class="w-full text-left" data-toggle-message="${esc5(m.id)}">
                        <div class="flex justify-between gap-2">
                            <strong class="text-sm text-gray-900">${esc5(m.message_type)}</strong>
                            <span class="text-xs text-gray-400">${new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">${esc5(preview)}</p>
                        <p class="text-xs text-gray-400 mt-1">${m.recipient_count} recipients \xB7 ${esc5(summary)}</p>
                    </button>
                    ${detail2}
                </div>`;
    }).join("") : '<p class="text-xs text-gray-400 italic py-2">No messages sent for this event yet.</p>';
    return `
        <div class="em-card em-command-card mb-4" style="background:linear-gradient(135deg,#0f172a,#4338ca)">
            <p class="em-command-eyebrow">Notifications</p>
            <h3 class="em-command-title">Event SMS</h3>
            <p class="em-command-copy">Send manual updates to opted-in recipients. Phones are masked in this view.</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Recipients</span><strong>${metrics.total}</strong><small>All contacts</small></div>
            <div class="em-metric"><span>Opted in</span><strong>${metrics.optedIn}</strong><small>Eligible to send</small></div>
            <div class="em-metric"><span>Opted out</span><strong>${metrics.optedOut}</strong><small>Event preference</small></div>
            <div class="em-metric"><span>Global STOP</span><strong>${metrics.suppressed}</strong><small>Last sent: ${esc5(lastSentLabel)}</small></div>
        </div>

        <div class="em-card mb-4">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Compose SMS</h3>
                    <p class="em-section-sub">${selectedEligible.length} selected \xB7 only opted-in, non-suppressed recipients will receive messages.</p>
                </div>
            </div>
            <label class="text-xs text-gray-600 block mb-1">Message type</label>
            <select id="emNotifMessageType" class="em-input mb-2" aria-label="SMS message type">
                ${MESSAGE_TYPES.map((t) => {
      const sel = UI.messageType === t.value ? " selected" : "";
      return `<option value="${esc5(t.value)}"${sel}>${esc5(t.label)}</option>`;
    }).join("")}
            </select>
            <textarea id="emNotifBody" class="em-textarea" maxlength="1600" placeholder="Write your event update\u2026">${esc5(UI.prefillBody || "")}</textarea>
            <p class="text-xs text-gray-400 mt-1"><span id="emNotifCharCount">${(UI.prefillBody || "").length}</span> / 1600 characters</p>
            <div class="flex flex-wrap gap-2 mt-3">
                <button type="button" class="em-btn-primary" id="emNotifSendBtn"${selectedEligible.length ? "" : " disabled"}>Send SMS</button>
                <button type="button" class="em-btn-ghost" id="emNotifSelectOptedIn">Select all opted-in</button>
                <button type="button" class="em-btn-ghost" id="emNotifClearSelection">Clear selection</button>
            </div>
            <p id="emNotifSendResult" class="text-xs mt-2" style="min-height:1rem"></p>
        </div>

        <div class="em-card mb-4">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Recipients</h3>
                    <p class="em-section-sub">Filter and select who should receive the next message.</p>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 mb-3">
                ${["all", "opted_in", "opted_out", "guests", "members", "failed"].map((f) => {
      const label = { all: "All", opted_in: "Opted in", opted_out: "Opted out", guests: "Guests", members: "Members", failed: "Failed" }[f];
      const active = UI.filter === f ? "background:#eef2ff;color:#4338ca" : "background:#f3f4f6;color:#374151";
      return `<button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 10px;${active}" data-notif-filter="${f}">${label}</button>`;
    }).join("")}
            </div>
            <input type="search" id="emNotifSearch" class="em-input mb-3" placeholder="Search name, email, or last 4 of phone" value="${esc5(UI.search)}">
            <label class="text-xs text-gray-500 flex items-center gap-2 mb-2">
                <input type="checkbox" id="emNotifSelectVisible"> Select all visible
            </label>
            ${recipientRows}
        </div>

        <div class="em-card">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Message history</h3>
                    <p class="em-section-sub">Tap a message to expand delivery details.</p>
                </div>
            </div>
            ${historyRows}
        </div>
    `;
  }
  async function refreshNotificationsTab() {
    const STATE4 = api13().getState?.() || {};
    STATE4.tabData.notifications = await loadNotifications();
    api13().renderTab?.("notifications");
  }
  async function sendSelectedSms() {
    const STATE4 = api13().getState?.() || {};
    const data = STATE4.tabData?.notifications;
    if (!data) return;
    const body = document.getElementById("emNotifBody")?.value?.trim() || "";
    const resultEl = document.getElementById("emNotifSendResult");
    const selectedIds = [...UI.selected].filter((id) => {
      const row = data.recipients.find((r) => r.id === id);
      return row && isEligibleToSend(row);
    });
    if (!body) {
      if (resultEl) resultEl.textContent = "Enter a message before sending.";
      return;
    }
    if (!selectedIds.length) {
      if (resultEl) resultEl.textContent = "Select at least one opted-in recipient.";
      return;
    }
    const messageType = document.getElementById("emNotifMessageType")?.value || UI.messageType || "manual";
    const typeLabel = MESSAGE_TYPES.find((t) => t.value === messageType)?.label || messageType;
    const ok = confirm(`Send this ${typeLabel} SMS to ${selectedIds.length} recipient${selectedIds.length === 1 ? "" : "s"}?`);
    if (!ok) return;
    const btn = document.getElementById("emNotifSendBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending\u2026";
    }
    if (resultEl) resultEl.textContent = "";
    try {
      const res = await callEdgeFunction("send-event-sms", {
        event_id: STATE4.eventId,
        body,
        message_type: messageType,
        recipient_ids: selectedIds,
        select_all_opted_in: false,
        dry_run: false
      });
      const skipped = (res.skipped || 0) + (res.skipped_suppressed || 0) + (res.skipped_invalid || 0);
      if (resultEl) {
        resultEl.textContent = res.ok ? `Sent to ${res.sent || 0} recipient(s). Skipped: ${skipped}. Failed: ${res.failed || 0}.${res.dry_run ? " (dry run)" : ""}` : res.error || "Send failed.";
        resultEl.style.color = res.ok ? "#059669" : "#dc2626";
      }
      UI.selected.clear();
      UI.prefillBody = "";
      await refreshNotificationsTab();
    } catch (err) {
      if (resultEl) {
        resultEl.textContent = err.message || "Send failed.";
        resultEl.style.color = "#dc2626";
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Send SMS";
      }
    }
  }
  function wireNotifications() {
    const STATE4 = api13().getState?.() || {};
    const data = STATE4.tabData?.notifications;
    const root2 = document.getElementById("emSheetContent");
    if (!root2 || !data) return;
    root2.querySelectorAll("[data-notif-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        UI.filter = btn.dataset.notifFilter || "all";
        api13().renderTab?.("notifications");
      });
    });
    const search = document.getElementById("emNotifSearch");
    if (search) {
      search.addEventListener("input", () => {
        UI.search = search.value;
        api13().renderTab?.("notifications");
      });
    }
    const body = document.getElementById("emNotifBody");
    const charCount = document.getElementById("emNotifCharCount");
    if (body) {
      body.addEventListener("input", () => {
        UI.prefillBody = body.value;
        if (charCount) charCount.textContent = String(body.value.length);
      });
    }
    const typeSelect = document.getElementById("emNotifMessageType");
    if (typeSelect) {
      typeSelect.addEventListener("change", () => {
        UI.messageType = typeSelect.value || "manual";
      });
    }
    if (UI.selectAllOptedInOnLoad) {
      (data.recipients || []).forEach((r) => {
        if (isEligibleToSend(r)) UI.selected.add(r.id);
      });
      UI.selectAllOptedInOnLoad = false;
    }
    root2.querySelectorAll(".em-notif-check").forEach((cb) => {
      cb.addEventListener("change", () => {
        const id = cb.dataset.recipientId;
        if (!id || cb.disabled) return;
        if (cb.checked) UI.selected.add(id);
        else UI.selected.delete(id);
        api13().renderTab?.("notifications");
      });
    });
    document.getElementById("emNotifSelectVisible")?.addEventListener("change", (e) => {
      const visible = getFilteredRecipients(data);
      if (e.target.checked) {
        visible.forEach((r) => {
          if (isEligibleToSend(r)) UI.selected.add(r.id);
        });
      } else {
        visible.forEach((r) => UI.selected.delete(r.id));
      }
      api13().renderTab?.("notifications");
    });
    document.getElementById("emNotifSelectOptedIn")?.addEventListener("click", () => {
      (data.recipients || []).forEach((r) => {
        if (isEligibleToSend(r)) UI.selected.add(r.id);
      });
      api13().renderTab?.("notifications");
    });
    document.getElementById("emNotifClearSelection")?.addEventListener("click", () => {
      UI.selected.clear();
      api13().renderTab?.("notifications");
    });
    document.getElementById("emNotifSendBtn")?.addEventListener("click", () => sendSelectedSms());
    root2.querySelectorAll("[data-toggle-message]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.toggleMessage;
        UI.expandedMessageId = UI.expandedMessageId === id ? null : id;
        api13().renderTab?.("notifications");
      });
    });
  }
  function resetNotificationsUi(prefill = "") {
    UI.filter = "all";
    UI.search = "";
    UI.selected.clear();
    UI.expandedMessageId = null;
    if (prefill && typeof prefill === "object") {
      UI.prefillBody = prefill.body || "";
      UI.messageType = prefill.messageType || "manual";
      UI.selectAllOptedInOnLoad = !!prefill.selectAllOptedIn;
    } else {
      UI.prefillBody = prefill || "";
      UI.messageType = "manual";
      UI.selectAllOptedInOnLoad = false;
    }
  }
  async function sendSmsAllOptedIn(eventId2, body, messageType) {
    return callEdgeFunction("send-event-sms", {
      event_id: eventId2,
      body,
      message_type: messageType,
      recipient_ids: [],
      select_all_opted_in: true,
      dry_run: false
    });
  }
  var manageNotificationsApi = {
    loadNotifications,
    notificationsHtml,
    wireNotifications,
    resetNotificationsUi,
    refreshNotificationsTab,
    sendSmsAllOptedIn
  };
  globalThis.EventsManageNotifications = manageNotificationsApi;

  // js/portal/events/manage/money.js
  function api14() {
    return window.EventsManageMoneyApi || {};
  }
  function esc6(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function money2(cents) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format((cents || 0) / 100);
  }
  async function loadMoney() {
    const STATE4 = api14().getState?.() || {};
    const eventId2 = STATE4.eventId;
    const [rsvpsRes, guestRes, raffleRes, poolRes] = await Promise.all([
      supabaseClient.from("event_rsvps").select("id, user_id, status, amount_paid_cents, paid, refunded, refund_amount_cents, stripe_payment_intent_id, profiles!event_rsvps_user_id_fkey(first_name, last_name, profile_picture_url)").eq("event_id", eventId2),
      supabaseClient.from("event_guest_rsvps").select("id, guest_name, guest_email, status, paid, amount_paid_cents, stripe_payment_intent_id").eq("event_id", eventId2),
      supabaseClient.from("event_raffle_entries").select("id, paid, amount_paid_cents").eq("event_id", eventId2),
      supabaseClient.from("prize_pool_contributions").select("id, amount_cents").eq("event_id", eventId2)
    ]);
    return {
      rsvps: rsvpsRes.data || [],
      guests: guestRes.data || [],
      raffle: raffleRes.data || [],
      poolPays: poolRes.data || []
    };
  }
  function moneyHtml() {
    const STATE4 = api14().getState?.() || {};
    const d = STATE4.tabData.money;
    const isPaidEvent = STATE4.event?.pricing_mode === "paid" || Number(STATE4.event?.rsvp_cost_cents || 0) > 0;
    const paidRsvps = d.rsvps.filter((r) => r.paid);
    const paidGuests = d.guests.filter((g2) => g2.paid);
    const refundedRsvps = d.rsvps.filter((r) => r.refunded);
    const unpaidGoing = isPaidEvent ? STATE4.rsvps.filter((r) => r.status === "going" && !r.paid).length + STATE4.guestRsvps.filter((g2) => g2.status === "going" && !g2.paid).length : 0;
    const rsvpRevenue = paidRsvps.reduce((s, r) => s + (r.amount_paid_cents || 0), 0);
    const guestRevenue = paidGuests.reduce((s, g2) => s + (g2.amount_paid_cents || 0), 0);
    const raffleRevenue = d.raffle.filter((e) => e.paid).reduce((s, e) => s + (e.amount_paid_cents || 0), 0);
    const poolRevenue = d.poolPays.reduce((s, p) => s + (p.amount_cents || 0), 0);
    const refunded = refundedRsvps.reduce((s, r) => s + (r.refund_amount_cents || 0), 0);
    const grossRevenue = rsvpRevenue + guestRevenue + raffleRevenue + poolRevenue;
    const netRevenue = grossRevenue - refunded;
    const fmt = window.formatCurrency || money2;
    const ticketLabel = isPaidEvent ? "Paid RSVPs" : "Ticketed RSVPs";
    function paymentRow({ name, sub, amount, refundedAmount, stripeId, avatarHtml: avatarHtml2, isGuest }) {
      const refundPill = refundedAmount ? `<span class="em-pill em-pill-not">Refunded ${fmt(refundedAmount)}</span>` : `<span class="em-pill em-pill-paid">${amount > 0 ? `Paid ${fmt(amount)}` : "Ticketed"}</span>`;
      return `
            <div class="em-attendee-card">
                <div class="em-avatar"${isGuest ? ' style="background:#fef3c7;color:#92400e"' : ""}>${avatarHtml2}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc6(name)}</p>
                    <p class="em-attendee-sub">${esc6(sub)}</p>
                    <div class="flex flex-wrap gap-1 mt-2">${refundPill}${isGuest ? '<span class="em-pill em-pill-going">Guest</span>' : ""}</div>
                </div>
                ${stripeId ? `<a href="https://dashboard.stripe.com/payments/${encodeURIComponent(stripeId)}" target="_blank" rel="noopener" class="text-xs text-brand-600 font-semibold hover:underline whitespace-nowrap">Stripe \u2197</a>` : ""}
            </div>`;
    }
    const memberRows = paidRsvps.map((r) => {
      const p = r.profiles || {};
      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Member";
      const initials = ((p.first_name?.[0] || "") + (p.last_name?.[0] || "")).toUpperCase() || "?";
      const avatar = p.profile_picture_url ? `<img src="${esc6(p.profile_picture_url)}" alt="">` : `<span>${initials}</span>`;
      return paymentRow({ name, sub: "Member RSVP payment", amount: r.amount_paid_cents || 0, refundedAmount: r.refund_amount_cents || 0, stripeId: r.stripe_payment_intent_id, avatarHtml: avatar });
    });
    const guestRows = paidGuests.map((g2) => paymentRow({
      name: g2.guest_name || "Guest",
      sub: g2.guest_email || "Public guest payment",
      amount: g2.amount_paid_cents || 0,
      refundedAmount: 0,
      stripeId: g2.stripe_payment_intent_id,
      avatarHtml: `<span>${esc6((g2.guest_name || "G").slice(0, 1).toUpperCase())}</span>`,
      isGuest: true
    }));
    const paymentRows = [...memberRows, ...guestRows].join("") || `<p class="text-xs text-gray-400 italic py-2">No paid RSVPs yet.</p>`;
    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Money command</p>
            <h3 class="em-command-title">${fmt(netRevenue)} net collected</h3>
            <p class="em-command-copy">${grossRevenue ? `${fmt(grossRevenue)} gross across RSVP, guest, raffle, and prize-pool activity.` : isPaidEvent ? "No paid activity has landed yet." : "This free event has no RSVP revenue to collect."} ${unpaidGoing ? `${unpaidGoing} going attendee${unpaidGoing === 1 ? "" : "s"} still show unpaid.` : isPaidEvent ? "No unpaid going attendees are currently flagged." : "Ticketed attendees are tracked for access and check-in."}</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Gross</span><strong>${fmt(grossRevenue)}</strong><small>All sources</small></div>
            <div class="em-metric"><span>Net</span><strong>${fmt(netRevenue)}</strong><small>After refunds</small></div>
            <div class="em-metric"><span>Refunded</span><strong>${fmt(refunded)}</strong><small>${refundedRsvps.length} member RSVP${refundedRsvps.length === 1 ? "" : "s"}</small></div>
            <div class="em-metric"><span>${ticketLabel}</span><strong>${paidRsvps.length + paidGuests.length}</strong><small>${paidRsvps.length} member \xB7 ${paidGuests.length} guest</small></div>
        </div>

        <div class="em-money-layout">
            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">${isPaidEvent ? "Paid attendees" : "Ticketed attendees"} <span class="text-gray-400 font-normal">\xB7 ${paidRsvps.length + paidGuests.length}</span></h3><p class="em-section-sub">${isPaidEvent ? "Member and public guest RSVP payments." : "Members and public guests with issued event tickets."}</p></div></div>
                ${paymentRows}
            </div>

            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">Revenue sources</h3><p class="em-section-sub">Quick audit of how money entered this event.</p></div></div>
                <div class="em-money-row"><span>Member RSVP payments</span><strong>${fmt(rsvpRevenue)}</strong></div>
                <div class="em-money-row"><span>Guest RSVP payments</span><strong>${fmt(guestRevenue)}</strong></div>
                <div class="em-money-row"><span>Raffle entries</span><strong>${fmt(raffleRevenue)}</strong></div>
                <div class="em-money-row"><span>Prize-pool contributions</span><strong>${fmt(poolRevenue)}</strong></div>
                <div class="em-money-row"><span>Refunds recorded</span><strong>${fmt(refunded)}</strong></div>
                <p class="text-xs text-gray-400 mt-3">Refunds are still handled through Stripe/dashboard tooling. This panel keeps the host-facing audit trail together.</p>
            </div>
        </div>
    `;
  }
  function wireMoney() {
    const STATE4 = api14().getState?.() || {};
  }
  var manageMoneyApi = {
    loadMoney,
    moneyHtml,
    wireMoney
  };
  globalThis.EventsManageMoney = manageMoneyApi;

  // js/portal/events/manage/competition.js
  function api15() {
    return window.EventsManageCompetitionApi || {};
  }
  function esc7(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function money3(cents) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format((cents || 0) / 100);
  }
  async function loadComp() {
    const STATE4 = api15().getState?.() || {};
    const eventId2 = STATE4.eventId;
    const [phasesRes, entriesRes, votesRes, winnersRes, contribRes] = await Promise.all([
      supabaseClient.from("competition_phases").select("*").eq("event_id", eventId2).order("phase_num", { ascending: true }),
      supabaseClient.from("competition_entries").select("id, user_id, title, moderated, vote_count, profiles:user_id(first_name, last_name)").eq("event_id", eventId2),
      supabaseClient.from("competition_votes").select("id", { count: "exact", head: true }).eq("event_id", eventId2),
      supabaseClient.from("competition_winners").select("*, profiles:user_id(first_name, last_name), competition_entries!competition_winners_entry_id_fkey(title)").eq("event_id", eventId2).order("place", { ascending: true }),
      supabaseClient.from("prize_pool_contributions").select("amount_cents").eq("event_id", eventId2)
    ]);
    return {
      phases: phasesRes.data || [],
      entries: entriesRes.data || [],
      voteCount: votesRes.count || 0,
      winners: winnersRes.data || [],
      contribs: contribRes.data || []
    };
  }
  function compHtml() {
    const STATE4 = api15().getState?.() || {};
    const e = STATE4.event;
    if (e.event_type !== "competition") {
      return api15().emptyHtml?.("Not a competition", 'This is not a competition event. Set event type to "Competition" to use this tab.');
    }
    const d = STATE4.tabData.comp;
    const fmt = window.formatCurrency || money3;
    const cfg = e.competition_config || {};
    const liveEntries = d.entries.filter((x) => !x.moderated);
    const moderatedCount = d.entries.length - liveEntries.length;
    const poolTotal = (e.total_prize_pool_cents || 0) + d.contribs.reduce((s, c) => s + (c.amount_cents || 0), 0);
    const housePct = Number(cfg.house_pct || 0);
    const netPool = Math.round(poolTotal * (1 - housePct / 100));
    const activePhase = d.phases.find((ph) => ph.status === "active") || null;
    const entryTarget = Number(cfg.min_entries || 0);
    const entryPct = entryTarget ? Math.min(100, Math.round(liveEntries.length / entryTarget * 100)) : 100;
    const phaseStatusColor = { pending: "#9ca3af", active: "#4f46e5", completed: "#059669", extended: "#d97706", cancelled: "#dc2626" };
    const phaseRows = d.phases.length ? d.phases.map((ph) => {
      const color = phaseStatusColor[ph.status] || "#6b7280";
      const dates = ph.starts_at || ph.ends_at ? `${ph.starts_at ? new Date(ph.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "\u2014"} \u2192 ${ph.ends_at ? new Date(ph.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "\u2014"}` : "";
      return `
            <div class="em-attendee-card">
                <div class="em-avatar" style="background:${color}22;color:${color};font-weight:900">${ph.phase_num}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc7(ph.name || "Competition phase")}</p>
                    <p class="em-attendee-sub">${dates || "Dates not set"}</p>
                    <div class="flex flex-wrap gap-1 mt-2"><span class="em-pill em-pill-checked" style="background:${color}22;color:${color}">${esc7(ph.status || "pending")}</span>${ph.extended_once ? '<span class="em-pill em-pill-paid">Extended</span>' : ""}</div>
                </div>
            </div>
        `;
    }).join("") : `<p class="text-xs text-gray-400 italic py-2">No phases configured yet.</p>`;
    const winnerRows = d.winners.length ? d.winners.map((w) => {
      const p = w.profiles || {};
      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Member";
      const entry = w.competition_entries || {};
      const medal = ["\u{1F947}", "\u{1F948}", "\u{1F949}"][w.place - 1] || `#${w.place}`;
      const payoutBadge = {
        pending: '<span class="em-pill em-pill-paid">Pending</span>',
        processing: '<span class="em-pill em-pill-paid">Processing</span>',
        paid: '<span class="em-pill em-pill-going">Paid</span>',
        failed: '<span class="em-pill em-pill-not">Failed</span>'
      }[w.payout_status] || "";
      return `
            <div class="em-attendee-card">
                <div class="em-avatar" style="background:#fef3c7;color:#92400e;font-size:18px">${medal}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc7(name)}</p>
                    <p class="em-attendee-sub">${esc7(entry.title || "Winning entry")} \xB7 ${fmt(w.prize_amount_cents)}${w.needs_1099 ? " \xB7 1099 needed" : ""}</p>
                    <div class="flex flex-wrap gap-1 mt-2">${payoutBadge}</div>
                </div>
            </div>
        `;
    }).join("") : `<p class="text-xs text-gray-400 italic py-2">No winners finalized yet.</p>`;
    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Competition command</p>
            <h3 class="em-command-title">${activePhase ? `Phase ${activePhase.phase_num}: ${esc7(activePhase.name || "Active")}` : "Competition setup"}</h3>
            <p class="em-command-copy">${liveEntries.length} live entr${liveEntries.length === 1 ? "y" : "ies"}${entryTarget ? ` toward ${entryTarget} minimum` : ""}. ${d.voteCount} vote${d.voteCount === 1 ? "" : "s"} recorded with ${fmt(netPool)} net payout available.</p>
            <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${entryPct}%;background:#a78bfa"></span></div>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Entries</span><strong>${liveEntries.length}</strong><small>${entryTarget ? `${entryPct}% of minimum` : "No minimum set"}</small></div>
            <div class="em-metric"><span>Votes</span><strong>${d.voteCount}</strong><small>Submitted votes</small></div>
            <div class="em-metric"><span>Pool</span><strong>${fmt(poolTotal)}</strong><small>Gross prize pool</small></div>
            <div class="em-metric"><span>Net payout</span><strong>${fmt(netPool)}</strong><small>${housePct}% house cut</small></div>
        </div>

        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Phases <span class="text-gray-400 font-normal">\xB7 ${d.phases.length}</span></h3><p class="em-section-sub">Timeline and moderation state for the competition.</p></div></div>
            ${phaseRows}
        </div>

        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Configuration</h3><p class="em-section-sub">Rules currently driving entries, voting, and payouts.</p></div></div>
            <div class="em-money-row"><span>Entry type</span><strong>${esc7(cfg.entry_type || "any")}</strong></div>
            <div class="em-money-row"><span>Entry fee</span><strong>${cfg.entry_fee_cents ? fmt(cfg.entry_fee_cents) : "Free"}</strong></div>
            <div class="em-money-row"><span>House cut</span><strong>${housePct}%</strong></div>
            <div class="em-money-row"><span>Voter eligibility</span><strong>${esc7(cfg.voter_eligibility || "all_members")}</strong></div>
            ${moderatedCount ? `<div class="em-money-row"><span>Moderated entries</span><strong style="color:#dc2626">${moderatedCount}</strong></div>` : ""}
        </div>

        <div class="em-card">
            <div class="em-section-head"><div><h3 class="em-section-title">Winners <span class="text-gray-400 font-normal">\xB7 ${d.winners.length}</span></h3><p class="em-section-sub">Final results and payout status.</p></div></div>
            ${winnerRows}
            <p class="text-xs text-gray-400 mt-3">Phase advancement and winner finalization happen on the portal detail page. Per-tab controls land in M4.</p>
        </div>
    `;
  }
  function wireComp() {
    const STATE4 = api15().getState?.() || {};
  }
  var manageCompetitionApi = {
    loadComp,
    compHtml,
    wireComp
  };
  globalThis.EventsManageCompetition = manageCompetitionApi;

  // js/portal/events/manage/participation.js
  function api16() {
    return window.EventsManageParticipationApi || {};
  }
  async function getParticipationResetCounts() {
    const STATE4 = api16().getState?.() || {};
    const eventId2 = STATE4.eventId;
    const tables = [
      ["member RSVPs", "event_rsvps"],
      ["guest RSVPs", "event_guest_rsvps"],
      ["check-ins", "event_checkins"],
      ["raffle entries", "event_raffle_entries"],
      ["raffle winners", "event_raffle_winners"]
    ];
    const results = await Promise.all(tables.map(async ([label, table]) => {
      const { count, error } = await supabaseClient.from(table).select("id", { count: "exact", head: true }).eq("event_id", eventId2);
      if (error) throw error;
      return { label, table, count: count || 0 };
    }));
    return results;
  }
  async function resetParticipation() {
    const STATE4 = api16().getState?.() || {};
    const e = STATE4.event;
    if (!e) return;
    let counts = [];
    try {
      counts = await getParticipationResetCounts();
    } catch (err) {
      alert("Could not load participation counts: " + (err.message || "unknown error"));
      return;
    }
    const paidTickets = STATE4.rsvps.filter((r) => r.paid).length + STATE4.guestRsvps.filter((r) => r.paid).length;
    const summary = counts.map((item) => `${item.count} ${item.label}`).join("\n");
    const typed = prompt(
      `Reset participation for "${e.title}"?

This will delete:
${summary}

The event itself, images, links, pricing, and settings stay in place. Stripe payments are NOT refunded${paidTickets ? ` (${paidTickets} paid RSVP record${paidTickets === 1 ? "" : "s"} found)` : ""}.

Type RESET to continue.`
    );
    if (!typed || typed.trim().toUpperCase() !== "RESET") {
      if (typed !== null) alert("Reset cancelled.");
      return;
    }
    try {
      await callEdgeFunction("manage-event-participation", {
        action: "reset_participation",
        event_id: e.id
      });
      await api16().refreshEventManager?.("danger");
      alert("Participation reset complete. The event is still intact.");
    } catch (err) {
      alert("Reset failed: " + (err.message || "unknown error"));
    }
  }
  async function removeParticipationPerson(btn) {
    const STATE4 = api16().getState?.() || {};
    const kind = btn.dataset.removeRsvp;
    const name = btn.dataset.name || (kind === "guest" ? "this guest" : "this member");
    const isPaid = btn.dataset.paid === "1";
    const warning = isPaid ? "\n\nThis was marked paid. Removing the record does not refund Stripe payments." : "";
    if (!confirm(`Remove ${name} from this event? This also clears their check-in and raffle entry.${warning}`)) return;
    btn.disabled = true;
    btn.textContent = "Removing...";
    try {
      if (kind === "guest") {
        const guestToken = btn.dataset.guestToken;
        const rsvpId = btn.dataset.rsvpId;
        if (!guestToken || !rsvpId) throw new Error("Missing guest RSVP details.");
        await callEdgeFunction("manage-event-participation", {
          action: "remove_rsvp",
          event_id: STATE4.eventId,
          kind: "guest",
          guest_token: guestToken,
          rsvp_id: rsvpId
        });
      } else {
        const userId = btn.dataset.userId;
        if (!userId) throw new Error("Missing member RSVP details.");
        await callEdgeFunction("manage-event-participation", {
          action: "remove_rsvp",
          event_id: STATE4.eventId,
          kind: "member",
          user_id: userId
        });
      }
      await api16().refreshEventManager?.("rsvps");
    } catch (err) {
      alert("Remove failed: " + (err.message || "unknown error"));
      api16().renderTab?.("rsvps");
    }
  }
  var manageParticipationApi = {
    getParticipationResetCounts,
    resetParticipation,
    removeParticipationPerson
  };
  globalThis.EventsManageParticipation = manageParticipationApi;

  // js/portal/events/manage/raffle.js
  function api17() {
    return window.EventsManageRaffleApi || {};
  }
  function esc8(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function money4(cents) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format((cents || 0) / 100);
  }
  var prizeImageFiles = {};
  var prizeImagePreviews = {};
  function safeFilename2(value) {
    return String(value || "event").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "event";
  }
  async function loadRaffle() {
    const STATE4 = api17().getState?.() || {};
    const eventId2 = STATE4.eventId;
    const [entriesRes, winnersRes, guestsRes] = await Promise.all([
      supabaseClient.from("event_raffle_entries").select("id, user_id, guest_token, paid, amount_paid_cents, profiles:user_id(first_name, last_name, profile_picture_url)").eq("event_id", eventId2),
      supabaseClient.from("event_raffle_winners").select("*, profiles:user_id(first_name, last_name, profile_picture_url)").eq("event_id", eventId2).order("place", { ascending: true }),
      supabaseClient.from("event_guest_rsvps").select("guest_token, guest_name, guest_email").eq("event_id", eventId2)
    ]);
    return {
      entries: entriesRes.data || [],
      winners: winnersRes.data || [],
      guests: guestsRes.data || []
    };
  }
  function ord(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function raffleHtml2() {
    const STATE4 = api17().getState?.() || {};
    const e = STATE4.event;
    if (!e.raffle_enabled) {
      return api17().emptyHtml?.("Raffle not enabled", "Enable the raffle on the portal detail page (Edit event \u2192 Raffle).");
    }
    const d = STATE4.tabData.raffle;
    const fmt = window.formatCurrency || money4;
    const guestByToken = new Map((d.guests || []).map((g2) => [g2.guest_token, g2]));
    const eligibleEntries = d.entries.filter((en) => en.paid || !e.raffle_entry_cost_cents);
    const memberEntries = eligibleEntries.filter((en) => en.user_id);
    const guestEntries = eligibleEntries.filter((en) => en.guest_token);
    const config = raffleConfig(e);
    const categories = raffleCategories(config);
    const drawQueue = raffleDrawQueue(config, d.winners);
    const winnersDrawn = d.winners.length;
    const totalPrizes = raffleTotalWinners(config) || e.raffle_winner_count || winnersDrawn;
    const remainingDraws = Math.max(0, totalPrizes - winnersDrawn);
    const allDrawn = totalPrizes > 0 && winnersDrawn >= totalPrizes;
    const canDraw = typeof globalThis.evtOpenRaffleDraw === "function" && eligibleEntries.length > 0 && !allDrawn;
    const drawPct = totalPrizes ? Math.round(winnersDrawn / totalPrizes * 100) : 0;
    const raffleEntryPriceDollars = (Number(e.raffle_entry_cost_cents || 0) / 100).toFixed(2);
    const paidEventRaffleIncluded = e.pricing_mode === "paid";
    const prizeSetupHtml = rafflePrizeSetupHtml(config, d.winners);
    const winnerRows = d.winners.length ? d.winners.map((w) => {
      const p = w.profiles || {};
      const guest = w.guest_token ? guestByToken.get(w.guest_token) : null;
      const name = w.user_id ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Member" : guest?.guest_name || `Guest \xB7 ${(w.guest_token || "").slice(0, 8)}`;
      const medal = ["\u{1F947}", "\u{1F948}", "\u{1F949}"][w.place - 1] || `#${w.place}`;
      const choiceHtml = winnerChoiceHtml(w, config, d.winners);
      return `
            <div class="em-attendee-card">
                <div class="em-avatar" style="background:#faf5ff;color:#7c3aed;font-size:18px">${medal}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc8(name)}</p>
                    <p class="em-attendee-sub">${ord(w.place)} place \xB7 ${esc8(w.prize_description || "Prize pending")}</p>
                    <div class="flex flex-wrap gap-1 mt-2">
                        <span class="em-pill em-pill-checked">${w.user_id ? "Member" : "Guest"}</span>
                        ${w.selection_status === "pending_choice" ? '<span class="em-pill em-pill-paid">Needs prize choice</span>' : '<span class="em-pill em-pill-going">Prize assigned</span>'}
                    </div>
                    ${choiceHtml}
                </div>
            </div>
        `;
    }).join("") : `<p class="text-xs text-gray-400 italic py-2">No winners drawn yet.</p>`;
    const entryRevenue = eligibleEntries.reduce((s, en) => s + (en.amount_paid_cents || 0), 0);
    const categoryHtml = categories.length ? categories.map((cat) => {
      const items = raffleItems(config, cat.id);
      const pendingSlots = drawQueue.filter((slot) => slot.category_id === cat.id).length;
      const drawnCount = Math.max(0, (cat.winner_count || 0) - pendingSlots);
      const itemPreview = items.length ? items.slice(0, 3).map((item) => `${item.emoji || "\u{1F381}"} ${esc8(item.name)}${item.quantity > 1 ? ` \xD7${item.quantity}` : ""}`).join(", ") : "Prize details pending";
      const extraItems = Math.max(0, items.length - 3);
      return `
            <div class="em-card em-op-card">
                <div class="em-op-head">
                    <div class="min-w-0"><p class="em-op-kicker">Prize group</p><p class="em-op-title">${esc8(cat.label || "Prize category")}</p></div>
                    <span class="em-op-icon">\u{1F381}</span>
                </div>
                <p class="em-op-copy">${drawModeLabel(cat.draw_mode)} \xB7 ${drawnCount}/${cat.winner_count || 0} drawn</p>
                <div class="em-op-progress"><span style="width:${cat.winner_count ? Math.round(drawnCount / cat.winner_count * 100) : 0}%"></span></div>
                <p class="em-op-copy">${itemPreview}${extraItems ? `, +${extraItems} more` : ""}</p>
                <div class="em-op-meta"><span class="em-op-chip">${pendingSlots} left</span><span class="em-op-chip">${items.length} item${items.length === 1 ? "" : "s"}</span></div>
            </div>
        `;
    }).join("") : "";
    const nextSlot = drawQueue[0] || null;
    const nextDrawHtml = !allDrawn ? `
        <div class="em-card mb-4" style="border-color:#ddd6fe;background:#faf5ff">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Next draw</h3>
                    <p class="em-section-sub" style="color:#6d28d9">${nextSlot ? esc8(prizeSlotLabel(nextSlot)) : "Next available prize"}${nextSlot?.category_label ? ` \xB7 ${esc8(nextSlot.category_label)}` : ""}</p>
                </div>
                <span class="em-pill em-pill-paid">${remainingDraws} remaining</span>
            </div>
            ${canDraw ? `<button id="emRaffleDrawBtn" type="button" class="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition">Draw next winner</button>` : `<p class="text-xs text-gray-500">${eligibleEntries.length ? "Draw controls are unavailable on this page." : "No valid raffle entries yet."}</p>`}
        </div>
    ` : "";
    const entryRows = eligibleEntries.length ? eligibleEntries.map((en) => {
      const p = en.profiles || {};
      const guest = en.guest_token ? guestByToken.get(en.guest_token) : null;
      const name = en.user_id ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Member" : guest?.guest_name || "Guest";
      const sub = en.user_id ? "Member raffle entry" : guest?.guest_email || "Guest raffle entry";
      const tokenAttr = en.guest_token ? ` data-guest-token="${esc8(en.guest_token)}"` : "";
      const userAttr = en.user_id ? ` data-user-id="${esc8(en.user_id)}"` : "";
      return `<div class="em-attendee-card"><div class="em-avatar" style="background:#f5f3ff;color:#6d28d9"><span>\u{1F39F}</span></div><div class="em-attendee-main"><p class="em-attendee-name">${esc8(name)}</p><p class="em-attendee-sub">${esc8(sub)}</p><div class="flex flex-wrap gap-1 mt-2"><span class="em-pill em-pill-checked">${en.user_id ? "Member" : "Guest"}</span>${en.paid ? '<span class="em-pill em-pill-paid">Paid</span>' : ""}</div></div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-raffle-entry="${esc8(en.id)}"${userAttr}${tokenAttr} data-paid="${en.paid ? "1" : "0"}" data-name="${esc8(name)}">Remove</button></div>`;
    }).join("") : `<p class="text-xs text-gray-400 italic py-2">No eligible entries yet.</p>`;
    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Raffle command</p>
            <h3 class="em-command-title">${allDrawn ? "All winners drawn" : `${remainingDraws} draw${remainingDraws === 1 ? "" : "s"} remaining`}</h3>
            <p class="em-command-copy">${eligibleEntries.length ? `${eligibleEntries.length} eligible entr${eligibleEntries.length === 1 ? "y" : "ies"} across ${memberEntries.length} member and ${guestEntries.length} guest entries.` : "No eligible raffle entries yet."} ${nextSlot ? `Next up: ${esc8(prizeSlotLabel(nextSlot))}.` : ""}</p>
            <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${drawPct}%;background:#a78bfa"></span></div>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Eligible entries</span><strong>${eligibleEntries.length}</strong><small>${memberEntries.length} member \xB7 ${guestEntries.length} guest</small></div>
            <div class="em-metric"><span>Revenue</span><strong>${fmt(entryRevenue)}</strong><small>${e.raffle_entry_cost_cents ? "Paid entries" : "Free raffle"}</small></div>
            <div class="em-metric"><span>Prizes</span><strong>${totalPrizes || "\u2014"}</strong><small>${categories.length} group${categories.length === 1 ? "" : "s"}</small></div>
            <div class="em-metric"><span>Drawn</span><strong>${winnersDrawn}</strong><small>${drawPct}% complete</small></div>
        </div>

        ${nextDrawHtml}

        <div class="em-money-layout">
            <div>
                ${categories.length ? `<div class="em-op-grid" style="grid-template-columns:1fr;margin-bottom:12px">${categoryHtml}</div>` : ""}
                <div class="em-card">
                    <div class="em-section-head"><div><h3 class="em-section-title">Winners <span class="text-gray-400 font-normal">\xB7 ${winnersDrawn}${totalPrizes ? "/" + totalPrizes : ""}</span></h3><p class="em-section-sub">Draw results and pending prize choices.</p></div></div>
                    ${winnerRows}
                    ${allDrawn ? `<p class="text-xs text-emerald-600 font-semibold mt-3">All winners drawn \u2713</p>` : `<p class="text-xs text-gray-400 mt-3">Draws follow category sort order, starting with the smallest/lower-sort categories.</p>`}
                </div>
            </div>

            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">Configuration</h3><p class="em-section-sub">Rules currently driving the draw.</p></div></div>
                <div class="em-money-row"><span>Type</span><strong>${esc8(e.raffle_type || "digital")}</strong></div>
                <div class="em-money-row"><span>Draw trigger</span><strong>${esc8(e.raffle_draw_trigger || "manual")}</strong></div>
                <div class="em-money-row"><span>Entry cost</span><strong>${e.raffle_entry_cost_cents ? fmt(e.raffle_entry_cost_cents) : "Free"}</strong></div>
                <div style="margin:12px 0;padding:12px;border:1px solid #eef2ff;border-radius:12px;background:#f8fafc">
                    <label for="emRaffleEntryPrice" style="display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Raffle entry price</label>
                    <div style="display:flex;gap:8px;align-items:center">
                        <span style="font-size:13px;font-weight:800;color:#475569">$</span>
                        <input id="emRaffleEntryPrice" class="em-input" type="number" min="0" max="500" step="0.01" value="${esc8(raffleEntryPriceDollars)}" ${paidEventRaffleIncluded ? "disabled" : ""} style="flex:1;min-width:0">
                        <button id="emRafflePriceSave" type="button" class="em-btn-primary" ${paidEventRaffleIncluded ? "disabled" : ""}>Save</button>
                    </div>
                    <p id="emRafflePriceStatus" class="text-xs text-gray-400 mt-2">${paidEventRaffleIncluded ? "Paid RSVP events include raffle entry with the RSVP, so separate raffle pricing is not used." : "Set 0 for a free raffle. Changes apply to future raffle checkouts only."}</p>
                </div>
                <div class="em-money-row"><span>Member entries</span><strong>${memberEntries.length}</strong></div>
                <div class="em-money-row"><span>Guest entries</span><strong>${guestEntries.length}</strong></div>
            </div>

            ${prizeSetupHtml}

            <div class="em-card mt-3">
                <div class="em-section-head"><div><h3 class="em-section-title">Entries <span class="text-gray-400 font-normal">\xB7 ${eligibleEntries.length}</span></h3><p class="em-section-sub">Remove accidental or test raffle entries without deleting the event.</p></div></div>
                ${entryRows}
            </div>
        </div>
    `;
  }
  function wireRaffle() {
    const STATE4 = api17().getState?.() || {};
    const drawBtn = document.getElementById("emRaffleDrawBtn");
    if (drawBtn) {
      drawBtn.onclick = () => window.evtOpenRaffleDraw?.(STATE4.eventId, STATE4.event);
    }
    document.getElementById("emSheetContent")?.querySelectorAll("[data-raffle-assign-choice]").forEach((btn) => {
      btn.onclick = () => assignWinnerChoice(btn.dataset.winnerId);
    });
    document.getElementById("emSheetContent")?.querySelectorAll("[data-remove-raffle-entry]").forEach((btn) => {
      btn.onclick = () => removeRaffleEntry(btn);
    });
    document.getElementById("emRafflePriceSave")?.addEventListener("click", saveRaffleEntryPrice);
    document.getElementById("emRafflePrizeSave")?.addEventListener("click", () => saveRafflePrizeSetup());
    document.querySelector("[data-em-raffle-add-category]")?.addEventListener("click", () => saveRafflePrizeSetup({ addCategory: true }));
    document.querySelector("[data-em-raffle-add-item]")?.addEventListener("click", () => saveRafflePrizeSetup({ addItem: true }));
    document.querySelectorAll("[data-em-raffle-remove-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const label = btn.dataset.categoryLabel || "this category";
        if (confirm(`Remove ${label}? Prize items in this category will move to the first remaining category.`)) {
          saveRafflePrizeSetup({ removeCategoryId: btn.dataset.emRaffleRemoveCategory });
        }
      });
    });
    document.querySelectorAll("[data-em-raffle-remove-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const label = btn.dataset.itemLabel || "this prize";
        if (confirm(`Remove ${label} from the raffle prize setup? Existing drawn winner records are not deleted.`)) {
          saveRafflePrizeSetup({ removeItemId: btn.dataset.emRaffleRemoveItem });
        }
      });
    });
    wireRafflePrizeImages();
  }
  function rafflePrizeSetupHtml(config, winners = []) {
    const STATE4 = api17().getState?.() || {};
    const model = window.EventsRaffleModel;
    if (!model) {
      return `<div class="em-card mt-3"><div class="em-section-head"><div><h3 class="em-section-title">Prize setup</h3><p class="em-section-sub">Raffle editor unavailable because the raffle model helper did not load.</p></div></div></div>`;
    }
    const normalized = model.normalizeConfig(config || []);
    const categories = model.getOrderedCategories(normalized);
    const items = normalized.items || [];
    const validation = model.validateConfig(normalized);
    const categoryOptions = categories.map((category) => `<option value="${esc8(category.id)}">${esc8(category.label)}</option>`).join("");
    const usedPrizeIds = new Set((winners || []).map((winner) => winner.prize_id).filter(Boolean));
    const drawModeOptions = (selected) => [
      ["specific_item", "Specific items"],
      ["random_item", "Random item in category"],
      ["winner_choice", "Winner chooses later"]
    ].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
    const categoryRows = categories.length ? categories.map((category, index) => `
        <div class="em-raffle-edit-row" data-em-raffle-category-row="${esc8(category.id)}" data-sort-order="${(index + 1) * 10}">
            <div>
                <label class="em-raffle-edit-label">Category</label>
                <input class="em-input" data-em-raffle-category-field="label" value="${esc8(category.label)}" maxlength="80">
            </div>
            <div>
                <label class="em-raffle-edit-label">Draw mode</label>
                <select class="em-input" data-em-raffle-category-field="draw_mode">${drawModeOptions(category.draw_mode)}</select>
            </div>
            <div>
                <label class="em-raffle-edit-label">Winners</label>
                <input class="em-input" type="number" min="0" step="1" data-em-raffle-category-field="winner_count" value="${category.winner_count ?? ""}">
            </div>
            <button type="button" class="em-btn-ghost" data-em-raffle-remove-category="${esc8(category.id)}" data-category-label="${esc8(category.label)}" ${categories.length <= 1 ? "disabled" : ""}>Remove</button>
        </div>
    `).join("") : `<p class="text-xs text-gray-400 italic py-2">No prize categories yet.</p>`;
    const itemRows = items.length ? items.map((item, index) => {
      const previewUrl = prizeImagePreviews[item.id] || item.image_url || "";
      const pendingName = prizeImageFiles[item.id]?.name || "";
      return `
        <div class="em-raffle-item-wrap" data-em-raffle-item-row="${esc8(item.id)}" data-sort-order="${(index + 1) * 10}" data-image-url="${esc8(item.image_url || "")}">
            <div class="em-raffle-edit-row em-raffle-item-row">
                <div>
                    <label class="em-raffle-edit-label">Emoji</label>
                    <input class="em-input" data-em-raffle-item-field="emoji" value="${esc8(item.emoji || "\u{1F381}")}" maxlength="4">
                </div>
                <div>
                    <label class="em-raffle-edit-label">Prize</label>
                    <input class="em-input" data-em-raffle-item-field="name" value="${esc8(item.name)}" maxlength="120">
                </div>
                <div>
                    <label class="em-raffle-edit-label">Category</label>
                    <select class="em-input" data-em-raffle-item-field="category_id">
                        ${categories.map((category) => `<option value="${esc8(category.id)}" ${item.category_id === category.id ? "selected" : ""}>${esc8(category.label)}</option>`).join("")}
                    </select>
                </div>
                <div>
                    <label class="em-raffle-edit-label">Qty</label>
                    <input class="em-input" type="number" min="1" step="1" data-em-raffle-item-field="quantity" value="${item.quantity || 1}">
                </div>
                <button type="button" class="em-btn-ghost" data-em-raffle-remove-item="${esc8(item.id)}" data-item-label="${esc8(item.name)}" ${usedPrizeIds.has(item.id) ? 'disabled title="Already assigned to a winner"' : ""}>Remove</button>
            </div>
            <div class="em-prize-img-row">
                <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-em-prize-file="${esc8(item.id)}">
                <div class="em-prize-img-drop" data-em-prize-drop="${esc8(item.id)}" title="Click or drag an image here">
                    ${previewUrl ? `<img src="${esc8(previewUrl)}" alt="Prize image">` : "<span>\u{1F4F7}</span>"}
                </div>
                <div class="em-prize-img-copy" data-em-prize-copy="${esc8(item.id)}">
                    <strong>${pendingName ? esc8(pendingName) : previewUrl ? "Image set" : "Prize image"}</strong>
                    <span>${previewUrl ? "Click or drop to replace. Save prize setup to keep changes." : "Click or drag a PNG, JPG, or WebP image here."}</span>
                </div>
                ${previewUrl ? `<button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-em-prize-clear="${esc8(item.id)}">Remove image</button>` : ""}
            </div>
        </div>
    `;
    }).join("") : `<p class="text-xs text-gray-400 italic py-2">No prize items yet. Add a prize before drawing winners.</p>`;
    return `
        <div class="em-card mt-3">
            <style>
                .em-raffle-edit-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 88px auto; gap:8px; align-items:end; padding:10px 0; border-top:1px solid #f1f5f9; }
                .em-raffle-edit-row:first-of-type { border-top:0; padding-top:0; }
                .em-raffle-item-wrap { padding:10px 0; border-top:1px solid #f1f5f9; }
                .em-raffle-item-wrap:first-of-type { border-top:0; padding-top:0; }
                .em-raffle-item-wrap .em-raffle-edit-row { border-top:0; padding:0; }
                .em-raffle-item-row { grid-template-columns:62px minmax(0,1.2fr) minmax(0,.9fr) 70px auto; }
                .em-raffle-edit-label { display:block; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8; margin-bottom:5px; }
                .em-prize-img-row { margin-top:10px; display:flex; align-items:center; gap:9px; }
                .em-prize-img-drop { width:72px; height:72px; border:2px dashed #d1d5db; border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; color:#9ca3af; background:#fff; flex-shrink:0; }
                .em-prize-img-drop:hover, .em-prize-img-drop.em-drag-over { border-color:#818cf8; background:#f5f3ff; color:#4f46e5; }
                .em-prize-img-drop img { width:100%; height:100%; object-fit:cover; display:block; }
                .em-prize-img-drop span { font-size:19px; }
                .em-prize-img-copy { flex:1; min-width:0; font-size:11px; color:#6b7280; line-height:1.35; }
                .em-prize-img-copy strong { display:block; color:#374151; font-size:12px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                @media(max-width:700px){ .em-raffle-edit-row, .em-raffle-item-row { grid-template-columns:1fr; } }
                @media(max-width:520px){ .em-prize-img-row { align-items:flex-start; flex-wrap:wrap; } .em-prize-img-copy { flex-basis:calc(100% - 82px); } }
            </style>
            <div class="em-section-head">
                <div><h3 class="em-section-title">Prize setup</h3><p class="em-section-sub">Add, edit, or remove raffle prizes after event creation. Existing drawn winners stay in the winner history.</p></div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0">
                <p class="em-raffle-edit-label" style="margin:0">Categories</p>
                <button type="button" class="em-btn-ghost" data-em-raffle-add-category>Add category</button>
            </div>
            ${categoryRows}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 8px;border-top:1px solid #f1f5f9;padding-top:12px">
                <p class="em-raffle-edit-label" style="margin:0">Prize items</p>
                <button type="button" class="em-btn-ghost" data-em-raffle-add-item>Add prize</button>
            </div>
            ${itemRows}
            ${validation.valid ? "" : `<div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">${validation.errors.map(esc8).join("<br>")}</div>`}
            <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
                <button type="button" id="emRafflePrizeSave" class="em-btn-primary">Save prize setup</button>
                <span id="emRafflePrizeStatus" class="text-xs text-gray-400">${categories.length} categor${categories.length === 1 ? "y" : "ies"} \xB7 ${items.length} item${items.length === 1 ? "" : "s"}</span>
            </div>
        </div>
    `;
  }
  function collectRafflePrizeConfigFromDom() {
    const STATE4 = api17().getState?.() || {};
    const model = window.EventsRaffleModel;
    if (!model) throw new Error("Raffle model helper is not loaded.");
    const categoryRows = Array.from(document.querySelectorAll("[data-em-raffle-category-row]"));
    const itemRows = Array.from(document.querySelectorAll("[data-em-raffle-item-row]"));
    if (!categoryRows.length && !itemRows.length) return model.normalizeConfig(STATE4.event?.raffle_prizes || []);
    const categories = categoryRows.map((row, index) => {
      const field = (name) => row.querySelector(`[data-em-raffle-category-field="${name}"]`)?.value;
      return model.createCategory({
        id: row.dataset.emRaffleCategoryRow,
        label: field("label") || "Prize Tier",
        draw_mode: field("draw_mode") || "specific_item",
        winner_count: Math.max(0, Math.floor(Number(field("winner_count")) || 0)),
        sort_order: (index + 1) * 10
      });
    });
    const fallbackCategory = categories[0]?.id || "general";
    const categoryIds = new Set(categories.map((category) => category.id));
    const items = itemRows.map((row, index) => {
      const field = (name) => row.querySelector(`[data-em-raffle-item-field="${name}"]`)?.value;
      const categoryId = categoryIds.has(field("category_id")) ? field("category_id") : fallbackCategory;
      return model.createItem({
        id: row.dataset.emRaffleItemRow,
        emoji: field("emoji") || model.DEFAULT_EMOJI || "\u{1F381}",
        name: field("name") || "Prize item",
        category_id: categoryId,
        quantity: Math.max(1, Math.floor(Number(field("quantity")) || 1)),
        image_url: row.dataset.imageUrl || null,
        sort_order: (index + 1) * 10
      });
    });
    return model.normalizeConfig({ version: 2, categories, items });
  }
  function wireRafflePrizeImages() {
    const STATE4 = api17().getState?.() || {};
    document.querySelectorAll("[data-em-prize-drop]").forEach((zone) => {
      const itemId = zone.dataset.emPrizeDrop;
      const fileInput = document.querySelector(`[data-em-prize-file="${CSS.escape(itemId)}"]`);
      if (!itemId || !fileInput) return;
      zone.addEventListener("click", () => fileInput.click());
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("em-drag-over");
      });
      zone.addEventListener("dragleave", (event) => {
        if (!zone.contains(event.relatedTarget)) zone.classList.remove("em-drag-over");
      });
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("em-drag-over");
        const file = event.dataTransfer?.files?.[0];
        if (file) setRafflePrizeImage(itemId, file);
      });
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (file) setRafflePrizeImage(itemId, file);
      });
    });
    document.querySelectorAll("[data-em-prize-clear]").forEach((btn) => {
      btn.addEventListener("click", () => clearRafflePrizeImage(btn.dataset.emPrizeClear));
    });
  }
  function setRafflePrizeImage(itemId, file) {
    const STATE4 = api17().getState?.() || {};
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      alert("Please use a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }
    prizeImageFiles[itemId] = file;
    const reader = new FileReader();
    reader.onload = () => {
      prizeImagePreviews[itemId] = reader.result;
      const zone = document.querySelector(`[data-em-prize-drop="${CSS.escape(itemId)}"]`);
      if (zone) zone.innerHTML = `<img src="${esc8(reader.result)}" alt="Prize image">`;
      const copy = document.querySelector(`[data-em-prize-copy="${CSS.escape(itemId)}"]`);
      if (copy) copy.innerHTML = `<strong>${esc8(file.name)}</strong><span>Ready to upload. Save prize setup to keep this image.</span>`;
      const status = document.getElementById("emRafflePrizeStatus");
      if (status) status.textContent = "Image selected. Save prize setup to upload it.";
    };
    reader.readAsDataURL(file);
  }
  function clearRafflePrizeImage(itemId) {
    const STATE4 = api17().getState?.() || {};
    if (!itemId) return;
    delete prizeImageFiles[itemId];
    delete prizeImagePreviews[itemId];
    const row = document.querySelector(`[data-em-raffle-item-row="${CSS.escape(itemId)}"]`);
    if (row) row.dataset.imageUrl = "";
    const zone = document.querySelector(`[data-em-prize-drop="${CSS.escape(itemId)}"]`);
    if (zone) zone.innerHTML = "<span>\u{1F4F7}</span>";
    const copy = document.querySelector(`[data-em-prize-copy="${CSS.escape(itemId)}"]`);
    if (copy) copy.innerHTML = "<strong>Prize image</strong><span>Image removed. Save prize setup to keep this change.</span>";
    const btn = document.querySelector(`[data-em-prize-clear="${CSS.escape(itemId)}"]`);
    if (btn) btn.remove();
    const status = document.getElementById("emRafflePrizeStatus");
    if (status) status.textContent = "Image removed. Save prize setup to keep this change.";
  }
  async function uploadPendingRafflePrizeImages(config) {
    const STATE4 = api17().getState?.() || {};
    const uploads = Object.entries(prizeImageFiles);
    if (!uploads.length) return config;
    const slug = safeFilename2(STATE4.event?.slug || STATE4.event?.title || STATE4.eventId || "event");
    for (const [itemId, file] of uploads) {
      const item = (config.items || []).find((entry) => entry.id === itemId);
      if (!item) continue;
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${slug}/${itemId}-${Date.now()}.${ext}`;
      const up = await supabaseClient.storage.from("event-raffle-prizes").upload(path, file, { contentType: file.type || "image/jpeg" });
      if (up.error) throw new Error(`Prize image upload failed: ${up.error.message}`);
      item.image_url = supabaseClient.storage.from("event-raffle-prizes").getPublicUrl(path).data.publicUrl;
    }
    clearPrizeImageState();
    return config;
  }
  async function saveRafflePrizeSetup(action = {}) {
    const STATE4 = api17().getState?.() || {};
    const model = window.EventsRaffleModel;
    const status = document.getElementById("emRafflePrizeStatus");
    const saveBtn = document.getElementById("emRafflePrizeSave");
    try {
      if (!model) throw new Error("Raffle model helper is not loaded.");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }
      if (status) status.textContent = Object.keys(prizeImageFiles).length ? "Uploading prize images..." : "Saving prize setup...";
      let config = collectRafflePrizeConfigFromDom();
      if (action.addCategory) {
        config.categories.push(model.createCategory({ label: "New Tier", sort_order: (config.categories.length + 1) * 10, winner_count: 1 }));
      }
      if (action.addItem) {
        if (!config.categories.length) config.categories.push(model.createCategory({ id: "general", label: "Raffle Prizes", sort_order: 10, winner_count: 1 }));
        const category = config.categories[0];
        config.items.push(model.createItem({ category_id: category.id, name: "New prize item", sort_order: (config.items.length + 1) * 10 }));
        category.winner_count = Math.max(Number(category.winner_count || 0), categoryPrizeQuantity(config, category.id));
      }
      if (action.removeCategoryId) {
        if (config.categories.length <= 1) throw new Error("Keep at least one prize category.");
        config.categories = config.categories.filter((category) => category.id !== action.removeCategoryId);
        const fallbackCategoryId = config.categories[0]?.id || "general";
        config.items.forEach((item) => {
          if (item.category_id === action.removeCategoryId) item.category_id = fallbackCategoryId;
        });
      }
      if (action.removeItemId) {
        const alreadyDrawn = (STATE4.tabData.raffle?.winners || []).some((winner) => winner.prize_id === action.removeItemId);
        if (alreadyDrawn) throw new Error("This prize is already assigned to a winner and cannot be removed from setup.");
        config.items = config.items.filter((item) => item.id !== action.removeItemId);
        delete prizeImageFiles[action.removeItemId];
        delete prizeImagePreviews[action.removeItemId];
        capRaffleWinnerCounts(config);
      }
      config = model.normalizeConfig(config);
      config = await uploadPendingRafflePrizeImages(config);
      const winnerCount = model.getTotalWinnerCount(config);
      if (status) status.textContent = "Saving prize setup...";
      const { error } = await supabaseClient.from("events").update({ raffle_prizes: config, raffle_winner_count: winnerCount }).eq("id", STATE4.eventId);
      if (error) throw error;
      STATE4.event.raffle_prizes = config;
      STATE4.event.raffle_winner_count = winnerCount;
      await api17().refreshEventManager?.("raffle");
    } catch (err) {
      if (status) status.textContent = "Save failed: " + (err.message || "unknown error");
      else alert("Prize setup save failed: " + (err.message || "unknown error"));
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save prize setup";
      }
    }
  }
  function categoryPrizeQuantity(config, categoryId) {
    const STATE4 = api17().getState?.() || {};
    return (config.items || []).filter((item) => item.category_id === categoryId).reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
  }
  function capRaffleWinnerCounts(config) {
    const STATE4 = api17().getState?.() || {};
    (config.categories || []).forEach((category) => {
      const quantity = categoryPrizeQuantity(config, category.id);
      category.winner_count = Math.min(Number(category.winner_count || 0), quantity);
    });
  }
  async function saveRaffleEntryPrice() {
    const STATE4 = api17().getState?.() || {};
    const input = document.getElementById("emRaffleEntryPrice");
    const btn = document.getElementById("emRafflePriceSave");
    const status = document.getElementById("emRafflePriceStatus");
    const dollars = Number(input?.value || 0);
    if (!Number.isFinite(dollars) || dollars < 0) {
      if (status) status.textContent = "Enter a price of 0 or higher.";
      input?.focus();
      return;
    }
    if (dollars > 500) {
      if (status) status.textContent = "Raffle entry price cannot be more than $500.";
      input?.focus();
      return;
    }
    const cents = Math.round(dollars * 100);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }
    if (status) status.textContent = "Saving raffle price...";
    try {
      const { error } = await supabaseClient.from("events").update({ raffle_entry_cost_cents: cents }).eq("id", STATE4.eventId);
      if (error) throw error;
      STATE4.event.raffle_entry_cost_cents = cents;
      await api17().refreshEventManager?.("raffle");
    } catch (err) {
      if (status) status.textContent = "Save failed: " + (err.message || "unknown error");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Save";
      }
    }
  }
  async function removeRaffleEntry(btn) {
    const STATE4 = api17().getState?.() || {};
    const name = btn.dataset.name || "this entry";
    const isPaid = btn.dataset.paid === "1";
    const warning = isPaid ? "\n\nThis was marked paid. Removing the record does not refund Stripe payments." : "";
    if (!confirm(`Remove raffle entry for ${name}? Any winner record for this entry will also be removed.${warning}`)) return;
    btn.disabled = true;
    btn.textContent = "Removing...";
    try {
      await callEdgeFunction("manage-event-participation", {
        action: "remove_raffle_entry",
        event_id: STATE4.eventId,
        entry_id: btn.dataset.removeRaffleEntry
      });
      STATE4.tabData.raffle = null;
      await api17().renderTabAsync?.("raffle", loadRaffle, raffleHtml2, wireRaffle);
      api17().notifyParent?.("updated", STATE4.eventId);
    } catch (err) {
      alert("Raffle entry remove failed: " + (err.message || "unknown error"));
      STATE4.tabData.raffle = null;
      await api17().renderTabAsync?.("raffle", loadRaffle, raffleHtml2, wireRaffle);
    }
  }
  function winnerChoiceHtml(winner, config, winners) {
    const STATE4 = api17().getState?.() || {};
    if (winner.selection_status !== "pending_choice") return "";
    const items = availableChoiceItems(config, winners, winner);
    if (!items.length) {
      return `<div class="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">No unassigned items are available in this category.</div>`;
    }
    const options = items.map((item) => `<option value="${esc8(item.id)}">${esc8(item.emoji || "\u{1F381}")} ${esc8(item.name)}${item.quantity > 1 ? ` (${item.quantity} total)` : ""}</option>`).join("");
    return `
        <div class="mt-3 flex flex-col sm:flex-row gap-2">
            <select id="emWinnerChoice_${esc8(winner.id)}" class="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200">
                ${options}
            </select>
            <button type="button" data-raffle-assign-choice="1" data-winner-id="${esc8(winner.id)}" class="rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 text-xs font-bold transition">Assign prize</button>
        </div>
    `;
  }
  function availableChoiceItems(config, winners, currentWinner) {
    const STATE4 = api17().getState?.() || {};
    const items = raffleItems(config, currentWinner.category_id);
    const used = /* @__PURE__ */ new Map();
    (winners || []).forEach((winner) => {
      if (!winner.prize_id || winner.id === currentWinner.id) return;
      if (winner.selection_status === "pending_choice") return;
      used.set(winner.prize_id, (used.get(winner.prize_id) || 0) + 1);
    });
    return items.filter((item) => (used.get(item.id) || 0) < item.quantity);
  }
  async function assignWinnerChoice(winnerId) {
    const STATE4 = api17().getState?.() || {};
    const winner = (STATE4.tabData.raffle?.winners || []).find((row) => row.id === winnerId);
    if (!winner) return;
    const select = document.getElementById(`emWinnerChoice_${winnerId}`);
    const itemId = select?.value;
    if (!itemId) return alert("Choose a prize item first.");
    const config = raffleConfig(STATE4.event);
    const item = raffleItems(config, winner.category_id).find((row) => row.id === itemId);
    if (!item) return alert("Prize item is no longer available. Refresh and try again.");
    const { error } = await supabaseClient.from("event_raffle_winners").update({
      prize_id: item.id,
      prize_description: item.name,
      prize_image_url: item.image_url || null,
      prize_emoji: item.emoji || window.EventsRaffleModel?.DEFAULT_EMOJI || "\u{1F381}",
      selection_status: "assigned"
    }).eq("id", winnerId).eq("event_id", STATE4.eventId).eq("selection_status", "pending_choice");
    if (error) return alert("Prize assignment failed: " + error.message);
    STATE4.tabData.raffle = null;
    await api17().renderTabAsync?.("raffle", loadRaffle, raffleHtml2, wireRaffle);
    document.dispatchEvent(new CustomEvent("events:raffle:drawn", { detail: { eventId: STATE4.eventId } }));
  }
  function raffleConfig(event) {
    const STATE4 = api17().getState?.() || {};
    if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
    return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
  }
  function raffleCategories(config) {
    const STATE4 = api17().getState?.() || {};
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getOrderedCategories(config);
  }
  function raffleItems(config, categoryId) {
    const STATE4 = api17().getState?.() || {};
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getItemsForCategory(config, categoryId);
  }
  function raffleTotalWinners(config) {
    const STATE4 = api17().getState?.() || {};
    if (!window.EventsRaffleModel) return 0;
    return window.EventsRaffleModel.getTotalWinnerCount(config);
  }
  function raffleDrawQueue(config, winners) {
    const STATE4 = api17().getState?.() || {};
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getDrawQueue(config, winners || []);
  }
  function drawModeLabel(drawMode) {
    const STATE4 = api17().getState?.() || {};
    if (drawMode === "random_item") return "Random prize assigned";
    if (drawMode === "winner_choice") return "Winner chooses later";
    return "Specific prize";
  }
  function prizeSlotLabel(slot) {
    const STATE4 = api17().getState?.() || {};
    if (!slot) return "";
    if (slot.prize_name) return slot.prize_name;
    if (slot.draw_mode === "winner_choice") return `${slot.category_label || "Prize tier"} choice`;
    return slot.category_label || "Prize";
  }
  function clearPrizeImageState() {
    Object.keys(prizeImageFiles).forEach((key) => delete prizeImageFiles[key]);
    Object.keys(prizeImagePreviews).forEach((key) => delete prizeImagePreviews[key]);
  }
  function refreshRaffle(eventId2) {
    const STATE4 = api17().getState?.() || {};
    if (eventId2 && eventId2 !== STATE4.eventId) return;
    STATE4.tabData.raffle = null;
    if (STATE4.activeTab === "raffle") api17().renderTab?.("raffle");
  }
  document.addEventListener("events:raffle:drawn", (evt) => refreshRaffle(evt.detail?.eventId));
  var manageRaffleApi = {
    loadRaffle,
    raffleHtml: raffleHtml2,
    wireRaffle,
    clearPrizeImageState,
    refreshRaffle
  };
  globalThis.EventsManageRaffle = manageRaffleApi;

  // js/portal/events/manage/danger.js
  function api18() {
    return window.EventsManageDangerApi || {};
  }
  function esc9(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function dangerHtml() {
    const STATE4 = api18().getState?.() || {};
    const e = STATE4.event;
    const isCancelled = e.status === "cancelled";
    const isCompleted = e.status === "completed";
    const totalRsvps = STATE4.rsvps.length + STATE4.guestRsvps.length;
    const paidTickets = STATE4.rsvps.filter((r) => r.paid).length + STATE4.guestRsvps.filter((r) => r.paid).length;
    const checkins = STATE4.checkins.length;
    const statusLabel = (e.status || "draft").toUpperCase();
    return `
        <div class="em-card em-command-card mb-4" style="background:linear-gradient(135deg,#7f1d1d,#111827)">
            <p class="em-command-eyebrow">Danger zone</p>
            <h3 class="em-command-title">High-impact event controls</h3>
            <p class="em-command-copy">These actions change availability, visibility, or stored event records. Review attendance and money before making a destructive change.</p>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Status</span><strong style="font-size:18px">${esc9(statusLabel)}</strong><small>Current lifecycle</small></div>
            <div class="em-metric"><span>RSVP records</span><strong>${totalRsvps}</strong><small>Member + guest</small></div>
            <div class="em-metric"><span>Paid tickets</span><strong>${paidTickets}</strong><small>Refund review</small></div>
            <div class="em-metric"><span>Check-ins</span><strong>${checkins}</strong><small>Attendance history</small></div>
        </div>

        ${!isCancelled && !isCompleted ? `
        <div class="em-danger-card">
            <p class="em-danger-title">Cancel event</p>
            <p class="em-danger-sub">Marks the event as cancelled. Paid RSVPs are NOT auto-refunded \u2014 handle refunds in M3b's Money tab or Stripe dashboard.</p>
            <button class="em-btn-danger" data-action="cancel">Cancel event</button>
        </div>` : ""}

        ${!isCompleted ? `
        <div class="em-danger-card" style="background:#fffbeb;border-color:#fde68a">
            <p class="em-danger-title" style="color:#92400e">Mark completed</p>
            <p class="em-danger-sub" style="color:#78350f">Closes RSVPs and locks the event. Use this after the event has ended.</p>
            <button class="em-btn-ghost" data-action="complete" style="background:#fde68a;color:#78350f">Mark completed</button>
        </div>` : ""}

        ${isCancelled ? `<div class="em-card mb-3"><div class="em-section-head"><div><h3 class="em-section-title">Event already cancelled</h3><p class="em-section-sub">Cancellation controls are hidden because this event is no longer open.</p></div></div></div>` : ""}
        ${isCompleted ? `<div class="em-card mb-3"><div class="em-section-head"><div><h3 class="em-section-title">Event completed</h3><p class="em-section-sub">Completion controls are hidden because this event has already been closed.</p></div></div></div>` : ""}

        <div class="em-danger-card" style="background:#fff7ed;border-color:#fed7aa">
            <p class="em-danger-title" style="color:#9a3412">Reset test participation</p>
            <p class="em-danger-sub" style="color:#7c2d12">Keeps the event, images, date, pricing, location, and public URL. Removes RSVPs, guest RSVPs, check-ins, raffle entries, and drawn raffle winners. This does not refund Stripe payments.</p>
            <button class="em-btn-danger" data-action="reset-participation" style="background:#ea580c">Reset participation</button>
        </div>

        <div class="em-danger-card">
            <p class="em-danger-title">Delete event permanently</p>
            <p class="em-danger-sub">Removes the event and ALL associated data: RSVPs, check-ins, raffle entries, documents, photos. You will be asked to type the event title to confirm.</p>
            <button class="em-btn-danger" data-action="delete">Delete event</button>
        </div>
    `;
  }
  function wireDanger() {
    const STATE4 = api18().getState?.() || {};
    document.getElementById("emSheetContent").querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => runDangerAction(btn.dataset.action));
    });
  }
  function cancellationSmsDefaultBody(title) {
    return `Update: ${title} has been cancelled. Reply STOP to opt out.`;
  }
  async function offerCancellationSmsPrompt(event, optedInCount) {
    if (!optedInCount || optedInCount < 1) return;
    const defaultBody = cancellationSmsDefaultBody(event.title);
    const overlay = document.createElement("div");
    overlay.id = "emCancelSmsOverlay";
    overlay.className = "fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50";
    overlay.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-4" role="dialog" aria-labelledby="emCancelSmsTitle">
            <h3 id="emCancelSmsTitle" class="text-base font-semibold text-gray-900">Send cancellation text?</h3>
            <p class="text-sm text-gray-600 mt-1">Notify ${optedInCount} opted-in attendee${optedInCount === 1 ? "" : "s"}. You can edit the message below. Phone numbers stay masked.</p>
            <textarea id="emCancelSmsBody" class="em-textarea mt-3" rows="4" maxlength="1600">${esc9(defaultBody)}</textarea>
            <p id="emCancelSmsResult" class="text-xs mt-2" style="min-height:1rem"></p>
            <div class="flex flex-wrap gap-2 mt-3 justify-end">
                <button type="button" class="em-btn-ghost" data-cancel-sms-skip>Skip</button>
                <button type="button" class="em-btn-primary" data-cancel-sms-send>Send SMS</button>
            </div>
        </div>
    `;
    const cleanup2 = () => overlay.remove();
    return new Promise((resolve) => {
      document.body.appendChild(overlay);
      overlay.querySelector("[data-cancel-sms-skip]")?.addEventListener("click", () => {
        cleanup2();
        resolve({ sent: false, skipped: true });
      });
      overlay.querySelector("[data-cancel-sms-send]")?.addEventListener("click", async () => {
        const resultEl = overlay.querySelector("#emCancelSmsResult");
        const bodyEl = overlay.querySelector("#emCancelSmsBody");
        const body = (bodyEl?.value || "").trim();
        if (!body) {
          if (resultEl) {
            resultEl.textContent = "Enter a message before sending.";
            resultEl.style.color = "#dc2626";
          }
          return;
        }
        if (!confirm(`Send cancellation SMS to ${optedInCount} opted-in recipient${optedInCount === 1 ? "" : "s"}?`)) return;
        const sendBtn = overlay.querySelector("[data-cancel-sms-send]");
        if (sendBtn) {
          sendBtn.disabled = true;
          sendBtn.textContent = "Sending\u2026";
        }
        if (resultEl) resultEl.textContent = "";
        try {
          const res = await callEdgeFunction("send-event-sms", {
            event_id: event.id,
            body,
            message_type: "cancellation",
            recipient_ids: [],
            select_all_opted_in: true,
            dry_run: false
          });
          const skipped = (res.skipped || 0) + (res.skipped_suppressed || 0) + (res.skipped_invalid || 0);
          if (resultEl) {
            resultEl.textContent = res.ok ? `Sent to ${res.sent || 0} recipient(s). Skipped: ${skipped}. Failed: ${res.failed || 0}.${res.dry_run ? " (dry run)" : ""}` : res.error || "Send failed.";
            resultEl.style.color = res.ok ? "#059669" : "#dc2626";
          }
          if (res.ok) {
            setTimeout(() => {
              cleanup2();
              resolve({ sent: true, result: res });
            }, 1200);
          }
        } catch (err) {
          if (resultEl) {
            resultEl.textContent = err.message || "Send failed.";
            resultEl.style.color = "#dc2626";
          }
          if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = "Send SMS";
          }
        }
      });
    });
  }
  async function runDangerAction(action) {
    const STATE4 = api18().getState?.() || {};
    const e = STATE4.event;
    if (!e) return;
    if (action === "delete") {
      const typed = prompt(`Type the event title to permanently delete:

"${e.title}"`);
      if (!typed || typed.trim() !== e.title.trim()) {
        if (typed !== null) alert("Title did not match. Deletion cancelled.");
        return;
      }
      try {
        const { error } = await supabaseClient.from("events").delete().eq("id", e.id);
        if (error) throw error;
        alert("Event deleted.");
        api18().close?.();
        api18().notifyParent?.("deleted", e.id);
      } catch (err) {
        alert("Delete failed: " + (err.message || "unknown error"));
      }
      return;
    }
    if (action === "cancel") {
      if (!confirm(`Mark "${e.title}" as cancelled?`)) return;
      try {
        const { error } = await supabaseClient.from("events").update({ status: "cancelled" }).eq("id", e.id);
        if (error) throw error;
        STATE4.event.status = "cancelled";
        api18().renderHeader?.();
        api18().renderTab?.("danger");
        api18().notifyParent?.("updated", e.id);
        try {
          const { count } = await supabaseClient.from("event_sms_recipients").select("id", { count: "exact", head: true }).eq("event_id", e.id).eq("opted_in", true).is("opted_out_at", null);
          if (count && count > 0) {
            await offerCancellationSmsPrompt(e, count);
          }
        } catch (smsErr) {
          console.warn("Cancellation SMS prompt skipped:", smsErr?.message || smsErr);
        }
      } catch (err) {
        alert("Cancel failed: " + (err.message || "unknown error"));
      }
      return;
    }
    if (action === "reset-participation") {
      await api18().resetParticipation?.();
      return;
    }
    if (action === "complete") {
      if (!confirm(`Mark "${e.title}" as completed?`)) return;
      try {
        const { error } = await supabaseClient.from("events").update({ status: "completed" }).eq("id", e.id);
        if (error) throw error;
        STATE4.event.status = "completed";
        api18().renderHeader?.();
        api18().renderTab?.("danger");
        api18().notifyParent?.("updated", e.id);
      } catch (err) {
        alert("Complete failed: " + (err.message || "unknown error"));
      }
    }
  }
  var manageDangerApi = {
    dangerHtml,
    wireDanger,
    runDangerAction
  };
  globalThis.EventsManageDanger = manageDangerApi;

  // js/portal/events/compat/global-reexports.js
  function exp(name, fn) {
    if (typeof fn !== "undefined") window[name] = fn;
  }
  function g(name) {
    return globalThis[name];
  }
  exp("evtHandleRsvp", typeof g("evtHandleRsvp") === "function" ? g("evtHandleRsvp") : void 0);
  exp("evtHandleRaffleEntry", typeof g("evtHandleRaffleEntry") === "function" ? g("evtHandleRaffleEntry") : void 0);
  exp("evtOpenScanner", typeof g("evtOpenScanner") === "function" ? g("evtOpenScanner") : void 0);
  exp("evtOpenRaffleDraw", typeof g("evtOpenRaffleDraw") === "function" ? g("evtOpenRaffleDraw") : void 0);
  exp("evtDrawWinner", typeof g("evtDrawWinner") === "function" ? g("evtDrawWinner") : void 0);
  exp("evtToggleModal", typeof g("evtToggleModal") === "function" ? g("evtToggleModal") : void 0);
  exp("evtUpdateStatus", typeof g("evtUpdateStatus") === "function" ? g("evtUpdateStatus") : void 0);
  exp("evtCopyShareUrl", typeof g("evtCopyShareUrl") === "function" ? g("evtCopyShareUrl") : void 0);
  exp("evtCloseScanner", typeof g("evtCloseScanner") === "function" ? g("evtCloseScanner") : void 0);
  exp("evtCloseRaffleDraw", typeof g("evtCloseRaffleDraw") === "function" ? g("evtCloseRaffleDraw") : void 0);
  exp("evtAddCostItem", typeof g("evtAddCostItem") === "function" ? g("evtAddCostItem") : void 0);
  exp("evtRemoveCostItem", typeof g("evtRemoveCostItem") === "function" ? g("evtRemoveCostItem") : void 0);
  exp("evtUpdateCostItem", typeof g("evtUpdateCostItem") === "function" ? g("evtUpdateCostItem") : void 0);
  exp("evtJoinWaitlist", typeof g("evtJoinWaitlist") === "function" ? g("evtJoinWaitlist") : void 0);
  exp("evtLeaveWaitlist", typeof g("evtLeaveWaitlist") === "function" ? g("evtLeaveWaitlist") : void 0);
  exp("evtDuplicateEvent", typeof g("evtDuplicateEvent") === "function" ? g("evtDuplicateEvent") : void 0);
  exp("evtCancelEvent", typeof g("evtCancelEvent") === "function" ? g("evtCancelEvent") : void 0);
  exp("evtRescheduleEvent", typeof g("evtRescheduleEvent") === "function" ? g("evtRescheduleEvent") : void 0);
  exp("evtDeleteEvent", typeof g("evtDeleteEvent") === "function" ? g("evtDeleteEvent") : void 0);
  exp("evtClaimWaitlistSpot", typeof g("evtClaimWaitlistSpot") === "function" ? g("evtClaimWaitlistSpot") : void 0);
  exp("evtShowUploadForm", typeof g("evtShowUploadForm") === "function" ? g("evtShowUploadForm") : void 0);
  exp("evtUploadDocument", typeof g("evtUploadDocument") === "function" ? g("evtUploadDocument") : void 0);
  exp("evtDownloadDocument", typeof g("evtDownloadDocument") === "function" ? g("evtDownloadDocument") : void 0);
  exp("evtMarkDistributed", typeof g("evtMarkDistributed") === "function" ? g("evtMarkDistributed") : void 0);
  exp("evtDeleteDocument", typeof g("evtDeleteDocument") === "function" ? g("evtDeleteDocument") : void 0);
  exp("evtOpenDocumentsPanel", typeof g("evtOpenDocumentsPanel") === "function" ? g("evtOpenDocumentsPanel") : void 0);
  exp("evtCloseDocumentsPanel", typeof g("evtCloseDocumentsPanel") === "function" ? g("evtCloseDocumentsPanel") : void 0);
  exp("evtInitMap", typeof g("evtInitMap") === "function" ? g("evtInitMap") : void 0);
  exp("evtToggleLocationSharing", typeof g("evtToggleLocationSharing") === "function" ? g("evtToggleLocationSharing") : void 0);
  exp("evtJoinCompetition", typeof g("evtJoinCompetition") === "function" ? g("evtJoinCompetition") : void 0);
  exp("evtSubmitEntry", typeof g("evtSubmitEntry") === "function" ? g("evtSubmitEntry") : void 0);
  exp("evtCastVote", typeof g("evtCastVote") === "function" ? g("evtCastVote") : void 0);
  exp("evtModerateEntry", typeof g("evtModerateEntry") === "function" ? g("evtModerateEntry") : void 0);
  exp("evtContributeToPrizePool", typeof g("evtContributeToPrizePool") === "function" ? g("evtContributeToPrizePool") : void 0);
  exp("evtStartPhase", typeof g("evtStartPhase") === "function" ? g("evtStartPhase") : void 0);
  exp("evtAdvancePhase", typeof g("evtAdvancePhase") === "function" ? g("evtAdvancePhase") : void 0);
  exp("evtExtendPhase", typeof g("evtExtendPhase") === "function" ? g("evtExtendPhase") : void 0);
  exp("evtFinalizeCompetition", typeof g("evtFinalizeCompetition") === "function" ? g("evtFinalizeCompetition") : void 0);
  exp("evtRecalcCompTiers", typeof g("evtRecalcCompTiers") === "function" ? g("evtRecalcCompTiers") : void 0);
  exp("evtUploadPhoto", typeof g("evtHandlePhotoSelect") === "function" ? g("evtHandlePhotoSelect") : void 0);
  exp("evtDeletePhoto", typeof g("evtDeletePhoto") === "function" ? g("evtDeletePhoto") : void 0);
  exp("evtViewPhoto", typeof g("evtViewPhoto") === "function" ? g("evtViewPhoto") : void 0);
  exp("evtNavigateToEvent", typeof g("evtNavigateToEvent") === "function" ? g("evtNavigateToEvent") : void 0);
  exp("evtNavigateToList", typeof g("evtNavigateToList") === "function" ? g("evtNavigateToList") : void 0);

  // js/portal/events/manage/sheet.js
  var STATE3 = {
    eventId: null,
    event: null,
    rsvps: [],
    guestRsvps: [],
    checkins: [],
    activeTab: "overview",
    source: "admin",
    // 'admin' | 'portal'
    editCopyOnOpen: false,
    tabData: {},
    // lazy per-tab cache: { money, docs, raffle, comp, notifications }
    canManageNotifications: false
  };
  function getDocTypes() {
    const types = window.EventsConstants && window.EventsConstants.EVENT_DOC_TYPES;
    return types && types.length ? types : [];
  }
  var Shell2 = window.EventsManageShell;
  var Overview = window.EventsManageOverview;
  var Images = window.EventsManageImages;
  var Rsvps = window.EventsManageRsvps;
  var Danger = window.EventsManageDanger;
  var Money = window.EventsManageMoney;
  var Docs = window.EventsManageDocs;
  var Raffle = window.EventsManageRaffle;
  var Comp = window.EventsManageCompetition;
  var Participation = window.EventsManageParticipation;
  var Notifications = window.EventsManageNotifications;
  function _renderHeader() {
    return Shell2.renderHeader();
  }
  function _renderTabs() {
    return Shell2.renderTabs();
  }
  function _renderContent(html5) {
    return Shell2.renderContent(html5);
  }
  async function _canManageNotificationsForEvent(event) {
    if (typeof canManageEventNotifications === "function" && canManageEventNotifications()) return true;
    if (typeof canManageEvents === "function" && canManageEvents()) return true;
    const uid = globalThis.evtCurrentUser?.id;
    if (!uid || !event) return false;
    if (event.created_by === uid) return true;
    const { data: host } = await supabaseClient.from("event_hosts").select("id").eq("event_id", event.id).eq("user_id", uid).maybeSingle();
    return !!host;
  }
  async function _loadEventData(eventId2) {
    const { data: event } = await supabaseClient.from("events").select("*").eq("id", eventId2).single();
    STATE3.event = event;
    const { data: rsvps } = await supabaseClient.from("event_rsvps").select("id, user_id, status, paid, qr_token, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url)").eq("event_id", eventId2);
    STATE3.rsvps = rsvps || [];
    const { data: guestRsvps } = await supabaseClient.from("event_guest_rsvps").select("id, guest_name, guest_email, guest_token, status, paid, amount_paid_cents, stripe_payment_intent_id, created_at").eq("event_id", eventId2);
    STATE3.guestRsvps = guestRsvps || [];
    const { data: checkins } = await supabaseClient.from("event_checkins").select("user_id, guest_token, checked_in_at").eq("event_id", eventId2);
    STATE3.checkins = checkins || [];
  }
  async function open4(eventId2, opts = {}) {
    if (!eventId2) return;
    Shell2.ensureMounted();
    STATE3.eventId = eventId2;
    STATE3.source = opts.source || "admin";
    const tabList = Shell2.getVisibleTabs?.() || Shell2.getTabs?.() || [];
    STATE3.activeTab = tabList.some((t) => t.key === opts.tab) ? opts.tab : "overview";
    STATE3.editCopyOnOpen = !!opts.editCopy;
    STATE3.tabData = {};
    Raffle?.clearPrizeImageState?.();
    Shell2.setLoadingChrome();
    Shell2.openPanel();
    await _loadEventData(eventId2);
    STATE3.canManageNotifications = await _canManageNotificationsForEvent(STATE3.event);
    if (opts.notificationsPrefill && Notifications?.resetNotificationsUi) {
      Notifications.resetNotificationsUi(opts.notificationsPrefill);
    }
    if (opts.tab === "notifications" && !STATE3.canManageNotifications) {
      STATE3.activeTab = "overview";
    }
    Shell2.renderHeader();
    Shell2.renderTabs();
    _renderTab(STATE3.activeTab);
  }
  function close3() {
    Shell2.closePanel();
  }
  function _renderTab(tab) {
    if (tab === "overview") {
      _renderContent(Overview.overviewHtml());
      Overview.wireOverview();
      return;
    }
    if (tab === "images") {
      _renderContent(Images.imagesHtml());
      Images.wireImages();
      return;
    }
    if (tab === "rsvps") {
      _renderContent(Rsvps.rsvpsHtml());
      Rsvps.wireRsvps();
      return;
    }
    if (tab === "notifications") {
      return _renderTabAsync("notifications", Notifications.loadNotifications, Notifications.notificationsHtml, Notifications.wireNotifications);
    }
    if (tab === "danger") {
      _renderContent(Danger.dangerHtml());
      Danger.wireDanger();
      return;
    }
    if (tab === "money") return _renderTabAsync("money", Money.loadMoney, Money.moneyHtml, Money.wireMoney);
    if (tab === "docs") return _renderTabAsync("docs", Docs.loadDocs, Docs.docsHtml, Docs.wireDocs);
    if (tab === "raffle") return _renderTabAsync("raffle", Raffle.loadRaffle, Raffle.raffleHtml, Raffle.wireRaffle);
    if (tab === "comp") {
      if (STATE3.event?.event_type !== "competition") {
        _renderContent(Comp.compHtml());
        Comp.wireComp();
        return;
      }
      return _renderTabAsync("comp", Comp.loadComp, Comp.compHtml, Comp.wireComp);
    }
  }
  async function _renderTabAsync(key, loader, render, wire6) {
    if (!STATE3.tabData[key]) {
      _renderContent(`<div class="em-placeholder"><div style="font-size:13px">Loading\u2026</div></div>`);
      try {
        STATE3.tabData[key] = await loader();
      } catch (err) {
        _renderContent(`<div class="em-placeholder"><p class="text-sm text-red-600">Failed to load: ${_esc7(err.message || err)}</p></div>`);
        return;
      }
    }
    if (STATE3.activeTab !== key) return;
    _renderContent(render());
    if (wire6) wire6();
  }
  async function _refreshEventManager(tab) {
    await _loadEventData(STATE3.eventId);
    STATE3.tabData = {};
    if (tab) STATE3.activeTab = tab;
    _renderHeader();
    _renderTabs();
    _renderTab(STATE3.activeTab);
    _notifyParent("updated", STATE3.eventId);
  }
  function _notifyParent(type, eventId2) {
    document.dispatchEvent(new CustomEvent("events:manage:" + type, { detail: { eventId: eventId2 } }));
  }
  function _emptyHtml(title, sub) {
    return `
        <div class="em-placeholder">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="text-sm font-semibold text-gray-500">${_esc7(title)}</p>
            ${sub ? `<p class="text-xs text-gray-400 mt-1">${_esc7(sub)}</p>` : ""}
        </div>
    `;
  }
  function _esc7(s) {
    const el = document.createElement("span");
    el.textContent = s == null ? "" : String(s);
    return el.innerHTML;
  }
  function refreshRaffle2(eventId2) {
    return Raffle.refreshRaffle(eventId2);
  }
  globalThis.EventsManageParticipationApi = {
    getState: () => STATE3,
    refreshEventManager: _refreshEventManager,
    renderTab: _renderTab
  };
  globalThis.EventsManageDangerApi = {
    getState: () => STATE3,
    notifyParent: _notifyParent,
    close: close3,
    renderHeader: () => Shell2.renderHeader(),
    renderTab: _renderTab,
    resetParticipation: () => Participation.resetParticipation()
  };
  globalThis.EventsManageRaffleApi = {
    getState: () => STATE3,
    emptyHtml: _emptyHtml,
    notifyParent: _notifyParent,
    refreshEventManager: _refreshEventManager,
    renderTab: _renderTab,
    renderTabAsync: _renderTabAsync
  };
  globalThis.EventsManageRsvpsApi = {
    getState: () => STATE3,
    removeParticipationPerson: (btn) => Participation.removeParticipationPerson(btn)
  };
  globalThis.EventsManageImagesApi = {
    getState: () => STATE3,
    notifyParent: _notifyParent
  };
  globalThis.EventsManageMoneyApi = {
    getState: () => STATE3
  };
  globalThis.EventsManageDocsApi = {
    getState: () => STATE3,
    getDocTypes,
    renderTab: _renderTab,
    notifyParent: _notifyParent
  };
  globalThis.EventsManageCompetitionApi = {
    getState: () => STATE3,
    emptyHtml: _emptyHtml
  };
  globalThis.EventsManageNotificationsApi = {
    getState: () => STATE3,
    renderTab: _renderTab,
    refreshNotificationsTab: () => Notifications.refreshNotificationsTab?.()
  };
  globalThis.EventsManageShellApi = {
    getState: () => STATE3,
    onClose: close3,
    renderTab: _renderTab
  };
  globalThis.EventsManageOverviewApi = {
    getState: () => STATE3,
    renderHeader: () => Shell2.renderHeader(),
    renderTabs: () => Shell2.renderTabs(),
    renderTab: _renderTab,
    notifyParent: _notifyParent
  };
  var eventsManageApi = { open: open4, close: close3, refreshRaffle: refreshRaffle2 };
  globalThis.EventsManage = eventsManageApi;
  var PortalEvents14 = globalThis.PortalEvents = globalThis.PortalEvents || {};
  PortalEvents14.manage = PortalEvents14.manage || {};
  PortalEvents14.manage.open = eventsManageApi.open;
  PortalEvents14.manage.close = eventsManageApi.close;
  PortalEvents14.manage.refreshRaffle = eventsManageApi.refreshRaffle;
  if (PortalEvents14.detail && typeof PortalEvents14.detail.register === "function") {
    PortalEvents14.detail.register("manage", { open: open4, close: close3 });
  }

  // js/portal/events/init.js
  var _eventsPageInitialized = false;
  var _eventsPopstateListenerBound = false;
  var _eventsListenersBound = false;
  async function initEventsPage() {
    if (_eventsPageInitialized) return;
    _eventsPageInitialized = true;
    window._eventsPageInitialized = true;
    globalThis.evtCurrentUser = await checkAuth();
    if (!globalThis.evtCurrentUser) return;
    const { data: profile } = await supabaseClient.from("profiles").select("role, first_name, last_name, profile_picture_url").eq("id", globalThis.evtCurrentUser.id).maybeSingle();
    globalThis.evtCurrentUserRole = profile?.role;
    window.evtCurrentUserName = profile?.first_name || "";
    window.evtCurrentUserPic = profile?.profile_picture_url || null;
    window.evtCurrentUserInitials = ((profile?.first_name?.[0] || "") + (profile?.last_name?.[0] || "")).toUpperCase() || "?";
    if (typeof canCreateEvents === "function" && canCreateEvents()) {
      document.getElementById("createEventBtn")?.classList.remove("hidden");
      document.getElementById("createEventBtn")?.classList.add("flex");
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzSel = document.getElementById("eventTimezone");
    if (tzSel) {
      for (const opt of tzSel.options) {
        if (opt.value === tz) {
          opt.selected = true;
          break;
        }
      }
    }
    evtSetupListeners();
    await loadEvents();
    globalThis.evtRouteByUrl();
    if (!_eventsPopstateListenerBound) {
      _eventsPopstateListenerBound = true;
      window.addEventListener("popstate", () => globalThis.evtRouteByUrl());
    }
  }
  document.addEventListener("DOMContentLoaded", initEventsPage);
  function evtUpdateRaffleCostHint() {
    const costGroup = document.getElementById("raffleEntryCostGroup");
    const hint = document.getElementById("raffleCostHint");
    const mode = document.getElementById("pricingMode")?.value || "free";
    const raffleOn = document.getElementById("raffleEnabled")?.checked;
    if (!costGroup) return;
    if (mode === "paid") {
      costGroup.classList.add("hidden");
      if (hint) hint.textContent = "Raffle entry is included free with paid RSVP.";
    } else {
      costGroup.classList.remove("hidden");
      if (hint) hint.textContent = "This is the price for a standalone raffle ticket.";
    }
  }
  function evtSetupListeners() {
    if (_eventsListenersBound) return;
    _eventsListenersBound = true;
    initFilterChips2();
    setupSearch2();
    document.getElementById("typeFilter")?.addEventListener("change", renderEvents);
    function _openCreate() {
      if (window.EventsCreate && window.EventsCreate.open) {
        window.EventsCreate.open();
      } else {
        evtToggleModal("createModal", true);
      }
    }
    document.getElementById("createEventBtn")?.addEventListener("click", _openCreate);
    document.getElementById("emptyCreateBtn")?.addEventListener("click", _openCreate);
    document.getElementById("closeCreateModal")?.addEventListener("click", () => evtToggleModal("createModal", false));
    document.getElementById("createModalOverlay")?.addEventListener("click", () => evtToggleModal("createModal", false));
    document.addEventListener("events:created", () => loadEvents());
    document.getElementById("closeScannerModal")?.addEventListener("click", evtCloseScanner);
    document.getElementById("scannerModalOverlay")?.addEventListener("click", evtCloseScanner);
    const dropzone = document.getElementById("bannerDropzone");
    const fileInput = document.getElementById("bannerFile");
    dropzone?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", evtHandleBannerSelect);
    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("border-brand-400");
    });
    dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("border-brand-400"));
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-brand-400");
      if (e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        evtHandleBannerSelect();
      }
    });
    const embedDropzone = document.getElementById("embedImageDropzone");
    const embedFileInput = document.getElementById("embedImageFile");
    embedDropzone?.addEventListener("click", () => embedFileInput?.click());
    embedFileInput?.addEventListener("change", evtHandleEmbedImageSelect);
    embedDropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      embedDropzone.classList.add("border-brand-400");
    });
    embedDropzone?.addEventListener("dragleave", () => embedDropzone.classList.remove("border-brand-400"));
    embedDropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      embedDropzone.classList.remove("border-brand-400");
      if (e.dataTransfer.files[0]) {
        embedFileInput.files = e.dataTransfer.files;
        evtHandleEmbedImageSelect();
      }
    });
    document.getElementById("createEventForm")?.addEventListener("submit", evtHandleCreate);
    evtInitLocationValidation();
    document.getElementById("previewEventBtn")?.addEventListener("click", evtHandlePreview);
    const pricingModeEl = document.getElementById("pricingMode");
    pricingModeEl?.addEventListener("change", () => {
      const mode = pricingModeEl.value;
      const rsvpCostGroup = document.getElementById("rsvpCostGroup");
      if (rsvpCostGroup) rsvpCostGroup.classList.toggle("hidden", mode !== "paid");
      evtUpdateRaffleCostHint();
    });
    const raffleToggle = document.getElementById("raffleEnabled");
    raffleToggle?.addEventListener("change", () => {
      const config = document.getElementById("raffleConfig");
      if (config) config.classList.toggle("hidden", !raffleToggle.checked);
      evtUpdateRaffleCostHint();
    });
    const winnerCountEl = document.getElementById("raffleWinnerCount");
    winnerCountEl?.addEventListener("change", () => {
      const count = parseInt(winnerCountEl.value) || 1;
      const container = document.getElementById("rafflePrizesList");
      if (!container) return;
      let html5 = "";
      for (let i = 1; i <= count; i++) {
        const suffix = typeof globalThis.evtOrdinalSuffix === "function" ? globalThis.evtOrdinalSuffix(i) : "th";
        html5 += `<div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-500 w-6">#${i}</span>
                <input type="text" name="rafflePrize" data-raffle-prize placeholder="Prize for ${i}${suffix} place" class="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
            </div>`;
      }
      container.innerHTML = html5;
    });
    document.getElementById("closeRaffleDrawModal")?.addEventListener("click", () => evtToggleModal("raffleDrawModal", false));
    document.getElementById("raffleDrawOverlay")?.addEventListener("click", () => evtToggleModal("raffleDrawModal", false));
    document.getElementById("eventType")?.addEventListener("change", evtToggleLlcFields);
    document.getElementById("compTier1Pct")?.addEventListener("input", evtRecalcCompTiers);
    document.getElementById("compTier2Pct")?.addEventListener("input", evtRecalcCompTiers);
    document.getElementById("compTier3Pct")?.addEventListener("input", evtRecalcCompTiers);
    document.getElementById("addCostItemBtn")?.addEventListener("click", evtAddCostItem);
    document.getElementById("eventMax")?.addEventListener("change", evtRecalcCostSummary);
    document.getElementById("eventMax")?.addEventListener("input", evtRecalcCostSummary);
    document.getElementById("eventMinParticipants")?.addEventListener("change", evtRecalcCostSummary);
    document.getElementById("eventMinParticipants")?.addEventListener("input", evtRecalcCostSummary);
    document.getElementById("eventLlcCut")?.addEventListener("change", evtRecalcCostSummary);
    document.getElementById("eventLlcCut")?.addEventListener("input", evtRecalcCostSummary);
    const llcOverride = document.getElementById("llcRsvpOverride");
    llcOverride?.addEventListener("input", () => {
      llcOverride.dataset.userEdited = "true";
    });
    llcOverride?.addEventListener("change", () => {
      llcOverride.dataset.userEdited = "true";
    });
    const transportEl = document.getElementById("eventTransportation");
    transportEl?.addEventListener("change", () => {
      const group = document.getElementById("transportEstimateGroup");
      if (group) group.classList.toggle("hidden", transportEl.value !== "self_arranged");
    });
    const transportToggle = document.getElementById("transportationEnabled");
    transportToggle?.addEventListener("change", () => {
      const section = document.getElementById("transportationSection");
      if (section) section.classList.toggle("hidden", !transportToggle.checked);
    });
    const rsvpToggle = document.getElementById("rsvpEnabled");
    rsvpToggle?.addEventListener("change", () => {
      const settings = document.getElementById("rsvpSettingsGroup");
      if (settings) settings.classList.toggle("hidden", !rsvpToggle.checked);
      if (!rsvpToggle.checked) {
        ["gateTime", "gateLocation", "gateNotes"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.checked = false;
        });
        const notes = document.getElementById("eventGatedNotes");
        if (notes) notes.value = "";
      }
    });
    const checkinToggle = document.getElementById("checkinEnabled");
    checkinToggle?.addEventListener("change", () => {
      const section = document.getElementById("checkinModeSection");
      if (section) section.classList.toggle("hidden", !checkinToggle.checked);
    });
  }
  publishGlobals({ evtSetupListeners, evtUpdateRaffleCostHint });
  window.PortalEvents = window.PortalEvents || {};
  window.PortalEvents.initEventsPage = initEventsPage;
})();
/* end portal events bundle */
//# sourceMappingURL=events.bundle.js.map
