import { SVG, ADMIN_ICONS } from '../state/icons.js';
import { svgPath } from '../utils/svgPath.js';
import { aLink, adminSection } from './links.js';

export function buildAdminSidebar(active) {
    return (
        '<nav id="sideNav" class="hidden md:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 z-30" style="background:#0f172a;">' +
            '<div class="px-4 pt-6 pb-4">' +
                '<div class="flex items-center gap-3">' +
                    '<a href="index.html" class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md select-none bg-gradient-to-br from-brand-500 to-brand-700 overflow-hidden" title="Admin Hub" data-brand-logo>' +
                        '<span class="text-white font-bold text-xs tracking-wide" data-brand-fallback>JM</span>' +
                        '<img class="w-full h-full object-contain hidden" alt="Logo" data-brand-img>' +
                    '</a>' +
                    '<div>' +
                        '<p class="text-white font-bold text-sm leading-tight">Justice McNeal</p>' +
                        '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5" style="background:rgba(99,102,241,0.22);color:#a5b4fc;">Admin</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="mx-4 border-t mb-2" style="border-color:rgba(255,255,255,0.08);"></div>' +
            '<div class="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4 sidenav-scroll">' +
                aLink('index.html', 'Admin Hub', SVG.hub, 'hub', active) +
                adminSection('People') +
                aLink('members.html', 'Members', SVG.team, 'members', active) +
                aLink('invite.html', 'Invite', SVG.invite, 'invite', active) +
                aLink('family-approvals.html', 'Approvals', SVG.heart, 'family-approvals', active) +
                aLink('roles.html', 'Roles', ADMIN_ICONS.shield, 'roles', active) +
                adminSection('Finance') +
                aLink('deposits.html', 'Deposits', SVG.deposit, 'deposits', active) +
                aLink('transactions.html', 'Transactions', SVG.history, 'transactions', active) +
                aLink('payouts.html', 'Payouts', SVG.wallet, 'payouts', active) +
                aLink('profits.html', 'Profits', SVG.invest, 'profits', active) +
                aLink('expenses.html', 'Expenses', ADMIN_ICONS.banknote, 'expenses', active) +
                aLink('tax-prep.html', 'Tax Prep', ADMIN_ICONS.calculator, 'tax-prep', active) +
                adminSection('Content') +
                aLink('investments.html', 'Investments', SVG.invest, 'investments', active) +
                aLink('events.html', 'Events', ADMIN_ICONS.calendar, 'events', active) +
                aLink('quests.html', 'Quests', SVG.quest, 'quests', active) +
                aLink('notifications.html', 'Notifications', SVG.bell, 'notifications', active) +
                adminSection('Design') +
                aLink('brand.html', 'Brand', ADMIN_ICONS.paint, 'brand', active) +
                aLink('banners.html', 'Banners', ADMIN_ICONS.flag, 'banners', active) +
                aLink('documents.html', 'Documents', ADMIN_ICONS.doc, 'documents', active) +
                '<div class="pt-4">' +
                    '<div class="border-t mb-3" style="border-color:rgba(255,255,255,0.08);"></div>' +
                    '<a href="/pages/portal/index.html" class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                        '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(ADMIN_ICONS.swap) + '</svg>' +
                        '<span>Switch to Portal</span>' +
                    '</a>' +
                '</div>' +
            '</div>' +
            '<div id="navProfileSection" class="hidden px-3 pb-4" style="border-top:1px solid rgba(255,255,255,0.08);">' +
                '<div class="pt-3" id="navProfileWrap">' +
                    '<div id="navProfileDrop" class="nav-profile-expand">' +
                        '<div class="pb-1 space-y-0.5">' +
                            '<a href="/pages/portal/profile.html" class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(SVG.person) + '</svg>' +
                                '<span>My Profile</span>' +
                            '</a>' +
                            '<a href="/pages/portal/settings.html" class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(SVG.gear) + svgPath(SVG.gearDot) + '</svg>' +
                                '<span>Settings</span>' +
                            '</a>' +
                            '<div class="border-t my-1" style="border-color:rgba(255,255,255,0.08);"></div>' +
                            '<button id="logoutBtn" class="nav-admin-signout w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(SVG.logout) + '</svg>' +
                                '<span>Sign out</span>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<button id="navProfileBtn" aria-expanded="false" class="nav-admin-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors">' +
                        '<div class="relative w-9 h-9 flex-shrink-0">' +
                            '<div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden" style="box-shadow:0 0 0 2px rgba(255,255,255,0.2);">' +
                                '<span id="navProfileInitials" class="text-brand-600 text-xs font-bold"></span>' +
                                '<img id="navProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                            '</div>' +
                            '<div id="navBadgeOverlay"></div>' +
                        '</div>' +
                        '<span id="navProfileName" class="flex-1 text-left text-sm font-semibold text-slate-200"></span>' +
                        '<svg id="navProfileChev" class="w-4 h-4 text-slate-500 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</nav>'
    );
}
