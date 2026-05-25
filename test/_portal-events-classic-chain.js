'use strict';

const fs = require('fs');
const path = require('path');

const LOADER_REL = 'js/portal/events/classic-chain-loader.js';
const EVENTS_BASE = '../js/portal/events/';

function readFile(root, relPath) {
    return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function parseClassicChain(root) {
    const loaderJs = readFile(root, LOADER_REL);
    const chainMatch = loaderJs.match(/var chain = \[([\s\S]*?)\];/);
    if (!chainMatch) return null;
    return [...chainMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Relative path under portal/events (e.g. detail.js or detail/data.js). */
function chainIndex(chain, relUnderEvents) {
    const key = relUnderEvents.replace(/^\.\.\/js\/portal\/events\//, '').replace(/^js\/portal\/events\//, '');
    return chain.indexOf(key);
}

function eventsHtmlBlockStart(html) {
    const markers = ['<!-- Events modules', '<!-- Events —', '<!-- Events -'];
    for (const m of markers) {
        const i = html.indexOf(m);
        if (i >= 0) return i;
    }
    const bi = html.indexOf('events.bundle.js');
    if (bi >= 0) {
        const comment = html.lastIndexOf('<!--', bi);
        if (comment >= 0) return comment;
    }
    return -1;
}

function portalEventsHtmlScripts(html) {
    const start = eventsHtmlBlockStart(html);
    if (start < 0) return [];
    const portalBlock = html.slice(start);
    const moduleSection = portalBlock.slice(0, portalBlock.indexOf('sw-register'));
    return [...moduleSection.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)]
        .map((m) => m[1])
        .filter((s) => s.includes('portal/events'));
}

/** Script is loaded in production via HTML tag, bundle, or classic-chain-loader chain. */
function isProductionLoaded(html, chain, portalSrc, rootDir) {
    if (html.includes(`src="${portalSrc}"`)) return true;
    const key = portalSrc.replace(EVENTS_BASE, '').replace(/^js\/portal\/events\//, '');
    if (html.includes('events.bundle.js') && rootDir) {
        const bundlePath = path.join(rootDir, 'js/portal/events/events.bundle.js');
        if (fs.existsSync(bundlePath)) {
            const bundle = fs.readFileSync(bundlePath, 'utf8');
            const marker = `/* ===== js/portal/events/${key} ===== */`;
            if (bundle.includes(marker)) return true;
            const posixKey = key.replace(/\\/g, '/');
            if (bundle.includes(`portal/events/${posixKey}`)) return true;
            if (posixKey === 'list/shell.js' && (bundle.includes('window.evtLoadEvents = loadEvents') || bundle.includes('PortalEvents.list'))) return true;
            if (posixKey === 'init.js' && bundle.includes('Portal Events — Init')) return true;
            if (posixKey === 'core/vendor-loader.js' && bundle.includes('evtEnsureLeaflet')) return true;
        }
    }
    if (!chain) return false;
    return chain.includes(key);
}

function chainOrderOk(chain, ...relUnderEventsList) {
    const indices = relUnderEventsList.map((rel) => chainIndex(chain, rel));
    if (indices.some((i) => i < 0)) return false;
    for (let i = 1; i < indices.length; i++) {
        if (indices[i] <= indices[i - 1]) return false;
    }
    return true;
}

/** Last portal/events script before sw-register (bundle includes init at tail). */
function productionEventsBootLast(portalScripts) {
    if (!portalScripts.length) return false;
    const last = portalScripts[portalScripts.length - 1];
    return last.includes('events.bundle.js') || /\/init\.js/.test(last);
}

module.exports = {
    LOADER_REL,
    EVENTS_BASE,
    parseClassicChain,
    chainIndex,
    eventsHtmlBlockStart,
    portalEventsHtmlScripts,
    isProductionLoaded,
    chainOrderOk,
    productionEventsBootLast,
};
