// Portal Events — Legacy create: location validation (Phase 5M.1.5)
(function () {
    'use strict';

    window._evtLocGeoCache = null;
    let _evtLocDebounce = null;

    function evtSetLocationIcon(state) {
        const wrap    = document.getElementById('locationIcon');
        const spinner = document.getElementById('locIconSpinner');
        const check   = document.getElementById('locIconCheck');
        const warn    = document.getElementById('locIconWarn');
        if (!wrap) return;

        spinner.classList.add('hidden');
        check.classList.add('hidden');
        warn.classList.add('hidden');

        if (state === 'hide') { wrap.classList.add('hidden'); return; }
        wrap.classList.remove('hidden');
        if (state === 'spin')  spinner.classList.remove('hidden');
        if (state === 'check') check.classList.remove('hidden');
        if (state === 'warn')  warn.classList.remove('hidden');
    }

    function evtSetLocationStatus(text, color) {
        const el = document.getElementById('locationStatus');
        if (!el) return;
        if (!text) { el.classList.add('hidden'); el.textContent = ''; return; }
        el.textContent = text;
        el.className = `text-xs mt-1 ${color}`;
        el.classList.remove('hidden');
    }

    async function evtValidateLocation() {
        const input = document.getElementById('eventLocation');
        const address = input ? input.value.trim() : '';

        if (!address) {
            window._evtLocGeoCache = null;
            evtSetLocationIcon('hide');
            evtSetLocationStatus('', '');
            return;
        }

        if (window._evtLocGeoCache && window._evtLocGeoCache.address === address) return;

        evtSetLocationIcon('spin');
        evtSetLocationStatus('Validating address…', 'text-gray-400');

        const result = await window.evtGeocodeAddress(address);

        const current = input.value.trim();
        if (current !== address) return;

        window._evtLocGeoCache = { address, result };

        if (result) {
            evtSetLocationIcon('check');
            evtSetLocationStatus(`✓ ${result.display}`, 'text-green-600');
        } else {
            evtSetLocationIcon('warn');
            evtSetLocationStatus('Address not found — event will have no map pin', 'text-amber-600');
        }
    }

    function evtInitLocationValidation() {
        const input = document.getElementById('eventLocation');
        if (!input) return;

        input.addEventListener('input', () => {
            clearTimeout(_evtLocDebounce);
            _evtLocDebounce = setTimeout(evtValidateLocation, 800);
        });

        input.addEventListener('blur', () => {
            clearTimeout(_evtLocDebounce);
            evtValidateLocation();
        });
    }

    window.evtSetLocationIcon = evtSetLocationIcon;
    window.evtSetLocationStatus = evtSetLocationStatus;
    window.evtValidateLocation = evtValidateLocation;
    window.evtInitLocationValidation = evtInitLocationValidation;
})();
