// Portal Events — Legacy create: preview (Phase 5M.1.5)

'use strict';

import { evtDataAction } from '../core/actions.js';


function evtHandlePreview() {
    const title = document.getElementById('eventTitle').value.trim() || 'Untitled Event';
    const desc = document.getElementById('eventDescription').value.trim() || 'No description yet.';
    const start = document.getElementById('eventStart').value;
    const location = document.getElementById('eventLocation').value.trim();
    const dateStr = start ? new Date(start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
    const timeStr = start ? new Date(start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD';

    const bannerBg = globalThis.evtBannerFile
        ? `background-image:url('${URL.createObjectURL(globalThis.evtBannerFile)}');background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg,#6366f1,#8b5cf6);`;

    const gateTime = document.getElementById('gateTime').checked;
    const gateLocation = document.getElementById('gateLocation').checked;

    document.getElementById('eventsDetailView').innerHTML = `
    <div class="relative" style="${bannerBg} min-height:280px;">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none"></div>
        <div class="absolute top-0 left-0" style="padding-top:max(1rem, env(safe-area-inset-top)); padding-left:1rem;">
            <button ${evtDataAction('evtClosePreview')} class="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 hover:bg-black/50 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back to Editor
            </button>
        </div>
        <div class="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div class="mb-2"><span class="type-tag bg-amber-100 text-amber-700">PREVIEW</span></div>
            <h2 class="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">${evtEscapeHtml(title)}</h2>
        </div>
    </div>
    <div class="p-5 sm:p-6">
        <div class="mt-4 space-y-2 text-gray-600">
            <div class="flex items-center gap-2.5">
                <svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="text-lg font-bold text-gray-900">${dateStr}</span>
            </div>
            ${!gateTime ? `<div class="flex items-center gap-2.5 ml-[30px]"><span class="text-base font-semibold text-gray-700">${timeStr}</span></div>` : '<div class="flex items-center gap-2 text-gray-400 italic text-sm"><svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Time revealed after RSVP</span></div>'}
            ${location && !gateLocation ? `<div class="flex items-center gap-2.5 mt-1"><svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><span class="text-base font-semibold text-gray-700">${evtEscapeHtml(location)}</span></div>` : location && gateLocation ? '<div class="flex items-center gap-2 text-gray-400 italic text-sm"><svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Location revealed after RSVP</span></div>' : ''}
        </div>
        <div class="mt-5"><p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">${evtEscapeHtml(desc)}</p></div>
        <div class="mt-6 p-4 bg-amber-50 rounded-xl text-center">
            <p class="text-sm text-amber-700 font-semibold">This is a preview — the event is not published yet.</p>
        </div>
    </div>
`;
    globalThis.evtToggleModal('createModal', false);
    document.getElementById('eventsListView')?.classList.add('hidden');
    document.getElementById('eventsDetailView')?.classList.remove('hidden');
}

function evtClosePreview() {
    document.getElementById('eventsDetailView').innerHTML = '';
    document.getElementById('eventsDetailView')?.classList.add('hidden');
    document.getElementById('eventsListView')?.classList.remove('hidden');
    globalThis.evtToggleModal('createModal', true);
}

import { publishGlobals } from '../compat/publish-globals.js';
publishGlobals({ evtHandlePreview, evtClosePreview });
export { evtHandlePreview, evtClosePreview };
