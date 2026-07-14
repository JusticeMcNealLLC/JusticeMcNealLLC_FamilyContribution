const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const createSheet = fs.readFileSync(path.join(root, 'js/portal/events/create/sheet.js'), 'utf8');
const legacyCreate = fs.readFileSync(path.join(root, 'js/portal/events/create/legacy-submit.js'), 'utf8');
const eventsHtml = fs.readFileSync(path.join(root, 'pages/portal/events.html'), 'utf8');
const eventOg = fs.readFileSync(path.join(root, 'supabase/functions/event-og/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/089_event_embed_image_url.sql'), 'utf8');

assert(createSheet.includes('Embed image (optional)'), 'create sheet should expose a separate embed image upload');
assert(createSheet.includes('embedImageFile'), 'create sheet should track an embed image file separately from the banner');
assert(createSheet.includes('embed_image_url: embedImageUrl'), 'create sheet should insert embed_image_url on new events');
assert(createSheet.includes("`embeds/${slug}-${Date.now()}.${ext}`"), 'embed uploads should be stored under an embeds prefix');
assert(eventsHtml.includes('id="embedImageFile"'), 'legacy create modal should expose an embed image file input');
assert(legacyCreate.includes('evtEmbedImageFile'), 'legacy create flow should upload the separate embed image');
assert(legacyCreate.includes('embed_image_url: embedImageUrl'), 'legacy create flow should insert embed_image_url');
assert(eventOg.includes('banner_url, embed_image_url'), 'event-og should select embed_image_url');
assert(/event\.embed_image_url \|\| event\.banner_url/.test(eventOg), 'event-og should prefer embed image and fall back to banner');
assert(eventOg.includes('new URL(rawImage, SITE_URL).toString()'), 'event-og should normalize relative image URLs to absolute URLs');
assert(eventOg.includes('og:image:alt'), 'event-og should include image alt metadata');
assert(/ADD COLUMN IF NOT EXISTS embed_image_url TEXT/.test(migration), 'migration should add embed_image_url column');

console.log('event embed image smoke: all pass');