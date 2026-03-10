#!/usr/bin/env node
// ─── Generate PWA & favicon icons from the current brand logo ───
// Usage:  node scripts/generate-icons.js
//
// Downloads the latest brand logo from Supabase Storage,
// then generates all required icon sizes as PNGs.
// Run this whenever you update the logo in Admin > Brand.

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = 'https://jcrsfzcabzdeqixbewgf.supabase.co';
const BUCKET = 'profile-pictures';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnNmemNhYnpkZXFpeGJld2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ0MjQzMSwiZXhwIjoyMDg0MDE4NDMxfQ.HL0A5s9uWXX2njDXK0M5lBEeBemKFVi6E3Q6JXWUBOM';

const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'assets', 'icons');

// Brand color for maskable icon padding background
const BRAND_BG = { r: 79, g: 70, b: 229, alpha: 1 }; // #4F46E5

async function listBrandFiles() {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefix: 'brand', limit: 20 }),
    });
    if (!res.ok) throw new Error(`Failed to list brand files: ${res.status}`);
    return res.json();
}

async function downloadFile(filePath) {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
    console.log(`  Downloading: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${filePath}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

function createIco(png32Buffer) {
    // ICO header (6 bytes) + 1 directory entry (16 bytes) + PNG data
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);   // reserved
    header.writeUInt16LE(1, 2);   // type: icon
    header.writeUInt16LE(1, 4);   // count: 1

    const entry = Buffer.alloc(16);
    entry.writeUInt8(32, 0);      // width
    entry.writeUInt8(32, 1);      // height
    entry.writeUInt8(0, 2);       // color palette
    entry.writeUInt8(0, 3);       // reserved
    entry.writeUInt16LE(1, 4);    // color planes
    entry.writeUInt16LE(32, 6);   // bits per pixel
    entry.writeUInt32LE(png32Buffer.length, 8);  // image data size
    entry.writeUInt32LE(22, 12);  // offset to image data

    return Buffer.concat([header, entry, png32Buffer]);
}

async function generate(srcBuffer) {
    const meta = await sharp(srcBuffer).metadata();
    console.log(`  Source: ${meta.width}x${meta.height} ${meta.format}`);

    // ── Standard icons ──
    const sizes = [
        { s: 512, name: 'icon-512.png' },
        { s: 192, name: 'icon-192.png' },
        { s: 180, name: 'apple-touch-icon.png' },
        { s: 32,  name: 'favicon-32.png' },
        { s: 16,  name: 'favicon-16.png' },
    ];

    for (const { s, name } of sizes) {
        const out = path.join(ICONS_DIR, name);
        await sharp(srcBuffer).resize(s, s, { fit: 'cover', position: 'center' }).png({ quality: 95 }).toFile(out);
        console.log(`  ✓ ${name} (${s}x${s})`);
    }

    // ── Maskable icons (10% padding, brand background) ──
    for (const size of [512, 192]) {
        const pad = Math.round(size * 0.1);
        const inner = size - pad * 2;
        const resized = await sharp(srcBuffer).resize(inner, inner, { fit: 'cover' }).png().toBuffer();
        const out = path.join(ICONS_DIR, `icon-${size}-maskable.png`);
        await sharp({ create: { width: size, height: size, channels: 4, background: BRAND_BG } })
            .composite([{ input: resized, top: pad, left: pad }])
            .png()
            .toFile(out);
        console.log(`  ✓ icon-${size}-maskable.png (${size}x${size})`);
    }

    // ── Favicon.ico ──
    const fav32 = fs.readFileSync(path.join(ICONS_DIR, 'favicon-32.png'));
    const ico = createIco(fav32);
    fs.writeFileSync(path.join(ROOT, 'favicon.ico'), ico);
    console.log(`  ✓ favicon.ico`);

    // ── Root-level apple-touch-icon fallback ──
    fs.copyFileSync(path.join(ICONS_DIR, 'apple-touch-icon.png'), path.join(ROOT, 'apple-touch-icon.png'));
    console.log(`  ✓ /apple-touch-icon.png (root copy)`);

    // ── Root-level favicon ──
    fs.copyFileSync(path.join(ICONS_DIR, 'favicon-32.png'), path.join(ROOT, 'favicon-32x32.png'));
    console.log(`  ✓ /favicon-32x32.png (root copy)`);
}

async function main() {
    console.log('\n🎨 Generating PWA icons from brand logo...\n');

    // 1. Find the latest brand logo in Supabase
    console.log('→ Fetching brand files from Supabase Storage...');
    const files = await listBrandFiles();

    // Prefer solid logo (has background, looks better as icon)
    let match = files.find(f => f.name.startsWith('logo-solid'));
    if (!match) match = files.find(f => f.name.startsWith('logo-transparent'));
    if (!match) {
        console.error('✗ No brand logo found in Supabase Storage! Upload one in Admin > Brand first.');
        process.exit(1);
    }

    console.log(`→ Using: brand/${match.name}\n`);

    // 2. Download it
    const buf = await downloadFile(`brand/${match.name}`);
    console.log(`  Downloaded ${buf.length} bytes\n`);

    // 3. Generate all icons
    console.log('→ Generating icons...');
    await generate(buf);

    // 4. Bump service worker cache version
    console.log('\n→ Bumping service worker cache version...');
    const swPath = path.join(ROOT, 'sw.js');
    let sw = fs.readFileSync(swPath, 'utf8');
    const m = sw.match(/const CACHE_NAME = 'jm-portal-v(\d+)'/);
    if (m) {
        const next = parseInt(m[1]) + 1;
        sw = sw.replace(m[0], `const CACHE_NAME = 'jm-portal-v${next}'`);
        fs.writeFileSync(swPath, sw);
        console.log(`  ✓ Cache bumped to v${next}`);
    }

    console.log('\n✅ All icons generated! Commit & push to deploy.\n');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
