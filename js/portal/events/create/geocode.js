// ═══════════════════════════════════════════════════════════
// Portal Events — Create geocode helpers (Phase 5M.1.1)
//
// US Census (edge function) → Nominatim fallback.
// Public API: window.evtGeocodeAddress (used by create/sheet.js and legacy create.js)
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // Common US street-type abbreviations → full words for better geocoding
    const STREET_ABBREVS = {
        'crt': 'court', 'ct': 'court', 'dr': 'drive', 'st': 'street', 'ave': 'avenue',
        'blvd': 'boulevard', 'ln': 'lane', 'rd': 'road', 'pl': 'place', 'cir': 'circle',
        'pkwy': 'parkway', 'hwy': 'highway', 'trl': 'trail', 'ter': 'terrace',
        'trce': 'trace', 'cv': 'cove', 'pt': 'point', 'aly': 'alley', 'way': 'way'
    };

    // US state abbreviations → full names
    const STATE_ABBREVS = {
        'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
        'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
        'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
        'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
        'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi',
        'mo': 'missouri', 'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire',
        'nj': 'new jersey', 'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina',
        'nd': 'north dakota', 'oh': 'ohio', 'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania',
        'ri': 'rhode island', 'sc': 'south carolina', 'sd': 'south dakota', 'tn': 'tennessee',
        'tx': 'texas', 'ut': 'utah', 'vt': 'vermont', 'va': 'virginia', 'wa': 'washington',
        'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming', 'dc': 'district of columbia'
    };

    function evtExpandAddress(raw) {
        let words = raw.trim().split(/\s+/);
        const streetTypes = new Set(Object.values(STREET_ABBREVS));
        let streetTypeIdx = -1;
        words = words.map((w, i) => {
            const lower = w.toLowerCase();
            if (STREET_ABBREVS[lower]) { streetTypeIdx = i; return STREET_ABBREVS[lower]; }
            if (streetTypes.has(lower)) { streetTypeIdx = i; }
            return w;
        });
        words = words.map(w => STATE_ABBREVS[w.toLowerCase()] || w);
        const expanded = words.join(' ');
        if (raw.includes(',')) return expanded;
        const zipMatch = expanded.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
        if (!zipMatch) return expanded;
        const beforeZip = zipMatch[1];
        const zip = zipMatch[2];
        const bParts = beforeZip.split(' ');
        let stateStart = -1;
        const stateVals = Object.values(STATE_ABBREVS);
        if (bParts.length >= 3) {
            const twoWord = (bParts[bParts.length - 2] + ' ' + bParts[bParts.length - 1]).toLowerCase();
            if (stateVals.includes(twoWord)) stateStart = bParts.length - 2;
        }
        if (stateStart < 0 && bParts.length >= 2) {
            if (stateVals.includes(bParts[bParts.length - 1].toLowerCase())) stateStart = bParts.length - 1;
        }
        if (stateStart < 0) return expanded;
        const statePart = bParts.slice(stateStart).join(' ');
        const preState = bParts.slice(0, stateStart);
        if (streetTypeIdx >= 0 && streetTypeIdx < preState.length - 1) {
            const street = preState.slice(0, streetTypeIdx + 1).join(' ');
            const city = preState.slice(streetTypeIdx + 1).join(' ');
            return `${street}, ${city}, ${statePart} ${zip}`;
        }
        return preState.join(' ') + ', ' + statePart + ' ' + zip;
    }

    async function evtGeocodeCensus(address) {
        const url = `${getFunctionUrl('geocode-address')}?address=${encodeURIComponent(address)}`;
        try {
            const resp = await fetch(url, {
                headers: { 'apikey': SUPABASE_ANON_KEY }
            });
            const data = await resp.json();
            if (data?.found) {
                return {
                    lat: data.lat,
                    lng: data.lng,
                    display: data.display
                };
            }
        } catch (err) { console.warn('Census geocoder failed:', err); }
        return null;
    }

    async function evtGeocodeNominatim(address) {
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(address)}`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const results = await resp.json();
            if (results && results.length > 0) {
                const best = results.find(r => r.class === 'place' || r.class === 'building') || results[0];
                return { lat: parseFloat(best.lat), lng: parseFloat(best.lon), display: best.display_name };
            }
        } catch (err) { console.warn('Nominatim geocoder failed:', err); }
        return null;
    }

    async function evtGeocodeAddress(address) {
        const expanded = evtExpandAddress(address);

        let result = await evtGeocodeCensus(address);
        if (result) return result;

        if (expanded !== address) {
            result = await evtGeocodeCensus(expanded);
            if (result) return result;
        }

        result = await evtGeocodeNominatim(expanded);
        if (result) return result;

        if (expanded !== address) {
            result = await evtGeocodeNominatim(address);
            if (result) return result;
        }

        return null;
    }

    window.evtExpandAddress = evtExpandAddress;
    window.evtGeocodeCensus = evtGeocodeCensus;
    window.evtGeocodeNominatim = evtGeocodeNominatim;
    window.evtGeocodeAddress = evtGeocodeAddress;
})();
