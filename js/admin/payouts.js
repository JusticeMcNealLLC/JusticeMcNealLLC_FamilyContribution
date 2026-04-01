// Admin Payouts page functionality

document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuth({ permission: 'finance.payouts' });
    if (!user) return;

    // Load everything
    await Promise.all([
        loadPayoutSettings(),
        loadEligibleMembers(),
        loadPayoutHistory(),
    ]);

    // Wire up toggles
    setupSettingsToggles();

    // Wire up send payout
    setupSendPayout();
});

// ─── Settings ──────────────────────────────────────────
async function loadPayoutSettings() {
    try {
        const { data: settings } = await supabaseClient
            .from('app_settings')
            .select('key, value')
            .in('key', ['payouts_enabled', 'birthday_payouts_enabled', 'birthday_payout_amount_cents', 'competition_payouts_enabled']);

        const map = {};
        for (const s of settings || []) map[s.key] = s.value;

        // Set toggle states
        const payoutsToggle = document.getElementById('togglePayoutsEnabled');
        const birthdayToggle = document.getElementById('toggleBirthdayEnabled');
        const competitionToggle = document.getElementById('toggleCompetitionEnabled');
        const birthdayInput = document.getElementById('birthdayAmountInput');

        if (payoutsToggle) payoutsToggle.checked = map.payouts_enabled === true;
        if (birthdayToggle) birthdayToggle.checked = map.birthday_payouts_enabled === true;
        if (competitionToggle) competitionToggle.checked = map.competition_payouts_enabled === true;
        if (birthdayInput) {
            const cents = typeof map.birthday_payout_amount_cents === 'number' ? map.birthday_payout_amount_cents : 1000;
            birthdayInput.value = (cents / 100).toFixed(0);
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

function setupSettingsToggles() {
    // Toggle switches auto-save on change
    document.querySelectorAll('.toggle-switch input[data-key]').forEach(toggle => {
        toggle.addEventListener('change', async () => {
            const key = toggle.dataset.key;
            const value = toggle.checked;
            try {
                const { error } = await supabaseClient
                    .from('app_settings')
                    .update({ value: value, updated_at: new Date().toISOString() })
                    .eq('key', key);
                if (error) throw error;
            } catch (err) {
                console.error('Error saving setting:', err);
                toggle.checked = !toggle.checked; // revert
                alert('Failed to save setting');
            }
        });
    });

    // Birthday amount save button
    const saveBtn = document.getElementById('saveBirthdayAmount');
    const input = document.getElementById('birthdayAmountInput');
    if (saveBtn && input) {
        saveBtn.addEventListener('click', async () => {
            const dollars = parseFloat(input.value);
            if (isNaN(dollars) || dollars < 1) {
                alert('Please enter a valid amount');
                return;
            }
            const cents = Math.round(dollars * 100);
            try {
                const { error } = await supabaseClient
                    .from('app_settings')
                    .update({ value: cents, updated_at: new Date().toISOString() })
                    .eq('key', 'birthday_payout_amount_cents');
                if (error) throw error;
                saveBtn.textContent = 'Saved!';
                setTimeout(() => { saveBtn.textContent = 'Save'; }, 1500);
            } catch (err) {
                console.error('Error saving amount:', err);
                alert('Failed to save amount');
            }
        });
    }
}

// ─── Eligible Members ──────────────────────────────────
let _allMembers = [];

async function loadEligibleMembers() {
    const container = document.getElementById('eligibleMembersPanel');
    const recipientSelect = document.getElementById('payoutRecipient');

    try {
        const { data: members } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, stripe_connect_account_id, connect_onboarding_complete, payout_enrolled, birthday')
            .order('first_name');

        _allMembers = members || [];

        const eligible = _allMembers.filter(m => m.stripe_connect_account_id && m.connect_onboarding_complete);
        const notLinked = _allMembers.filter(m => !m.stripe_connect_account_id);
        const pending = _allMembers.filter(m => m.stripe_connect_account_id && !m.connect_onboarding_complete);

        // Build eligible members panel
        if (eligible.length === 0) {
            container.innerHTML = '<div class="text-sm text-gray-400 text-center py-4">No members have linked bank accounts yet</div>';
        } else {
            container.innerHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${eligible.map(m => `
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-gray-100">
                            <div class="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <span class="text-xs font-bold text-emerald-600">${((m.first_name || '')[0] || '') + ((m.last_name || '')[0] || '')}</span>
                            </div>
                            <div class="min-w-0">
                                <div class="text-sm font-semibold text-gray-900 truncate">${m.first_name || ''} ${m.last_name || ''}</div>
                                <div class="text-[10px] text-emerald-500 font-medium">Bank linked${m.birthday ? ' · Birthday: ' + formatBirthday(m.birthday) : ''}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${notLinked.length > 0 ? `<div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">${notLinked.length} member(s) haven't linked a bank account yet</div>` : ''}
                ${pending.length > 0 ? `<div class="mt-1 text-xs text-amber-500">${pending.length} member(s) with onboarding pending</div>` : ''}
            `;
        }

        // Populate recipient dropdown (only eligible members)
        if (recipientSelect) {
            recipientSelect.innerHTML = '<option value="">Select member...</option>';
            eligible.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.first_name || ''} ${m.last_name || ''}`.trim();
                recipientSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Error loading members:', err);
        container.innerHTML = '<div class="text-sm text-red-500 text-center py-4">Failed to load members</div>';
    }
}

function formatBirthday(birthday) {
    if (!birthday) return '';
    const parts = birthday.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
}

// ─── Send Payout ──────────────────────────────────────
function setupSendPayout() {
    const btn = document.getElementById('sendPayoutBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        hideMsg('payoutError');
        hideMsg('payoutSuccess');

        const userId = document.getElementById('payoutRecipient').value;
        const amountDollars = parseFloat(document.getElementById('payoutAmount').value);
        const payoutType = document.getElementById('payoutType').value;
        const reason = document.getElementById('payoutReason').value.trim();

        if (!userId) { showMsg('payoutError', 'Please select a recipient'); return; }
        if (isNaN(amountDollars) || amountDollars < 1) { showMsg('payoutError', 'Amount must be at least $1.00'); return; }

        const amountCents = Math.round(amountDollars * 100);

        // Confirm
        const member = _allMembers.find(m => m.id === userId);
        const memberName = member ? `${member.first_name} ${member.last_name}` : 'this member';
        if (!confirm(`Send $${(amountCents / 100).toFixed(2)} ${payoutType} payout to ${memberName}?`)) return;

        btn.disabled = true;
        btn.textContent = 'Sending...';

        try {
            const result = await callEdgeFunction('send-payout', {
                user_id: userId,
                amount_cents: amountCents,
                payout_type: payoutType,
                reason: reason || undefined,
            });

            showMsg('payoutSuccess', `Payout sent! $${(amountCents / 100).toFixed(2)} to ${result.recipient || memberName}`);

            // Reset form
            document.getElementById('payoutAmount').value = '';
            document.getElementById('payoutReason').value = '';

            // Refresh history
            await loadPayoutHistory();
        } catch (err) {
            showMsg('payoutError', err.message || 'Failed to send payout');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Payout';
        }
    });
}

// ─── Payout History ──────────────────────────────────
async function loadPayoutHistory() {
    const tbody = document.getElementById('payoutHistoryBody');
    if (!tbody) return;

    try {
        const { data: payouts, error } = await supabaseClient
            .from('payouts')
            .select('id, user_id, amount_cents, payout_type, reason, status, error_message, created_at, completed_at')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!payouts || payouts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No payouts yet</td></tr>';
            return;
        }

        // Map user IDs to names
        const userIds = [...new Set(payouts.map(p => p.user_id))];
        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);

        const nameMap = {};
        (profiles || []).forEach(p => {
            nameMap[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        });

        const statusColors = {
            pending: 'bg-gray-100 text-gray-600',
            queued: 'bg-amber-100 text-amber-700',
            processing: 'bg-blue-100 text-blue-700',
            completed: 'bg-emerald-100 text-emerald-700',
            failed: 'bg-red-100 text-red-700',
        };

        const typeLabels = {
            birthday: '🎂 Birthday',
            competition: '🏆 Competition',
            bonus: '💰 Bonus',
            profit_share: '📈 Profit Share',
            referral: '🤝 Referral',
            quest_reward: '⭐ Quest Reward',
            custom: '✨ Custom',
        };

        tbody.innerHTML = payouts.map(p => `
            <tr class="hover:bg-surface-50 transition">
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">${nameMap[p.user_id] || 'Unknown'}</div>
                    ${p.reason ? `<div class="text-xs text-gray-400 mt-0.5">${escapeHtml(p.reason)}</div>` : ''}
                </td>
                <td class="px-4 py-3 font-semibold text-gray-900">$${(p.amount_cents / 100).toFixed(2)}</td>
                <td class="px-4 py-3"><span class="text-xs">${typeLabels[p.payout_type] || p.payout_type}</span></td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}">
                        ${p.status}
                    </span>
                    ${p.error_message ? `<div class="text-[10px] text-red-500 mt-0.5 max-w-[150px] truncate" title="${escapeHtml(p.error_message)}">${escapeHtml(p.error_message)}</div>` : ''}
                </td>
                <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">${formatDate(p.created_at)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading payout history:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-red-500">Failed to load history</td></tr>';
    }
}

// ─── Helpers ──────────────────────────────────────────
function showMsg(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideMsg(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
