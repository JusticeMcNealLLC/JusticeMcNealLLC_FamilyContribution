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

/** Script is loaded in production via explicit HTML tag or classic-chain-loader chain. */
function isProductionLoaded(html, chain, portalSrc) {
    if (html.includes(`src="${portalSrc}"`)) return true;
    if (!chain) return false;
    const key = portalSrc.replace(EVENTS_BASE, '');
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

module.exports = {
    LOADER_REL,
    EVENTS_BASE,
    parseClassicChain,
    chainIndex,
    portalEventsHtmlScripts,
    isProductionLoaded,
    chainOrderOk,
};
