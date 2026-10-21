#!/usr/bin/env node
'use strict';
/**
 * Build each React island (react/islands/*.tsx) into js/react/<name>.js (esbuild IIFE).
 * Output is committed: GitHub Pages serves the repo as-is, with no build step.
 *
 * Run: npm run build:react
 * Watch: npm run dev:react
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const islandsDir = path.join(root, 'react/islands');
const outdir = path.join(root, 'js/react');
const watch = process.argv.includes('--watch');

const entryPoints = fs.readdirSync(islandsDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => path.join(islandsDir, f));

const opts = {
    entryPoints,
    bundle: true,
    outdir,
    format: 'iife',
    target: ['es2020'],
    jsx: 'automatic',
    minify: true,
    sourcemap: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'info',
    banner: { js: '/* Built from react/islands by npm run build:react; do not edit */' },
};

async function build() {
    if (watch) {
        const ctx = await esbuild.context(opts);
        await ctx.watch();
        console.log('Watching react/** → js/react/');
        return;
    }
    const result = await esbuild.build(opts);
    if (result.errors.length) process.exit(1);
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
