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

function portalEventsHtmlScripts(html) {
    const portalBlock = html.slice(html.indexOf('<!-- Events modules'));
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
            const marker = `/* ===== js/portal/events/${key} ===== */`;
            if (fs.readFileSync(bundlePath, 'utf8').includes(marker)) return true;
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
    portalEventsHtmlScripts,
    isProductionLoaded,
    chainOrderOk,
    productionEventsBootLast,
};
