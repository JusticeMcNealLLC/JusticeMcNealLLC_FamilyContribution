#!/usr/bin/env node
'use strict';
/**
 * Build portal/events/events.bundle.js from main.js (esbuild IIFE bundle).
 * Syncs main.js from classic-chain-loader.js first to keep one manifest.
 *
 * Run: npm run build:events
 * Watch: npm run dev:events
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const mainPath = path.join(root, 'js/portal/events/main.js');
const outPath = path.join(root, 'js/portal/events/events.bundle.js');
const watch = process.argv.includes('--watch');

function syncMain() {
    require('./sync-events-main.js');
}

async function build() {
    syncMain();
    const opts = {
        entryPoints: [mainPath],
        bundle: true,
        outfile: outPath,
        format: 'iife',
        target: ['es2020'],
        sourcemap: true,
        logLevel: 'info',
        banner: {
            js: '/* Portal Events — production bundle from main.js (esbuild); do not edit */',
        },
        footer: {
            js: '/* end portal events bundle */',
        },
    };
    if (watch) {
        const ctx = await esbuild.context(opts);
        await ctx.watch();
        console.log('Watching js/portal/events/**/*.js → events.bundle.js');
        return;
    }
    const result = await esbuild.build(opts);
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`Wrote ${path.relative(root, outPath)} (${kb} KB)`);
    if (result.errors.length) process.exit(1);
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
