// _events-css.js — concatenated CSS for smoke tests after the
// css/pages/portal-events.css → css/pages/portal/events/*.css refactor.
// Smoke tests regex against the combined text.
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '..', 'css', 'pages', 'portal', 'events');
const order = ['base.css','layout.css','filters.css','hero.css','cards.css','calendar.css','rail.css','detail.css'];
module.exports = order.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n\n');
