// ═══════════════════════════════════════════════════════════
// Portal Events — Live Map (Leaflet.js + Supabase Realtime)
// Opt-in location sharing during event window + 24h
// ═══════════════════════════════════════════════════════════

let evtMapInstance = null;
let evtMapMarkers = {};          // user_id → Leaflet marker
let evtMapRealtimeSub = null;
let evtMapSharingActive = false;
let evtMapWatchId = null;

// ─── Check if Live Map Should Be Available ──────────────

function evtIsMapAvailable(event) {
    if (!event) return false;
    const now = new Date();
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 4 * 60 * 60 * 1000); // default 4h
    const mapEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000); // + 24h

    // Map available from event start to end + 24h
    return now >= start && now <= mapEnd;
}

// ─── Build Map Section HTML ─────────────────────────────

function evtBuildMapHtml(event, hasRsvp, isHost) {
    if (event.event_type !== 'llc') return '';
    if (!hasRsvp && !isHost) return '';
    if (!evtIsMapAvailable(event)) return '';

    return `
        <div class="mt-6 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">📍</span>
                <h4 class="text-sm font-bold text-gray-800">Live Event Map</h4>
            </div>

            <!-- Privacy Banner -->
            <div class="mb-3 p-2.5 bg-white/60 border border-emerald-200 rounded-lg flex items-start gap-2">
                <svg class="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <p class="text-xs text-emerald-700">Location sharing is <strong>opt-in only</strong>. Your position is only visible to other RSVPed members during the event. You can stop sharing at any time.</p>
            </div>

            <!-- Sharing Toggle -->
            <div class="flex items-center justify-between bg-white rounded-xl p-3 mb-3 border border-gray-100">
                <div>
                    <div class="text-sm font-semibold text-gray-800" id="mapSharingLabel">Share My Location</div>
                    <div class="text-xs text-gray-500 mt-0.5" id="mapSharingStatus">Not sharing</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="mapSharingToggle" onchange="evtToggleLocationSharing('${event.id}')" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
            </div>

            <!-- Map Container -->
            <div id="eventMapContainer" class="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                <div class="flex items-center justify-center h-full text-sm text-gray-400">
                    <button onclick="evtInitMap('${event.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                        Open Map
                    </button>
                </div>
            </div>
        </div>`;
}

// ─── Initialize Leaflet Map ─────────────────────────────

async function evtInitMap(eventId) {
    const container = document.getElementById('eventMapContainer');
    if (!container) return;

    // Clear placeholder
    container.innerHTML = '<div id="eventMap" class="w-full h-full"></div>';

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        container.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-red-500">Map library failed to load. Please refresh.</div>';
        return;
    }

    // Initialize map (default center: US center)
    const event = evtAllEvents.find(e => e.id === eventId);
    const defaultCenter = [39.8283, -98.5795];
    const defaultZoom = 4;

    evtMapInstance = L.map('eventMap', {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(evtMapInstance);

    // Load existing locations
    const { data: locations } = await supabaseClient
        .from('event_locations')
        .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
        .eq('event_id', eventId)
        .eq('sharing_active', true);

    if (locations && locations.length > 0) {
        const bounds = [];
        for (const loc of locations) {
            evtAddMapMarker(loc);
            bounds.push([loc.latitude, loc.longitude]);
        }
        if (bounds.length > 0) {
            evtMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
    }

    // Subscribe to Realtime changes
    evtMapRealtimeSub = supabaseClient
        .channel(`event-locations-${eventId}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'event_locations', filter: `event_id=eq.${eventId}` },
            (payload) => evtHandleLocationChange(payload)
        )
        .subscribe();
}

// ─── Add / Update Marker on Map ─────────────────────────

function evtAddMapMarker(loc) {
    if (!evtMapInstance) return;

    const name = loc.profiles
        ? `${loc.profiles.first_name || ''} ${loc.profiles.last_name || ''}`.trim()
        : 'Member';

    const isMe = loc.user_id === evtCurrentUser?.id;
    const initial = (name[0] || '?').toUpperCase();

    // Create custom icon
    const iconHtml = `<div style="
        width:32px;height:32px;border-radius:50%;
        background:${isMe ? '#10b981' : '#6366f1'};
        color:white;display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:13px;border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,.2);
    ">${initial}</div>`;

    const icon = L.divIcon({
        html: iconHtml,
        className: 'event-map-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    // Remove existing marker if update
    if (evtMapMarkers[loc.user_id]) {
        evtMapInstance.removeLayer(evtMapMarkers[loc.user_id]);
    }

    const marker = L.marker([loc.latitude, loc.longitude], { icon })
        .addTo(evtMapInstance)
        .bindPopup(`<strong>${evtEscapeHtml(name)}</strong>${isMe ? ' (you)' : ''}<br><span style="font-size:11px;color:#888">Updated ${new Date(loc.updated_at).toLocaleTimeString()}</span>`);

    evtMapMarkers[loc.user_id] = marker;
}

// ─── Handle Realtime Location Changes ───────────────────

async function evtHandleLocationChange(payload) {
    if (payload.eventType === 'DELETE' || (payload.new && !payload.new.sharing_active)) {
        // Remove marker
        const userId = payload.old?.user_id || payload.new?.user_id;
        if (userId && evtMapMarkers[userId]) {
            evtMapInstance?.removeLayer(evtMapMarkers[userId]);
            delete evtMapMarkers[userId];
        }
        return;
    }

    const loc = payload.new;
    if (!loc || !loc.sharing_active) return;

    // Fetch profile info for new marker
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, profile_picture_url')
        .eq('id', loc.user_id)
        .single();

    evtAddMapMarker({ ...loc, profiles: profile });
}

// ─── Toggle Location Sharing ────────────────────────────

async function evtToggleLocationSharing(eventId) {
    const toggle = document.getElementById('mapSharingToggle');
    const statusEl = document.getElementById('mapSharingStatus');

    if (toggle.checked) {
        // Start sharing
        if (!('geolocation' in navigator)) {
            alert('Geolocation is not supported by your browser.');
            toggle.checked = false;
            return;
        }

        try {
            // Request permission
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                });
            });

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // Upsert location
            const { error } = await supabaseClient
                .from('event_locations')
                .upsert({
                    event_id: eventId,
                    user_id: evtCurrentUser.id,
                    latitude: lat,
                    longitude: lng,
                    sharing_active: true,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'event_id,user_id' });

            if (error) throw error;

            evtMapSharingActive = true;
            statusEl.textContent = 'Sharing your location';
            statusEl.classList.add('text-emerald-600');
            statusEl.classList.remove('text-gray-500');

            // Center map on user
            if (evtMapInstance) {
                evtMapInstance.setView([lat, lng], 15);
            }

            // Start watching position
            evtMapWatchId = navigator.geolocation.watchPosition(
                (newPos) => evtUpdateMyLocation(eventId, newPos),
                (err) => console.warn('Watch error:', err),
                { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
            );
        } catch (err) {
            console.error('Location sharing error:', err);
            toggle.checked = false;
            if (err.code === 1) {
                alert('Location permission denied. Please allow location access in your browser settings.');
            } else {
                alert(`Could not get your location: ${err.message}`);
            }
        }
    } else {
        // Stop sharing
        evtMapSharingActive = false;

        if (evtMapWatchId !== null) {
            navigator.geolocation.clearWatch(evtMapWatchId);
            evtMapWatchId = null;
        }

        // Mark inactive in DB
        await supabaseClient
            .from('event_locations')
            .update({ sharing_active: false, updated_at: new Date().toISOString() })
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id);

        statusEl.textContent = 'Not sharing';
        statusEl.classList.remove('text-emerald-600');
        statusEl.classList.add('text-gray-500');
    }
}

// ─── Update My Location (from watchPosition) ───────────

async function evtUpdateMyLocation(eventId, pos) {
    if (!evtMapSharingActive) return;

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    await supabaseClient
        .from('event_locations')
        .upsert({
            event_id: eventId,
            user_id: evtCurrentUser.id,
            latitude: lat,
            longitude: lng,
            sharing_active: true,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'event_id,user_id' });
}

// ─── Cleanup Map Resources ──────────────────────────────

function evtCleanupMap() {
    // Stop watching
    if (evtMapWatchId !== null) {
        navigator.geolocation.clearWatch(evtMapWatchId);
        evtMapWatchId = null;
    }

    // Unsubscribe from realtime
    if (evtMapRealtimeSub) {
        supabaseClient.removeChannel(evtMapRealtimeSub);
        evtMapRealtimeSub = null;
    }

    // Destroy map
    if (evtMapInstance) {
        evtMapInstance.remove();
        evtMapInstance = null;
    }

    evtMapMarkers = {};
    evtMapSharingActive = false;
}
