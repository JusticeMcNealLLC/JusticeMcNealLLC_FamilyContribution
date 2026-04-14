/* ─────────────────────────────────────────────────────────────────────────
 * nav.js  —  Side Navigation
 * Builds a sticky left-sidebar nav and injects it into #nav-placeholder.
 *
 * Body data attributes drive the build:
 *   data-page-type   = "portal" | "admin"
 *   data-active-page = "dashboard" | "feed" | "quests" | "events" | ...
 *
 * Styling: Tailwind utility classes (inline) + nav.css for admin hover
 * states and scrollbar suppression.
 * ───────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ─── Page context ───────────────────────────────────────────────────── */
  var body     = document.body;
  var pageType = (body.dataset.pageType   || 'portal').trim();
  var active   = (body.dataset.activePage || '').trim();
  var isAdmin  = pageType === 'admin';
  var userName = (body.dataset.userName || 'Justin').trim();

  /* Base paths so the same nav.js works from any directory depth */
  var portalBase = isAdmin ? '../portal/' : '';
  var adminBase  = isAdmin ? ''           : '../admin/';

  /* ─── SVG icon paths ─────────────────────────────────────────────────── */
  var I = {
    dashboard:   '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
    feed:        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>',
    quests:      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    events:      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
    investments: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>',
    milestones:  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>',
    contribute:  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>',
    deposit:     '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
    history:     '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    familyTree:  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>',
    team:        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
    finances:    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>',
    settings:    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
    adminHub:    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>',
    invite:      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>',
    chevron:     '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>',
    signOut:     '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>',
    swap:        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4"/>',
    profile:     '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
  };

  /* ─── Portal nav link (light sidebar) ───────────────────────────────── */
  function pLink(href, label, iconKey, pageKey) {
    var on   = pageKey === active;
    var wrap = on
      ? 'flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-600 border-l-[3px] border-blue-500 transition-colors'
      : 'flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm text-gray-600 border-l-[3px] border-transparent hover:bg-gray-50 hover:text-gray-900 transition-colors';
    var iconCls = on ? 'text-blue-500' : 'text-gray-400';
    return (
      '<a href="' + href + '" class="' + wrap + '">' +
        '<svg class="w-5 h-5 flex-shrink-0 ' + iconCls + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          I[iconKey] +
        '</svg>' +
        '<span>' + label + '</span>' +
      '</a>'
    );
  }

  /* ─── Admin nav link (dark sidebar) ─────────────────────────────────── */
  function aLink(href, label, iconKey, pageKey) {
    var on   = pageKey === active;
    var wrap = on
      ? 'nav-admin-link-active flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm font-medium text-white transition-colors'
      : 'nav-admin-link flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm transition-colors';
    var iconCls = on ? 'text-blue-300' : 'text-slate-400';
    return (
      '<a href="' + href + '" class="' + wrap + '">' +
        '<svg class="w-5 h-5 flex-shrink-0 ' + iconCls + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          I[iconKey] +
        '</svg>' +
        '<span>' + label + '</span>' +
      '</a>'
    );
  }

  /* ─── Avatar placeholder (swap svg for <img> when auth is wired) ──── */
  var avatar =
    '<svg width="36" height="36" viewBox="0 0 36 36" fill="none">' +
      '<circle cx="18" cy="18" r="18" fill="#1a3a5c"/>' +
      '<circle cx="18" cy="13" r="6" fill="#3a6a9c"/>' +
      '<ellipse cx="18" cy="28" rx="11" ry="8" fill="#3a6a9c"/>' +
    '</svg>';



  /* ===========================================================================
   *  PORTAL SIDEBAR  (white / light theme)
   * =========================================================================== */
  var navHTML = '';

  if (!isAdmin) {

    /* Open More section automatically if the active page lives inside it */
    var morePages = ['investments','milestones','contribute','deposit','history','family-tree','team','finances','settings'];
    var moreOpen  = morePages.indexOf(active) !== -1;

    var moreLinks =
      pLink(portalBase + 'investments.html',   'Investments', 'investments', 'investments') +
      pLink(portalBase + 'milestones.html',    'Milestones',  'milestones',  'milestones')  +
      pLink(portalBase + 'contribution.html',  'Contribute',  'contribute',  'contribute')  +
      pLink(portalBase + 'extra-deposit.html', 'Deposit',     'deposit',     'deposit')     +
      pLink(portalBase + 'history.html',       'History',     'history',     'history')     +
      pLink(portalBase + 'family-tree.html',   'Family Tree', 'familyTree',  'family-tree') +
      pLink(portalBase + 'team.html',          'Team',        'team',        'team')        +
      pLink(portalBase + 'my-finances.html',   'My Finances', 'finances',    'finances')    +
      pLink(portalBase + 'settings.html',      'Settings',    'settings',    'settings');

    navHTML =
    '<nav id="sideNav" class="hidden md:flex flex-col w-64 flex-shrink-0 bg-white border-r border-gray-200/80 h-screen sticky top-0">' +

      /* Logo */
      '<div class="flex justify-center px-4 pt-7 pb-2">' +
        '<a href="' + portalBase + 'dashboard.html"' +
           ' class="w-16 h-16 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow select-none"' +
           ' style="background:linear-gradient(135deg,#1b6fe8,#1558c0);"' +
           ' title="Dashboard">' +
          '<span class="text-white font-bold text-sm tracking-wider">LOGO</span>' +
        '</a>' +
      '</div>' +

      /* Site label */
      '<div class="text-center pb-5">' +
        '<p class="text-sm font-bold text-gray-800">Justice McNeal</p>' +
        '<p class="text-xs text-gray-400 mt-0.5">Family Portal</p>' +
      '</div>' +

      /* Primary links + More accordion */
      '<div class="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">' +

        pLink(portalBase + 'dashboard.html', 'Dashboard', 'dashboard', 'dashboard') +
        pLink(portalBase + 'feed.html',      'Feed',      'feed',      'feed')      +
        pLink(portalBase + 'quests.html',    'Quests',    'quests',    'quests')    +
        pLink(portalBase + 'events.html',    'Events',    'events',    'events')    +

        /* More accordion */
        '<div class="pt-2">' +
          '<button id="navMoreBtn"' +
                  ' aria-expanded="' + (moreOpen ? 'true' : 'false') + '"' +
                  ' class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">' +
            '<span class="flex items-center gap-2">More' +
              (moreOpen ? '<span class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>' : '') +
            '</span>' +
            '<svg id="navMoreChev"' +
                 ' class="w-4 h-4 transition-transform ' + (moreOpen ? 'rotate-180' : '') + '"' +
                 ' fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
              I.chevron +
            '</svg>' +
          '</button>' +
          '<div id="navMoreContent" class="mt-0.5 space-y-0.5 pl-1 ' + (moreOpen ? '' : 'hidden') + '">' +
            moreLinks +
          '</div>' +
        '</div>' +

        /* Admin View — visual placeholder, logic wired separately */
        '<div class="pt-4">' +
          '<div class="border-t border-gray-100 mb-3"></div>' +
          '<a href="' + adminBase + 'index.html"' +
             ' class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">' +
            '<svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.swap + '</svg>' +
            '<span>Admin View</span>' +
          '</a>' +
        '</div>' +

      '</div>' +

      /* Profile */
      '<div class="border-t border-gray-100 px-3 py-3">' +
        '<div id="navProfileWrap">' +
          '<div id="navProfileDrop" class="nav-profile-expand">' +
            '<div class="pb-1 space-y-0.5">' +
              '<a href="' + portalBase + 'profile.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">' +
                '<svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.profile + '</svg>' +
                '<span>My Profile</span>' +
              '</a>' +
              '<a href="' + portalBase + 'settings.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">' +
                '<svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.settings + '</svg>' +
                '<span>Settings</span>' +
              '</a>' +
              '<div class="border-t border-gray-100 my-1"></div>' +
              '<button id="navSignOutBtn" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors">' +
                '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.signOut + '</svg>' +
                '<span>Sign out</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<button id="navProfileBtn" aria-expanded="false" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">' +
            '<div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style="box-shadow:0 0 0 2px #bfdbfe;">' +
              avatar +
            '</div>' +
            '<span class="flex-1 text-left text-sm font-semibold text-gray-800">' + userName + '</span>' +
            '<svg id="navProfileChev" class="w-4 h-4 text-gray-400 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.chevron + '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

    '</nav>';

  } else {
    /* ===========================================================================
     *  ADMIN SIDEBAR  (slate-900 dark theme)
     * =========================================================================== */
    navHTML =
    '<nav id="sideNav" class="hidden md:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 nav-admin-sidebar" style="background:#0f172a;">' +

      /* Header */
      '<div class="px-4 pt-6 pb-4">' +
        '<div class="flex items-center gap-3">' +
          '<a href="index.html"' +
             ' class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md select-none"' +
             ' style="background:linear-gradient(135deg,#1b6fe8,#1558c0);"' +
             ' title="Admin Hub">' +
            '<span class="text-white font-bold text-xs tracking-wide">LOGO</span>' +
          '</a>' +
          '<div>' +
            '<p class="text-white font-bold text-sm leading-tight">Justice McNeal</p>' +
            '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5"' +
                  ' style="background:rgba(59,130,246,0.22);color:#93c5fd;">Admin</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="mx-4 border-t mb-4" style="border-color:rgba(255,255,255,0.08);"></div>' +

      /* Admin links */
      '<div class="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">' +

        aLink('index.html',  'Admin Hub',     'adminHub', 'hub')    +
        aLink('invite.html', 'Invite Member', 'invite',   'invite') +

        /* Switch to Portal */
        '<div class="pt-4">' +
          '<div class="border-t mb-3" style="border-color:rgba(255,255,255,0.08);"></div>' +
          '<a href="' + portalBase + 'dashboard.html"' +
             ' class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
            '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.swap + '</svg>' +
            '<span>Switch to Portal</span>' +
          '</a>' +
        '</div>' +

      '</div>' +

      /* Admin profile */
      '<div class="px-3 pb-4" style="border-top:1px solid rgba(255,255,255,0.08);">' +
        '<div class="pt-3" id="navProfileWrap">' +
          '<div id="navProfileDrop" class="nav-profile-expand">' +
            '<div class="pb-1 space-y-0.5">' +
              '<a href="' + portalBase + 'profile.html" class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.profile + '</svg>' +
                '<span>My Profile</span>' +
              '</a>' +
              '<a href="' + portalBase + 'settings.html" class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.settings + '</svg>' +
                '<span>Settings</span>' +
              '</a>' +
              '<div class="border-t my-1" style="border-color:rgba(255,255,255,0.08);"></div>' +
              '<button id="navSignOutBtn" class="nav-admin-signout w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.signOut + '</svg>' +
                '<span>Sign out</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<button id="navProfileBtn" aria-expanded="false" class="nav-admin-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors">' +
            '<div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style="box-shadow:0 0 0 2px rgba(255,255,255,0.2);">' +
              avatar +
            '</div>' +
            '<span class="flex-1 text-left text-sm font-semibold text-slate-200">' + userName + '</span>' +
            '<svg id="navProfileChev" class="w-4 h-4 text-slate-500 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + I.chevron + '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

    '</nav>';
  }

  /* ─── Inject into #nav-placeholder ──────────────────────────────────── */
  var placeholder = document.getElementById('nav-placeholder');
  if (placeholder) {
    placeholder.outerHTML = navHTML;
  }

  /* ─── More accordion ─────────────────────────────────────────────────── */
  var moreBtn     = document.getElementById('navMoreBtn');
  var moreContent = document.getElementById('navMoreContent');
  var moreChev    = document.getElementById('navMoreChev');

  if (moreBtn && moreContent) {
    moreBtn.addEventListener('click', function () {
      var opening = moreContent.classList.contains('hidden');
      moreContent.classList.toggle('hidden', !opening);
      if (moreChev) moreChev.classList.toggle('rotate-180', opening);
      moreBtn.setAttribute('aria-expanded', String(opening));
      if (opening && profileDropEl && profileDropEl.classList.contains('nav-profile-open')) {
        profileDropEl.classList.remove('nav-profile-open');
        if (profileChev) profileChev.classList.remove('rotate-180');
        if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ─── Profile dropdown ───────────────────────────────────────────────── */
  var profileBtn    = document.getElementById('navProfileBtn');
  var profileDropEl = document.getElementById('navProfileDrop');
  var profileChev   = document.getElementById('navProfileChev');

  if (profileBtn && profileDropEl) {
    profileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var opening = !profileDropEl.classList.contains('nav-profile-open');
      profileDropEl.classList.toggle('nav-profile-open', opening);
      if (profileChev) profileChev.classList.toggle('rotate-180', opening);
      profileBtn.setAttribute('aria-expanded', String(opening));
      if (opening && moreContent && !moreContent.classList.contains('hidden')) {
        moreContent.classList.add('hidden');
        if (moreChev) moreChev.classList.remove('rotate-180');
        if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

})();
