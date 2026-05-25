/**
 * Load repo-root .env into process.env (simple KEY=VALUE, no quotes required).
 * Usage: require('./load-env') at top of scripts that need DB credentials.
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) return;

for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
}
