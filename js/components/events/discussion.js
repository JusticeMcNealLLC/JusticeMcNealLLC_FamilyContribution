/* ════════════════════════════════════════════════════════════
   Event discussion: iMessage-style pane + full-height sheet.
   Surface: window.EventsDiscussion
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const ROOT_ID = 'edDiscussRoot';
    let home = null;

    function commentsList(scope) {
        return (scope || document).querySelector('.ed-comments-list');
    }

    function scrollToLatest(list) {
        const el = list || commentsList(document);
        if (!el) return;
        requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight;
        });
    }

    function isRsvpOpen() {
        return document.getElementById('erSheet')?.getAttribute('aria-hidden') === 'false';
    }

    function ensureRoot() {
        if (document.getElementById(ROOT_ID)) return;
        const root = document.createElement('div');
        root.id = ROOT_ID;
        root.innerHTML = `
            <div id="edDiscussBackdrop" class="ed-discuss-backdrop"></div>
            <div id="edDiscussSheet" class="ed-discuss-sheet" aria-hidden="true">
                <div id="edDiscussPanel" class="ed-discuss-panel" role="dialog" aria-modal="true" aria-labelledby="edDiscussTitle">
                    <header class="ed-discuss-sheet-head">
                        <div>
                            <p class="ed-discuss-kicker">Event</p>
                            <h2 class="ed-discuss-title" id="edDiscussTitle">Discussion</h2>
                        </div>
                        <button type="button" id="edDiscussClose" class="er-icon-btn" aria-label="Close discussion">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </header>
                    <div id="edDiscussSheetMount" class="ed-discuss-sheet-mount"></div>
                </div>
            </div>`;
        document.body.appendChild(root);
        document.getElementById('edDiscussBackdrop')?.addEventListener('click', close);
        document.getElementById('edDiscussClose')?.addEventListener('click', close);
    }

    function setExpanded(section, on) {
        const btn = section?.querySelector('[data-discuss-open]');
        if (!btn) return;
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        btn.textContent = on ? 'Close' : 'Open';
    }

    function open(section) {
        if (!section) return;
        ensureRoot();
        const body = section.querySelector('.ed-discuss-body');
        const mount = document.getElementById('edDiscussSheetMount');
        if (!body || !mount) return;
        if (home && home.section !== section) close();
        if (body.parentElement === mount) return;

        const placeholder = document.createElement('div');
        placeholder.className = 'ed-discuss-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.style.height = Math.max(body.offsetHeight, 1) + 'px';
        body.after(placeholder);
        mount.appendChild(body);
        home = { section, placeholder };

        document.getElementById('edDiscussBackdrop')?.classList.add('is-open');
        document.getElementById('edDiscussPanel')?.classList.add('is-open');
        document.getElementById('edDiscussSheet')?.setAttribute('aria-hidden', 'false');
        document.body.classList.add('ed-discuss-open');
        setExpanded(section, true);
        scrollToLatest(commentsList(mount));
    }

    function close() {
        const mount = document.getElementById('edDiscussSheetMount');
        const body = mount?.querySelector('.ed-discuss-body');
        const section = home?.section;
        if (home && body && home.placeholder?.parentNode) {
            home.placeholder.replaceWith(body);
        } else if (home && body && section && !section.querySelector('.ed-discuss-body')) {
            section.appendChild(body);
        }
        home = null;

        document.getElementById('edDiscussBackdrop')?.classList.remove('is-open');
        document.getElementById('edDiscussPanel')?.classList.remove('is-open');
        document.getElementById('edDiscussSheet')?.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('ed-discuss-open');
        setExpanded(section, false);
        scrollToLatest(section && commentsList(section));
    }

    function wire(section) {
        if (!section) return;
        if (section.dataset.discussWired === '1') {
            scrollToLatest(commentsList(document.getElementById('edDiscussSheetMount')) || commentsList(section));
            return;
        }
        section.dataset.discussWired = '1';
        const btn = section.querySelector('[data-discuss-open]');
        btn?.addEventListener('click', () => {
            if (home && home.section === section) close();
            else open(section);
        });
        scrollToLatest(commentsList(section));
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !home || isRsvpOpen()) return;
        close();
    });

    window.EventsDiscussion = { open, close, wire, scrollToLatest };
})();
