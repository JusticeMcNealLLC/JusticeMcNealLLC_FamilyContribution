/* ════════════════════════════════════════════════════════════
   Portal Events — Detail data context loader (Phase 5H.1)
   Classic IIFE; loads after detail/fragments.js, before detail.js.
   Fetches Supabase data and derived flags for globalThis.evtOpenDetail().
   ════════════════════════════════════════════════════════════ */

'use strict';

async function evtLoadDetailContext(eventId) {
    const events = window.evtAllEvents || globalThis.evtAllEvents;
    const rsvpMap = window.evtAllRsvps || globalThis.evtAllRsvps;
    const event = events.find(e => e.id === eventId);
    if (!event) return null;

    const rsvp = rsvpMap[eventId];
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : null;
    const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endTimeStr = end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    const typeColors = (window.EventsConstants && window.EventsConstants.TYPE_COLORS_PORTAL) || {};
    const tc = typeColors[event.event_type] || typeColors.member;
    const isLlc = event.event_type === 'llc';
    const isComp = event.event_type === 'competition';

    const [{ data: rsvps }, { data: guestRsvps }] = await Promise.all([
        supabaseClient
            .from('event_rsvps')
            .select('user_id, status, paid, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId),
        supabaseClient
            .from('event_guest_rsvps')
            .select('id, guest_name, guest_email, status, paid')
            .eq('event_id', eventId),
    ]);
    const goingList = (rsvps || []).filter(r => (typeof globalThis.evtIsGoingRsvp === 'function' ? window.evtIsGoingRsvp(r) : (r.status === 'going' || r.paid === true)));
    const maybeList = (rsvps || []).filter(r => r.status === 'maybe');
    const notGoingList = (rsvps || []).filter(r => r.status === 'not_going');
    const guestGoingList = (guestRsvps || []).filter(g => g.status === 'going' || g.paid === true);

    const { data: checkins, count: checkinCount } = await supabaseClient
        .from('event_checkins')
        .select('user_id, profiles!event_checkins_user_id_fkey(first_name, last_name, profile_picture_url)', { count: 'exact' })
        .eq('event_id', eventId);

    let costItems = [];
    if (isLlc) {
        const { data: ci } = await supabaseClient
            .from('event_cost_items')
            .select('*')
            .eq('event_id', eventId)
            .order('sort_order', { ascending: true });
        costItems = ci || [];
    }

    let waitlist = [];
    let myWaitlistEntry = null;
    if (isLlc) {
        const { data: wl } = await supabaseClient
            .from('event_waitlist')
            .select('*, profiles:user_id(first_name, last_name)')
            .eq('event_id', eventId)
            .order('position', { ascending: true });
        waitlist = wl || [];
        myWaitlistEntry = waitlist.find(w => w.user_id === globalThis.evtCurrentUser.id);
    }

    let raffleEntryCount = 0;
    let myRaffleEntry = null;
    let raffleWinners = [];
    if (event.raffle_enabled) {
        const { count: rCount } = await supabaseClient
            .from('event_raffle_entries')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId);
        raffleEntryCount = rCount || 0;
        const { data: myEntry } = await supabaseClient
            .from('event_raffle_entries')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', globalThis.evtCurrentUser.id)
            .maybeSingle();
        myRaffleEntry = myEntry;
        const { data: winners } = await supabaseClient
            .from('event_raffle_winners')
            .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId)
            .order('place', { ascending: true });
        raffleWinners = winners || [];
    }

    const isCreator = event.created_by === globalThis.evtCurrentUser.id;
    const { data: hostRecord } = await supabaseClient
        .from('event_hosts')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', globalThis.evtCurrentUser.id)
        .maybeSingle();
    const canManageEvent = isCreator || !!hostRecord || (typeof canManageEvents === 'function' && canManageEvents());
    const canAccessTeamHub = canManageEvent || (typeof canAccessAdminDashboard === 'function' && canAccessAdminDashboard());
    const isHost = canManageEvent;
    const canCreateTeamChat = isCreator || (typeof canManageEvents === 'function' && canManageEvents());

    let creatorProfile = (event.creator && event.creator.id) ? { ...event.creator } : null;
    if (event.created_by) {
        const { data: cp } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url, displayed_badge, title, bio')
            .eq('id', event.created_by)
            .maybeSingle();
        if (cp) creatorProfile = { ...(creatorProfile || {}), ...cp };
        else if (!creatorProfile) {
            creatorProfile = {
                id: event.created_by,
                first_name: '',
                last_name: '',
                profile_picture_url: null,
                displayed_badge: null,
                title: 'Member',
                bio: null,
            };
        }
    }
    const cpName = creatorProfile ? ([creatorProfile.first_name, creatorProfile.last_name].filter(Boolean).join(' ') || 'Member') : '';
    const cpInitials = creatorProfile ? ((creatorProfile.first_name || '?')[0] + (creatorProfile.last_name || '')[0]).toUpperCase() : '';
    const cpBadge = creatorProfile ? evtBadgeChip(creatorProfile.displayed_badge) : '';
    const cpTitle = creatorProfile ? (creatorProfile.title || 'Member') : '';

    const memberGoing = typeof globalThis.evtIsGoingRsvp === 'function' ? window.evtIsGoingRsvp(rsvp) : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
    const hasRsvp = rsvp && (memberGoing || rsvp.status === 'maybe');
    const documentsHtml = await evtBuildDocumentsHtml(event, isHost, hasRsvp);
    const mapHtml = evtBuildMapHtml(event, hasRsvp, isHost);
    const competitionHtml = isComp ? await evtBuildCompetitionHtml(event, isHost) : '';
    const scrapbookHtml = await evtBuildScrapbookHtml(event, !!hasRsvp);

    const showTime = !event.gate_time || hasRsvp || isHost;
    const showLocation = !event.gate_location || hasRsvp || isHost;
    const showNotes = !event.gate_notes || hasRsvp || isHost;

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    const entriesClosed = isClosed || isPast || deadlinePassed;
    const rsvpEnabled = event.rsvp_enabled !== false;
    const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status) && !entriesClosed;
    const eventIsFull = isLlc && event.max_participants && goingList.length >= event.max_participants;

    return {
        eventId,
        event,
        rsvp,
        start,
        dateStr,
        timeStr,
        endTimeStr,
        tc,
        isLlc,
        isComp,
        goingList,
        maybeList,
        notGoingList,
        guestGoingList,
        checkins,
        checkinCount,
        costItems,
        waitlist,
        myWaitlistEntry,
        raffleEntryCount,
        myRaffleEntry,
        raffleWinners,
        isCreator,
        canManageEvent,
        canAccessTeamHub,
        isHost,
        canCreateTeamChat,
        creatorProfile,
        cpName,
        cpInitials,
        cpBadge,
        cpTitle,
        memberGoing,
        hasRsvp,
        documentsHtml,
        mapHtml,
        competitionHtml,
        scrapbookHtml,
        showTime,
        showLocation,
        showNotes,
        isClosed,
        isPast,
        deadlinePassed,
        entriesClosed,
        rsvpEnabled,
        canRsvp,
        eventIsFull,
    };
}

globalThis.evtLoadDetailContext = evtLoadDetailContext;
export const detailDataApi = {
    loadContext: evtLoadDetailContext,
};

const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.detail = PortalEvents.detail || {};
PortalEvents.detail.data = detailDataApi;
