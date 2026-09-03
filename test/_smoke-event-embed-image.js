const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const createSheet = fs.readFileSync(path.join(root, 'js/portal/events/create/sheet.js'), 'utf8');
const createSubmit = fs.readFileSync(path.join(root, 'js/portal/events/create/submit.js'), 'utf8');
const stepBasics = fs.readFileSync(path.join(root, 'js/portal/events/create/step-basics.js'), 'utf8');
const eventsHtml = fs.readFileSync(path.join(root, 'pages/portal/events.html'), 'utf8');
const eventOg = fs.readFileSync(path.join(root, 'supabase/functions/event-og/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/089_event_embed_image_url.sql'), 'utf8');

assert(createSheet.includes('embedImageFile'), 'create sheet should track an embed image file separately from the banner');
assert(createSheet.includes('embed_image_url'), 'create sheet state should support embed image URL');
assert(stepBasics.includes('ecEmbedImageFile'), 'basics step should expose embed image upload in the sheet');
assert(createSubmit.includes('embedImageUrl'), 'submit should persist embed_image_url');
assert(createSubmit.includes('embeds/${slug}'), 'embed uploads should be stored under an embeds prefix');
assert(!eventsHtml.includes('id="createModal"'), 'legacy create modal should be removed from portal events HTML');
assert(eventOg.includes('banner_url, embed_image_url'), 'event-og should select embed_image_url');
assert(/event\.embed_image_url \|\| event\.banner_url/.test(eventOg), 'event-og should prefer embed image and fall back to banner');
assert(eventOg.includes('new URL(rawImage, SITE_URL).toString()'), 'event-og should normalize relative image URLs to absolute URLs');
assert(eventOg.includes('og:image:alt'), 'event-og should include image alt metadata');
assert(/ADD COLUMN IF NOT EXISTS embed_image_url TEXT/.test(migration), 'migration should add embed_image_url column');

console.log('event embed image smoke: all pass');
