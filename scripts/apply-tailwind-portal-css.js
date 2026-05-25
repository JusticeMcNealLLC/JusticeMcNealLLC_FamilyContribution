#!/usr/bin/env node
'use strict';
/**
 * Replace Tailwind CDN + inline config with built css/tailwind.portal.css.
 * Run: node scripts/apply-tailwind-portal-css.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const tailwindRe = /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*<script>\s*tailwind\.config\s*=\s*\{[\s\S]*?\}\s*<\/script>\s*/g;

const htmlFiles = [];
function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === '.git') continue;
            walk(full);
        } else if (ent.name.endsWith('.html')) {
            htmlFiles.push(full);
        }
    }
}
['portal', 'admin', 'auth', 'events', 'public', 'test'].forEach((d) => {
    const p = path.join(root, d);
    if (fs.existsSync(p)) walk(p);
});
if (fs.existsSync(path.join(root, 'index.html'))) htmlFiles.push(path.join(root, 'index.html'));

let updated = 0;
for (const file of htmlFiles) {
    let src = fs.readFileSync(file, 'utf8');
    if (!src.includes('cdn.tailwindcss.com')) continue;
    const rel = path.relative(path.dirname(file), path.join(root, 'css', 'tailwind.portal.css')).replace(/\\/g, '/');
    const link = `<link rel="stylesheet" href="${rel}">\n    `;
    const next = src.replace(tailwindRe, link);
    if (next !== src) {
        fs.writeFileSync(file, next, 'utf8');
        updated++;
        console.log('updated', path.relative(root, file));
    }
}
console.log(`Done. ${updated} HTML file(s) now use tailwind.portal.css.`);
