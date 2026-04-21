// js/admin/members/members-invite.js
// Invite flow — Phase 1B: full modal UI + send/refresh.
// Spec: members_001.md §9 (post-invite refresh strategy).
//
// Public API:
//   InviteModal.open()        — opens the modal, focuses email input
//   InviteModal.close()       — closes the modal, resets state
//   InviteModal.send(email)   — calls invite-user edge function + schedules refresh
//   InviteModal.init()        — binds button + form handlers (idempotent)

(function (global) {
    'use strict';

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let _initialized = false;
    let _submitting = false;
    let _lastFocus = null;

    // ── Public ─────────────────────────────────────────────────────────────
    async function send(email) {
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
            return { ok: false, error: 'Please enter a valid email address.' };
        }

        try {
            if (typeof global.callEdgeFunction !== 'function') {
                return { ok: false, error: 'Edge function helper not loaded.' };
            }
            const result = await global.callEdgeFunction('invite-user', { email: cleanEmail });
            _scheduleRefresh();
            return { ok: true, data: result };
        } catch (err) {
            console.error('[members-invite] send failed:', err);
            return { ok: false, error: (err && err.message) || 'Failed to send invitation.' };
        }
    }

    function open() {
        const modal = document.getElementById('inviteModal');
        if (!modal) return;
        _lastFocus = document.activeElement;
        _resetForm();
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const input = document.getElementById('inviteEmail');
        if (input) setTimeout(() => input.focus(), 50);
    }

    function close() {
        const modal = document.getElementById('inviteModal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (_lastFocus && typeof _lastFocus.focus === 'function') {
            try { _lastFocus.focus(); } catch (_) { /* noop */ }
        }
    }

    function init() {
        if (_initialized) return;
        const btn = document.getElementById('inviteBtn');
        const closeBtn = document.getElementById('inviteModalClose');
        const cancelBtn = document.getElementById('inviteCancel');
        const backdrop = document.getElementById('inviteModalBackdrop');
        const form = document.getElementById('inviteForm');
        const modal = document.getElementById('inviteModal');

        if (btn && !btn.hasAttribute('disabled')) {
            btn.addEventListener('click', open);
        }
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (cancelBtn) cancelBtn.addEventListener('click', close);
        if (backdrop) backdrop.addEventListener('click', close);
        if (form) form.addEventListener('submit', _onSubmit);

        // Esc to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                close();
            }
        });

        _initialized = true;
    }

    // ── Internals ──────────────────────────────────────────────────────────
    async function _onSubmit(e) {
        e.preventDefault();
        if (_submitting) return;
        const input = document.getElementById('inviteEmail');
        const errEl = document.getElementById('inviteError');
        const successEl = document.getElementById('inviteSuccess');
        const submitBtn = document.getElementById('inviteSubmit');
        const spinner = document.getElementById('inviteSubmitSpinner');
        const label = document.getElementById('inviteSubmitLabel');

        const email = (input && input.value || '').trim();
        if (!EMAIL_RE.test(email)) {
            _showError('Please enter a valid email address.');
            if (input) input.focus();
            return;
        }

        _submitting = true;
        if (errEl) errEl.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        if (label) label.textContent = 'Sending…';

        const result = await send(email);

        _submitting = false;
        if (spinner) spinner.classList.add('hidden');
        if (label) label.textContent = 'Send Invite';
        if (submitBtn) submitBtn.disabled = false;

        if (!result.ok) {
            _showError(result.error || 'Failed to send invitation.');
            return;
        }

        // Success state
        if (input) input.value = '';
        if (successEl) successEl.classList.remove('hidden');
        setTimeout(close, 1400);
    }

    function _showError(msg) {
        const errEl = document.getElementById('inviteError');
        if (!errEl) return;
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
    }

    function _resetForm() {
        const input = document.getElementById('inviteEmail');
        const errEl = document.getElementById('inviteError');
        const successEl = document.getElementById('inviteSuccess');
        if (input) input.value = '';
        if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
        if (successEl) successEl.classList.add('hidden');
    }

    // Refresh the members list after invite. Trigger creates the profile row
    // asynchronously, so we wait 800ms then retry once at 2s if needed.
    function _scheduleRefresh() {
        const refresh = () => {
            if (global.membersPage && typeof global.membersPage.refresh === 'function') {
                return global.membersPage.refresh();
            }
            return Promise.resolve();
        };
        setTimeout(() => {
            refresh().then(found => {
                if (found === false) setTimeout(refresh, 1200);
            }).catch(err => console.warn('[members-invite] refresh failed:', err));
        }, 800);
    }

    global.InviteModal = { init, open, close, send };
})(window);
