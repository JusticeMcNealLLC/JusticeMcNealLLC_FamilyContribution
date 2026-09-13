// Portal Events — Manage Overview: Hosts strip (§13.12 line 461)
// Per-event co-hosts via event_hosts (moderation-aligned; role = co_host only)

'use strict';

const hostsUi = {
    event: null,
    hosts: [],
    candidates: [],
    search: '',
    loading: false,
    status: '',
};

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}

function setHostsStatus(msg, isError) {
    hostsUi.status = msg || '';
    const el = document.getElementById('emHostsStatus');
    if (!el) return;
    el.textContent = hostsUi.status;
    el.className = isError ? 'text-xs text-red-600 mt-2' : 'text-xs text-gray-500 mt-2';
}

function hostDisplayName(row) {
    const p = row.profiles || {};
    return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
}

function filteredCandidates(event) {
    const q = String(hostsUi.search || '').trim().toLowerCase();
    const hostIds = new Set((hostsUi.hosts || []).map((h) => h.user_id));
    const creatorId = event?.created_by;
    return (hostsUi.candidates || []).filter((m) => {
        if (!m?.id) return false;
        if (hostIds.has(m.id)) return false;
        if (creatorId && m.id === creatorId) return false;
        if (!q) return true;
        const name = `${m.first_name || ''} ${m.last_name || ''}`.trim().toLowerCase();
        return name.includes(q);
    }).slice(0, 12);
}

function renderHostsList() {
    const el = document.getElementById('emHostsList');
    if (!el) return;
    if (hostsUi.loading) {
        el.innerHTML = `<p class="text-xs text-gray-400 italic py-2">Loading hosts…</p>`;
        return;
    }
    const rows = hostsUi.hosts || [];
    if (!rows.length) {
        el.innerHTML = `<p class="text-xs text-gray-400 italic py-2">No co-hosts yet. Add a member below.</p>`;
        return;
    }
    el.innerHTML = rows.map((h) => {
        const name = hostDisplayName(h);
        const role = String(h.role || 'co_host') === 'co_host' ? 'Co-host' : 'Check-in staff';
        return `
            <div class="em-attendee-card" style="align-items:center">
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc(name)}</p>
                    <p class="em-attendee-sub">${esc(role)}</p>
                </div>
                <button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px"
                    data-remove-host="${esc(h.id)}">Remove</button>
            </div>`;
    }).join('');

    el.querySelectorAll('[data-remove-host]').forEach((btn) => {
        btn.addEventListener('click', () => removeHost(btn.getAttribute('data-remove-host')));
    });
}

function renderHostCandidates(event) {
    const el = document.getElementById('emHostsCandidates');
    if (!el) return;
    const rows = filteredCandidates(event);
    if (!String(hostsUi.search || '').trim()) {
        el.innerHTML = `<p class="text-xs text-gray-400 italic py-1">Search members to add as co-host.</p>`;
        return;
    }
    if (!rows.length) {
        el.innerHTML = `<p class="text-xs text-gray-400 italic py-1">No matching members.</p>`;
        return;
    }
    el.innerHTML = rows.map((m) => {
        const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member';
        return `
            <div class="em-attendee-card" style="align-items:center">
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc(name)}</p>
                    <p class="em-attendee-sub">Add as co-host</p>
                </div>
                <button type="button" class="em-btn-primary" style="font-size:11px;padding:6px 9px"
                    data-add-host="${esc(m.id)}">Add</button>
            </div>`;
    }).join('');

    el.querySelectorAll('[data-add-host]').forEach((btn) => {
        btn.addEventListener('click', () => addHost(event, btn.getAttribute('data-add-host')));
    });
}

async function loadHosts(eventId) {
    hostsUi.loading = true;
    renderHostsList();
    try {
        const { data, error } = await supabaseClient
            .from('event_hosts')
            .select('id, user_id, role, created_at, profiles!event_hosts_user_id_fkey(first_name, last_name)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        hostsUi.hosts = data || [];
    } catch (err) {
        console.error('Hosts load failed', err);
        hostsUi.hosts = [];
        setHostsStatus(err.message || 'Could not load hosts.', true);
    } finally {
        hostsUi.loading = false;
        renderHostsList();
    }
}

async function loadHostCandidates() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('is_active', true)
            .order('first_name', { ascending: true })
            .limit(500);
        if (error) throw error;
        hostsUi.candidates = data || [];
    } catch (err) {
        console.error('Host candidates load failed', err);
        hostsUi.candidates = [];
    }
}

async function addHost(event, userId) {
    if (!event?.id || !userId) return;
    const uid = globalThis.evtCurrentUser?.id;
    if (!uid) {
        setHostsStatus('Sign in required to add hosts.', true);
        return;
    }
    setHostsStatus('Adding co-host…');
    try {
        const { error } = await supabaseClient
            .from('event_hosts')
            .insert({
                event_id: event.id,
                user_id: userId,
                role: 'co_host',
                granted_by: uid,
            });
        if (error) {
            const msg = String(error.message || '');
            if (msg.includes('duplicate') || error.code === '23505') {
                throw new Error('That member is already a host on this event.');
            }
            if (msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('permission')) {
                throw new Error('Only the event creator or an Event Coordinator can add hosts.');
            }
            throw error;
        }
        hostsUi.search = '';
        const search = document.getElementById('emHostsSearch');
        if (search) search.value = '';
        setHostsStatus('Co-host added.');
        await loadHosts(event.id);
        renderHostCandidates(event);
    } catch (err) {
        setHostsStatus(err.message || 'Could not add host.', true);
    }
}

async function removeHost(hostRowId) {
    if (!hostRowId) return;
    if (!confirm('Remove this co-host from the event?')) return;
    setHostsStatus('Removing…');
    try {
        const { error } = await supabaseClient
            .from('event_hosts')
            .delete()
            .eq('id', hostRowId);
        if (error) {
            const msg = String(error.message || '').toLowerCase();
            if (msg.includes('policy') || msg.includes('permission')) {
                throw new Error('Only the event creator or an Event Coordinator can remove hosts.');
            }
            throw error;
        }
        setHostsStatus('Co-host removed.');
        const event = hostsUi.event;
        if (event?.id) {
            await loadHosts(event.id);
            renderHostCandidates(event);
        }
    } catch (err) {
        setHostsStatus(err.message || 'Could not remove host.', true);
    }
}

function hostsHtml(event) {
    if (!event?.id) return '';
    return `
        <div class="em-card mt-3" id="emHostsCard">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Team hosts</h3>
                    <p class="em-section-sub">Add co-hosts who can manage this event (aligned with Event Coordinator moderation). Global coordinators already manage all events.</p>
                </div>
            </div>
            <div id="emHostsList"></div>
            <label class="text-xs text-gray-500 block mb-1 mt-3" for="emHostsSearch">Add member</label>
            <input type="search" id="emHostsSearch" placeholder="Search members by name…"
                class="em-input w-full mb-2" style="font-size:16px">
            <div id="emHostsCandidates"></div>
            <p id="emHostsStatus" class="text-xs text-gray-500 mt-2"></p>
        </div>`;
}

function wireHosts(event) {
    if (!event?.id) return;
    hostsUi.event = event;
    hostsUi.search = '';
    hostsUi.status = '';
    setHostsStatus('');

    const search = document.getElementById('emHostsSearch');
    search?.addEventListener('input', () => {
        hostsUi.search = search.value || '';
        renderHostCandidates(event);
    });

    loadHosts(event.id);
    loadHostCandidates().then(() => renderHostCandidates(event));
}

export { hostsHtml, wireHosts };
