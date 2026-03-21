// ─── My Finances — Portal Page JS ────────────────────────
// Phase 1: CSV upload, auto-categorize, summary + drill-down, trend chart

document.addEventListener('DOMContentLoaded', async function () {
    const user = await checkAuth();
    if (!user) return;

    window._finUser = user;
    window._finAccounts = [];
    window._finActiveAccount = null;
    window._finStatements = [];
    window._finTransactions = [];
    window._finCategoryChart = null;
    window._finTrendChart = null;
    window._finCustomRules = [];

    await finLoadCustomRules();
    await finLoadAccounts();
    finBindUI();
});

// ═══════════════════════════════════════════════════════════
//  CATEGORY DEFINITIONS
// ═══════════════════════════════════════════════════════════

const FIN_CATEGORIES = {
    housing:          { emoji: '🏠', label: 'Housing',          color: '#6366f1' },
    groceries:        { emoji: '🛒', label: 'Groceries',        color: '#10b981' },
    dining:           { emoji: '🍽️', label: 'Dining',           color: '#f59e0b' },
    transportation:   { emoji: '🚗', label: 'Transportation',   color: '#3b82f6' },
    entertainment:    { emoji: '🎬', label: 'Entertainment',    color: '#ec4899' },
    subscriptions:    { emoji: '📱', label: 'Subscriptions',    color: '#8b5cf6' },
    shopping:         { emoji: '🛍️', label: 'Shopping',         color: '#f97316' },
    health:           { emoji: '💊', label: 'Health',            color: '#14b8a6' },
    education:        { emoji: '📚', label: 'Education',        color: '#06b6d4' },
    business:         { emoji: '💼', label: 'Business',          color: '#64748b' },
    llc_contribution: { emoji: '💸', label: 'LLC Contribution',  color: '#4f46e5' },
    savings:          { emoji: '💰', label: 'Savings / Transfers', color: '#22c55e' },
    income:           { emoji: '💵', label: 'Income',            color: '#059669' },
    other:            { emoji: '🔁', label: 'Other',             color: '#94a3b8' },
};

// ═══════════════════════════════════════════════════════════
//  MERCHANT → CATEGORY RULES
// ═══════════════════════════════════════════════════════════

const MERCHANT_RULES = [
    // Income
    { pattern: /payroll|direct dep|salary|paychex|adp|gusto/i, category: 'income' },
    // Housing
    { pattern: /rent|mortgage|hoa|property tax|renters? ins/i, category: 'housing' },
    // Groceries
    { pattern: /walmart\s*(supercenter|grocery)?|kroger|publix|aldi|trader joe|whole foods|costco|sam'?s club|h-?e-?b|safeway|wegmans|food lion|piggly|giant eagle|meijer|target\s*grocery/i, category: 'groceries' },
    // Dining
    { pattern: /mcdonald|wendy|chick-?fil-?a|starbucks|dunkin|burger king|taco bell|chipotle|panera|domino|pizza hut|papa john|subway|popeye|sonic|chili'?s|olive garden|applebee|ihop|waffle house|grubhub|doordash|uber\s?eats|postmates|dine|restaurant|cafe|coffee|bistro|grill|kitchen/i, category: 'dining' },
    // Transportation
    { pattern: /shell|exxon|chevron|bp\s|marathon|speedway|racetrac|wawa|quiktrip|geico|allstate|state farm|progressive|auto|uber(?!\s?eat)|lyft|parking|toll|ez\s?pass|car wash|jiffy lube|tire|valvoline/i, category: 'transportation' },
    // Entertainment
    { pattern: /netflix|hulu|disney\+?|hbo|peacock|paramount|apple\s?tv|spotify|youtube\s?(premium|music)|audible|twitch|steam|xbox|playstation|nintendo|amc|regal|cinema|ticket|concert|live nation|stubhub|fandango/i, category: 'entertainment' },
    // Subscriptions (catch after entertainment)
    { pattern: /subscription|recurr|monthly|annual\s*fee|amazon\s*prime|membership|chatgpt|openai|adobe|dropbox|icloud|google\s?(one|storage)|microsoft\s*365|planet fitness|anytime fitness|la fitness|gym|crunch|supabase|elevenlabs|apple\.com\/bill|tmna\s*subscription/i, category: 'subscriptions' },
    // Shopping — eBay, Amazon, etc.
    { pattern: /amazon(?!\s*prime)|target|best buy|home depot|lowe'?s|ikea|wayfair|etsy|ebay|shein|zara|h&m|nike|adidas|foot locker|tj\s?maxx|marshalls|ross|nordstrom|macy|old navy|gap\s|kohls|five below|dollar|bath\s?&?\s?body/i, category: 'shopping' },
    // Health
    { pattern: /cvs|walgreens|rite aid|pharmacy|doctor|hospital|clinic|dental|optom|urgent care|lab|quest diag|anthem|cigna|aetna|united\s?health|blue\s?cross|kaiser|copay|deductible|medical/i, category: 'health' },
    // Education
    { pattern: /tuition|university|college|school|udemy|coursera|skillshare|duolingo|chegg|textbook|student loan/i, category: 'education' },
    // Business — tools, shipping, SaaS for business
    { pattern: /karrykraze|pirate\s*ship/i, category: 'business' },
    // LLC Contribution
    { pattern: /justice\s?mcneal|jmllc|family\s?contribution/i, category: 'llc_contribution' },
    // Savings / Transfers — Zelle, Venmo, Cash App, Apple Cash, loan payments, share transfers, deposit transfers
    { pattern: /zelle|venmo|cash\s?app|paypal|apple\s?cash|to\s+loan|from\s+loan|to\s+share|from\s+share|deposit\s+transfer|transfer\s+from|overdraft\s+transfer|foreign\s+transaction\s+fee/i, category: 'savings' },
];

function finCategorize(description) {
    const d = (description || '').trim().toLowerCase();

    // ── Custom user rules run FIRST (highest priority wins) ──
    for (const rule of window._finCustomRules || []) {
        if (d.includes(rule.match_text.toLowerCase())) return rule.category;
    }

    // ── Default merchant rules ──
    for (const rule of MERCHANT_RULES) {
        if (rule.pattern.test(d)) return rule.category;
    }
    return 'other';
}

// ═══════════════════════════════════════════════════════════
//  CUSTOM CATEGORIZATION RULES
// ═══════════════════════════════════════════════════════════

async function finLoadCustomRules() {
    const { data, error } = await supabaseClient
        .from('member_category_rules')
        .select('*')
        .eq('user_id', window._finUser.id)
        .order('priority', { ascending: false });

    if (error) { console.error('Load custom rules error:', error); return; }
    window._finCustomRules = data || [];
    finRenderRulesList();
}

function finRenderRulesList() {
    const container = document.getElementById('rulesList');
    const countEl = document.getElementById('rulesCount');
    if (!container) return;

    const rules = window._finCustomRules;
    countEl.textContent = `(${rules.length})`;

    if (rules.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">No custom rules yet. Edit a transaction and choose \"Always categorize this way\" to create one.</p>';
        return;
    }

    container.innerHTML = rules.map(r => {
        const c = FIN_CATEGORIES[r.category] || FIN_CATEGORIES.other;
        return `
        <div class="stat-card flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 truncate">${r.label || r.match_text}</p>
                <p class="text-xs text-gray-400">Matches: "<span class="text-gray-600">${r.match_text}</span>" → ${c.emoji} ${c.label}</p>
            </div>
            <div class="flex items-center gap-1.5">
                <button class="rule-edit-btn p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-brand-600" data-rule="${r.id}" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button class="rule-delete-btn p-1.5 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500" data-rule="${r.id}" data-match="${r.match_text}" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.rule-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const rule = window._finCustomRules.find(r => r.id === btn.dataset.rule);
            if (rule) finOpenRuleModal(rule);
        });
    });

    container.querySelectorAll('.rule-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => finConfirmDelete('rule', btn.dataset.rule, btn.dataset.match));
    });
}

function finOpenRuleModal(existing = null) {
    document.getElementById('ruleModalTitle').textContent = existing ? 'Edit Rule' : 'New Rule';
    document.getElementById('ruleEditId').value = existing ? existing.id : '';
    document.getElementById('ruleMatchText').value = existing ? existing.match_text : '';
    document.getElementById('ruleCategory').value = existing ? existing.category : 'housing';
    document.getElementById('ruleLabel').value = existing ? (existing.label || '') : '';
    document.getElementById('ruleError').classList.add('hidden');
    document.getElementById('ruleModal').classList.remove('hidden');
}

function finCloseRuleModal() {
    document.getElementById('ruleModal').classList.add('hidden');
}

async function finSaveRule() {
    const editId = document.getElementById('ruleEditId').value;
    const matchText = document.getElementById('ruleMatchText').value.trim();
    const category = document.getElementById('ruleCategory').value;
    const label = document.getElementById('ruleLabel').value.trim();
    const errorEl = document.getElementById('ruleError');

    if (!matchText) { errorEl.textContent = 'Match text is required'; errorEl.classList.remove('hidden'); return; }
    errorEl.classList.add('hidden');

    if (editId) {
        const { error } = await supabaseClient
            .from('member_category_rules')
            .update({ match_text: matchText, category, label })
            .eq('id', editId)
            .eq('user_id', window._finUser.id);
        if (error) { errorEl.textContent = error.message; errorEl.classList.remove('hidden'); return; }
    } else {
        const { error } = await supabaseClient
            .from('member_category_rules')
            .insert({ user_id: window._finUser.id, match_text: matchText, category, label });
        if (error) {
            errorEl.textContent = error.code === '23505' ? 'A rule with this match text already exists' : error.message;
            errorEl.classList.remove('hidden');
            return;
        }
    }

    finCloseRuleModal();
    await finLoadCustomRules();

    // Offer to re-categorize existing transactions
    await finRecategorizeByRule(matchText, category);
}

async function finRecategorizeByRule(matchText, newCategory) {
    // Find matching transactions in the current view
    const matchLower = matchText.toLowerCase();
    const matching = window._finTransactions.filter(t =>
        t.description.toLowerCase().includes(matchLower) && t.category !== newCategory
    );

    if (matching.length === 0) return;

    const doIt = confirm(`${matching.length} existing transaction(s) match this rule. Re-categorize them now?`);
    if (!doIt) return;

    // Batch update in DB
    const ids = matching.map(t => t.id);
    const { error } = await supabaseClient
        .from('member_transactions')
        .update({ category: newCategory })
        .in('id', ids)
        .eq('user_id', window._finUser.id);

    if (error) { console.error('Re-categorize error:', error); return; }

    // Update local data
    for (const t of matching) t.category = newCategory;
    finRenderSummaryStats();
    finRenderCategoryChart();
    finRenderCategoryList();
    finRenderTxnList();
}

async function finDeleteRule(ruleId) {
    const { error } = await supabaseClient
        .from('member_category_rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', window._finUser.id);

    if (error) { alert('Error: ' + error.message); return; }
    await finLoadCustomRules();
}

// ═══════════════════════════════════════════════════════════
//  ACCOUNT MANAGEMENT
// ═══════════════════════════════════════════════════════════

async function finLoadAccounts() {
    const { data, error } = await supabaseClient
        .from('member_accounts')
        .select('*')
        .eq('user_id', window._finUser.id)
        .order('created_at', { ascending: true });

    if (error) { console.error('Load accounts error:', error); return; }
    window._finAccounts = data || [];

    if (window._finAccounts.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('addAccountBtn').classList.add('hidden');
    } else {
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('addAccountBtn').classList.remove('hidden', 'sm:inline-flex');
        document.getElementById('addAccountBtn').classList.add('inline-flex');
        finRenderAccountTabs();
        if (!window._finActiveAccount) {
            finSelectAccount(window._finAccounts[0].id);
        } else {
            finSelectAccount(window._finActiveAccount);
        }
    }
}

function finRenderAccountTabs() {
    const container = document.getElementById('accountTabs');
    container.innerHTML = window._finAccounts.map(a => {
        const isActive = a.id === window._finActiveAccount;
        const typeIcon = a.account_type === 'credit' ? '💳' : a.account_type === 'savings' ? '🏦' : '🏧';
        return `<button class="account-tab ${isActive ? 'active' : ''}" data-acct="${a.id}" title="${a.institution || ''}">${typeIcon} ${a.label}</button>`;
    }).join('');

    // Add "All Accounts" tab
    const allActive = window._finActiveAccount === 'all';
    container.innerHTML = `<button class="account-tab ${allActive ? 'active' : ''}" data-acct="all">📊 All</button>` + container.innerHTML;

    container.querySelectorAll('.account-tab').forEach(btn => {
        btn.addEventListener('click', () => finSelectAccount(btn.dataset.acct));
    });
}

async function finSelectAccount(accountId) {
    window._finActiveAccount = accountId;
    finRenderAccountTabs();
    await finLoadStatements();
}

// ═══════════════════════════════════════════════════════════
//  STATEMENTS
// ═══════════════════════════════════════════════════════════

async function finLoadStatements() {
    let query = supabaseClient
        .from('member_statements')
        .select('*, member_accounts(label, institution, account_type)')
        .eq('user_id', window._finUser.id)
        .order('statement_month', { ascending: false });

    if (window._finActiveAccount !== 'all') {
        query = query.eq('account_id', window._finActiveAccount);
    }

    const { data, error } = await query;
    if (error) { console.error('Load statements error:', error); return; }
    window._finStatements = data || [];

    finRenderMonthSelect();
    finRenderStatementHistory();

    // Load transactions for latest statement
    if (window._finStatements.length > 0) {
        const latestId = document.getElementById('monthSelect').value;
        await finLoadTransactions(latestId === 'latest' ? window._finStatements[0].id : latestId);
    } else {
        window._finTransactions = [];
        finRenderSummaryStats();
        finRenderCategoryChart();
        finRenderCategoryList();
        finRenderTrendChart();
        finRenderTxnList();
    }
}

function finRenderMonthSelect() {
    const select = document.getElementById('monthSelect');
    const opts = window._finStatements.map(s => {
        const d = new Date(s.statement_month + 'T00:00:00');
        const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        const acctLabel = s.member_accounts ? ` · ${s.member_accounts.label}` : '';
        return `<option value="${s.id}">${label}${acctLabel}</option>`;
    }).join('');
    select.innerHTML = opts || '<option value="">No statements</option>';
}

function finRenderStatementHistory() {
    const container = document.getElementById('stmtHistory');
    if (window._finStatements.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">No statements uploaded yet</p>';
        return;
    }

    container.innerHTML = window._finStatements.map(s => {
        const d = new Date(s.statement_month + 'T00:00:00');
        const monthLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        const acctLabel = s.member_accounts ? s.member_accounts.label : 'Unknown';
        const net = s.net_cents || 0;
        const netColor = net >= 0 ? 'text-emerald-600' : 'text-red-500';
        const netStr = (net >= 0 ? '+' : '') + finFmtCents(net);
        return `
        <div class="stat-card flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-900 truncate">${monthLabel}</p>
                <p class="text-xs text-gray-400">${acctLabel} · Net: <span class="${netColor} font-medium">${netStr}</span></p>
            </div>
            <div class="flex items-center gap-1.5">
                <button class="stmt-view-btn p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-brand-600" data-stmt="${s.id}" title="View">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </button>
                <button class="stmt-delete-btn p-1.5 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500" data-stmt="${s.id}" data-label="${monthLabel}" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.stmt-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('monthSelect').value = btn.dataset.stmt;
            finLoadTransactions(btn.dataset.stmt);
        });
    });

    container.querySelectorAll('.stmt-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => finConfirmDelete('statement', btn.dataset.stmt, btn.dataset.label));
    });
}

// ═══════════════════════════════════════════════════════════
//  TRANSACTIONS
// ═══════════════════════════════════════════════════════════

async function finLoadTransactions(statementId) {
    if (!statementId) return;
    const { data, error } = await supabaseClient
        .from('member_transactions')
        .select('*')
        .eq('statement_id', statementId)
        .eq('user_id', window._finUser.id)
        .order('transaction_date', { ascending: false });

    if (error) { console.error('Load txns error:', error); return; }
    window._finTransactions = data || [];

    finRenderSummaryStats();
    finRenderCategoryChart();
    finRenderCategoryList();
    finRenderTxnList();
    await finRenderTrendChart();
}

// ═══════════════════════════════════════════════════════════
//  SUMMARY STATS
// ═══════════════════════════════════════════════════════════

function finRenderSummaryStats() {
    const txns = window._finTransactions;
    let income = 0, spending = 0, llc = 0;
    for (const t of txns) {
        if (t.amount_cents > 0) income += t.amount_cents;
        else spending += Math.abs(t.amount_cents);
        if (t.category === 'llc_contribution') llc += Math.abs(t.amount_cents);
    }
    const net = income - spending;
    document.getElementById('statIncome').textContent = finFmtCents(income);
    document.getElementById('statSpending').textContent = finFmtCents(spending);
    document.getElementById('statNet').textContent = (net >= 0 ? '+' : '') + finFmtCents(net);
    document.getElementById('statNet').className = `text-lg sm:text-xl font-bold mt-1 ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`;
    document.getElementById('statLLC').textContent = finFmtCents(llc);
}

// ═══════════════════════════════════════════════════════════
//  CATEGORY CHART (Doughnut)
// ═══════════════════════════════════════════════════════════

function finRenderCategoryChart() {
    const txns = window._finTransactions.filter(t => t.amount_cents < 0); // outflows only
    const canvas = document.getElementById('categoryChart');
    const emptyEl = document.getElementById('chartEmpty');

    if (txns.length === 0) {
        canvas.style.display = 'none';
        emptyEl.classList.remove('hidden');
        if (window._finCategoryChart) { window._finCategoryChart.destroy(); window._finCategoryChart = null; }
        return;
    }
    canvas.style.display = '';
    emptyEl.classList.add('hidden');

    // Aggregate by category
    const byCategory = {};
    for (const t of txns) {
        const cat = t.category || 'other';
        byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount_cents);
    }

    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([k]) => FIN_CATEGORIES[k]?.label || k);
    const data = sorted.map(([, v]) => v / 100);
    const colors = sorted.map(([k]) => FIN_CATEGORIES[k]?.color || '#94a3b8');

    if (window._finCategoryChart) window._finCategoryChart.destroy();
    window._finCategoryChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
            cutout: '65%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            onClick: (_, elements) => {
                if (elements.length > 0) {
                    const catKey = sorted[elements[0].index][0];
                    finFilterByCategory(catKey);
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════
//  CATEGORY LIST (sidebar)
// ═══════════════════════════════════════════════════════════

function finRenderCategoryList() {
    const container = document.getElementById('categoryList');
    const txns = window._finTransactions.filter(t => t.amount_cents < 0);
    if (txns.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">No spending data</p>';
        return;
    }

    const byCategory = {};
    const totalSpending = txns.reduce((s, t) => s + Math.abs(t.amount_cents), 0);
    for (const t of txns) {
        const cat = t.category || 'other';
        byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount_cents);
    }

    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    container.innerHTML = sorted.map(([cat, cents]) => {
        const c = FIN_CATEGORIES[cat] || FIN_CATEGORIES.other;
        const pct = totalSpending > 0 ? Math.round((cents / totalSpending) * 100) : 0;
        return `
        <button class="category-row w-full flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 rounded-lg transition text-left" data-cat="${cat}">
            <span class="text-lg flex-shrink-0">${c.emoji}</span>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-900 truncate">${c.label}</span>
                    <span class="text-sm font-semibold text-gray-900 ml-2">${finFmtCents(cents)}</span>
                </div>
                <div class="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" style="width:${pct}%; background:${c.color}"></div>
                </div>
            </div>
            <span class="text-xs text-gray-400 flex-shrink-0 ml-1">${pct}%</span>
        </button>`;
    }).join('');

    container.querySelectorAll('.category-row').forEach(btn => {
        btn.addEventListener('click', () => finFilterByCategory(btn.dataset.cat));
    });
}

// ═══════════════════════════════════════════════════════════
//  TRANSACTION LIST (drill-down)
// ═══════════════════════════════════════════════════════════

window._finCategoryFilter = null;

function finFilterByCategory(cat) {
    window._finCategoryFilter = cat;
    const c = FIN_CATEGORIES[cat] || FIN_CATEGORIES.other;
    document.getElementById('txnCategoryLabel').textContent = `${c.emoji} ${c.label}`;
    document.getElementById('txnClearFilter').classList.remove('hidden');
    document.getElementById('txnSection').classList.remove('hidden');
    finRenderTxnList();
}

function finRenderTxnList() {
    const section = document.getElementById('txnSection');
    const container = document.getElementById('txnList');
    const countEl = document.getElementById('txnCount');
    const filter = window._finCategoryFilter;

    let txns = window._finTransactions;
    if (filter) {
        txns = txns.filter(t => t.category === filter);
    }

    if (txns.length === 0) {
        if (!filter) { section.classList.add('hidden'); return; }
        section.classList.remove('hidden');
        container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">No transactions in this category</p>';
        countEl.textContent = '(0)';
        return;
    }

    section.classList.remove('hidden');
    countEl.textContent = `(${txns.length})`;

    container.innerHTML = txns.map(t => {
        const c = FIN_CATEGORIES[t.category] || FIN_CATEGORIES.other;
        const d = new Date(t.transaction_date + 'T00:00:00');
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const amtColor = t.amount_cents >= 0 ? 'text-emerald-600' : 'text-gray-900';
        const amtStr = (t.amount_cents >= 0 ? '+' : '') + finFmtCents(t.amount_cents);
        return `
        <div class="txn-row group" data-txn="${t.id}">
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <span class="text-base flex-shrink-0">${c.emoji}</span>
                <div class="min-w-0">
                    <p class="text-sm text-gray-900 truncate">${t.description}</p>
                    <p class="text-xs text-gray-400">${dateStr}${t.notes ? ' · ' + t.notes : ''}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-sm font-semibold ${amtColor}">${amtStr}</span>
                <button class="txn-edit-btn opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition text-gray-400 hover:text-brand-600" data-txn="${t.id}" title="Edit">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
            </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.txn-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            finOpenTxnEdit(btn.dataset.txn);
        });
    });
}

// ═══════════════════════════════════════════════════════════
//  MONTHLY TREND CHART (bar: income vs spending)
// ═══════════════════════════════════════════════════════════

async function finRenderTrendChart() {
    const canvas = document.getElementById('trendChart');
    const emptyEl = document.getElementById('trendEmpty');

    // Get all statements for the active account(s)
    const stmts = window._finStatements;
    if (stmts.length < 2) {
        canvas.style.display = 'none';
        emptyEl.classList.remove('hidden');
        if (window._finTrendChart) { window._finTrendChart.destroy(); window._finTrendChart = null; }
        return;
    }
    canvas.style.display = '';
    emptyEl.classList.add('hidden');

    // Collect last 12 months of data, oldest first
    const last12 = stmts.slice(0, 12).reverse();
    const labels = last12.map(s => {
        const d = new Date(s.statement_month + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });
    const incomeData = last12.map(s => (s.total_inflow_cents || 0) / 100);
    const spendData = last12.map(s => (s.total_outflow_cents || 0) / 100);

    if (window._finTrendChart) window._finTrendChart.destroy();
    window._finTrendChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Income', data: incomeData, backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Spending', data: spendData, backgroundColor: '#ef4444', borderRadius: 4 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
                tooltip: {
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}` }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════
//  CSV PARSER
// ═══════════════════════════════════════════════════════════

function finParseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // ── Auto-detect the header row ──────────────────────
    // Banks often prepend metadata lines (account name, date range, etc.)
    // Scan for the first line that looks like a CSV header with "date" in it.
    let headerIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const lowerLine = lines[i].toLowerCase();
        // Must contain "date" as a column name (not "Date Range :" metadata)
        if (/,.*date|date.*,/.test(lowerLine) && /desc|memo|narr|amount|debit|credit/i.test(lowerLine)) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx < 0) {
        console.warn('CSV header row not found in first 10 lines.');
        return [];
    }

    const headers = finCSVSplitRow(lines[headerIdx]).map(h => h.toLowerCase().trim());

    // ── Detect column indices — flexible for many bank formats ──
    // Date: look for a column that is exactly/primarily "date"
    const dateIdx = headers.findIndex(h => /^date$|^posted|^trans(action)?\s*date$/i.test(h));
    // Description: prefer "description", then "narration", "detail", "merchant", "payee"
    const descIdx = headers.findIndex(h => /^description$|^desc$|narr|detail|merchant|payee/i.test(h));
    // Memo: separate column with extra merchant/payee info
    const memoIdx = headers.findIndex(h => /^memo$|^reference$|^particulars$/i.test(h));
    // Amount: single combined column
    const amountIdx = headers.findIndex(h => /^amount$|^(net\s*)?amount$/i.test(h));
    // Debit / Credit: split columns (also match "Amount Debit" / "Amount Credit")
    const debitIdx = headers.findIndex(h => /debit|withdrawal|charge/i.test(h));
    const creditIdx = headers.findIndex(h => /credit|deposit/i.test(h));

    if (dateIdx < 0 || (descIdx < 0 && memoIdx < 0)) {
        console.warn('CSV columns not recognized. Headers:', headers);
        return [];
    }

    const transactions = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const cols = finCSVSplitRow(lines[i]);
        if (!cols || cols.length < 2) continue;

        const rawDate = (cols[dateIdx] || '').trim();
        if (!rawDate) continue;

        // Build description: prefer memo (has merchant detail), fall back to description
        const descVal = descIdx >= 0 ? (cols[descIdx] || '').trim() : '';
        const memoVal = memoIdx >= 0 ? (cols[memoIdx] || '').trim() : '';
        // Generic bank descriptions are useless — always prefer memo when desc is generic
        const isGenericDesc = /^(check card purchase|ach (with)?draw(al)?|ach deposit|online (transfer|payment)|fee withdrawal|pos deposit|transfer|debit|credit|deposit|withdrawal|payment)$/i.test(descVal);
        const description = (isGenericDesc && memoVal) ? memoVal
            : memoVal.length > descVal.length ? memoVal
            : (descVal || memoVal);
        if (!description) continue;

        // Parse date (MM/DD/YYYY or YYYY-MM-DD)
        const date = finParseDate(rawDate);
        if (!date) continue;

        // Parse amount — either single column or debit/credit pair
        let amountCents = 0;
        if (amountIdx >= 0 && amountIdx !== debitIdx && amountIdx !== creditIdx) {
            amountCents = finParseCents(cols[amountIdx]);
        } else if (debitIdx >= 0 || creditIdx >= 0) {
            const debit = debitIdx >= 0 ? finParseCents(cols[debitIdx]) : 0;
            const credit = creditIdx >= 0 ? finParseCents(cols[creditIdx]) : 0;
            // Debits are outflows (negative), credits are inflows (positive)
            if (credit > 0) {
                amountCents = credit;
            } else if (debit !== 0) {
                amountCents = -Math.abs(debit);
            }
        }
        if (amountCents === 0) continue;

        // Categorize using the fullest text available (memo + description combined)
        const catText = (memoVal + ' ' + descVal).trim();

        transactions.push({
            transaction_date: date,
            description,
            amount_cents: amountCents,
            category: finCategorize(catText),
        });
    }

    return transactions;
}

function finCSVSplitRow(line) {
    // Handle quoted fields with commas inside
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
        current += ch;
    }
    result.push(current);
    return result;
}

function finParseDate(raw) {
    // MM/DD/YYYY
    let m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        const [, mm, dd, yyyy] = m;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    // YYYY-MM-DD
    m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return raw;
    return null;
}

function finParseCents(raw) {
    if (!raw) return 0;
    const cleaned = raw.replace(/[$,\s"]/g, '').trim();
    if (!cleaned || cleaned === '-') return 0;
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : Math.round(val * 100);
}

// ═══════════════════════════════════════════════════════════
//  FILE UPLOAD HANDLER
// ═══════════════════════════════════════════════════════════

async function finHandleUpload(file) {
    if (!file) return;
    if (window._finActiveAccount === 'all') {
        alert('Select a specific account first.');
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'pdf'].includes(ext)) {
        alert('Only CSV and PDF files are supported.');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Max 10 MB.');
        return;
    }

    // Show progress
    const progressEl = document.getElementById('uploadProgress');
    const barEl = document.getElementById('uploadBar');
    const pctEl = document.getElementById('uploadPct');
    const statusEl = document.getElementById('uploadStatus');
    progressEl.classList.remove('hidden');
    barEl.style.width = '10%'; pctEl.textContent = '10%';
    statusEl.textContent = 'Reading file…';

    try {
        let transactions = [];

        if (ext === 'csv') {
            const text = await file.text();
            barEl.style.width = '30%'; pctEl.textContent = '30%';
            statusEl.textContent = 'Parsing CSV…';
            transactions = finParseCSV(text);
        } else {
            // PDF — simple text extraction with pdf.js would go here
            // For Phase 1, show a helpful message
            alert('PDF parsing is coming in Phase 3. For now, export your statement as CSV from your bank app.');
            progressEl.classList.add('hidden');
            return;
        }

        if (transactions.length === 0) {
            alert('No transactions found. Check that your CSV has Date, Description, and Amount columns.');
            progressEl.classList.add('hidden');
            return;
        }

        barEl.style.width = '50%'; pctEl.textContent = '50%';
        statusEl.textContent = `Found ${transactions.length} transactions. Splitting by month…`;

        // ── Group transactions by month ────────────────────────
        const monthBuckets = {};
        for (const t of transactions) {
            const d = new Date(t.transaction_date + 'T00:00:00');
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
            if (!monthBuckets[key]) monthBuckets[key] = [];
            monthBuckets[key].push(t);
        }
        const sortedMonths = Object.keys(monthBuckets).sort();
        const totalMonths = sortedMonths.length;

        statusEl.textContent = `Found ${transactions.length} transactions across ${totalMonths} month${totalMonths > 1 ? 's' : ''}. Saving…`;

        // Upload raw file to storage once
        barEl.style.width = '55%'; pctEl.textContent = '55%';
        statusEl.textContent = 'Uploading file…';

        const storagePath = `${window._finUser.id}/${window._finActiveAccount}/${sortedMonths[0]}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('member-statements')
            .upload(storagePath, file, { upsert: false });

        let fileUrl = null;
        if (!uploadError) {
            const { data: urlData } = supabaseClient.storage.from('member-statements').getPublicUrl(storagePath);
            fileUrl = urlData?.publicUrl || storagePath;
        } else {
            console.warn('File upload failed (proceeding without raw file):', uploadError);
        }

        // ── Process each month separately ──────────────────────
        let processedTxns = 0;
        for (let mi = 0; mi < sortedMonths.length; mi++) {
            const statementMonth = sortedMonths[mi];
            const monthTxns = monthBuckets[statementMonth];
            const monthLabel = new Date(statementMonth + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const basePct = 60 + Math.round((mi / totalMonths) * 35);
            barEl.style.width = basePct + '%'; pctEl.textContent = basePct + '%';
            statusEl.textContent = `Saving ${monthLabel} (${monthTxns.length} txns)…`;

            // Calculate totals for this month
            let inflow = 0, outflow = 0;
            for (const t of monthTxns) {
                if (t.amount_cents > 0) inflow += t.amount_cents;
                else outflow += Math.abs(t.amount_cents);
            }

            // Create / update statement record for this month
            const { data: stmt, error: stmtError } = await supabaseClient
                .from('member_statements')
                .upsert({
                    account_id: window._finActiveAccount,
                    user_id: window._finUser.id,
                    statement_month: statementMonth,
                    file_url: mi === 0 ? fileUrl : null, // only first month gets the file link
                    original_filename: file.name,
                    parsed: true,
                    total_inflow_cents: inflow,
                    total_outflow_cents: outflow,
                    net_cents: inflow - outflow,
                }, { onConflict: 'account_id,statement_month' })
                .select()
                .single();

            if (stmtError) throw stmtError;

            // Delete existing transactions for this month (re-upload overwrites)
            await supabaseClient
                .from('member_transactions')
                .delete()
                .eq('statement_id', stmt.id)
                .eq('user_id', window._finUser.id);

            // Insert transactions in batches of 100
            const rows = monthTxns.map(t => ({
                statement_id: stmt.id,
                user_id: window._finUser.id,
                transaction_date: t.transaction_date,
                description: t.description,
                amount_cents: t.amount_cents,
                category: t.category,
            }));

            for (let i = 0; i < rows.length; i += 100) {
                const batch = rows.slice(i, i + 100);
                const { error: batchError } = await supabaseClient
                    .from('member_transactions')
                    .insert(batch);
                if (batchError) throw batchError;
            }

            processedTxns += monthTxns.length;

            // Generate cashback estimate for this month
            const eligibleSpend = outflow;
            const cashback = Math.round(eligibleSpend * 0.02);
            await supabaseClient
                .from('member_cashback_estimates')
                .upsert({
                    statement_id: stmt.id,
                    user_id: window._finUser.id,
                    eligible_spend_cents: eligibleSpend,
                    estimated_cashback_cents: cashback,
                }, { onConflict: 'statement_id' });
        }

        barEl.style.width = '100%'; pctEl.textContent = '100%';
        statusEl.textContent = `✅ ${transactions.length} transactions imported across ${totalMonths} month${totalMonths > 1 ? 's' : ''}!`;

        // Reload data
        await finLoadStatements();

        // Hide progress after a moment
        setTimeout(() => { progressEl.classList.add('hidden'); }, 2500);

    } catch (err) {
        console.error('Upload error:', err);
        statusEl.textContent = '❌ Error: ' + (err.message || 'Unknown error');
        barEl.style.width = '100%';
        barEl.classList.remove('bg-brand-600');
        barEl.classList.add('bg-red-500');
        setTimeout(() => {
            progressEl.classList.add('hidden');
            barEl.classList.remove('bg-red-500');
            barEl.classList.add('bg-brand-600');
        }, 4000);
    }
}

// ═══════════════════════════════════════════════════════════
//  UI BINDINGS
// ═══════════════════════════════════════════════════════════

function finBindUI() {
    // Add account buttons
    const openModal = () => finOpenAccountModal();
    document.getElementById('addAccountBtn').addEventListener('click', openModal);
    document.getElementById('emptyAddAccountBtn').addEventListener('click', openModal);
    document.getElementById('addAccountTabBtn').addEventListener('click', openModal);

    // Account modal
    document.getElementById('accountModalBackdrop').addEventListener('click', finCloseAccountModal);
    document.getElementById('accountModalClose').addEventListener('click', finCloseAccountModal);
    document.getElementById('acctCancelBtn').addEventListener('click', finCloseAccountModal);
    document.getElementById('acctSaveBtn').addEventListener('click', finSaveAccount);
    document.getElementById('acctDeleteBtn').addEventListener('click', finDeleteAccount);

    // File upload
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    document.getElementById('browseBtn').addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') fileInput.click();
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) finHandleUpload(fileInput.files[0]);
        fileInput.value = '';
    });
    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) finHandleUpload(e.dataTransfer.files[0]);
    });

    // Month selector
    document.getElementById('monthSelect').addEventListener('change', (e) => {
        if (e.target.value) finLoadTransactions(e.target.value);
    });

    // Transaction filter clear
    document.getElementById('txnClearFilter').addEventListener('click', () => {
        window._finCategoryFilter = null;
        document.getElementById('txnCategoryLabel').textContent = 'All Transactions';
        document.getElementById('txnClearFilter').classList.add('hidden');
        finRenderTxnList();
    });

    // Transaction edit modal
    document.getElementById('txnEditBackdrop').addEventListener('click', finCloseTxnEdit);
    document.getElementById('txnEditClose').addEventListener('click', finCloseTxnEdit);
    document.getElementById('txnEditCancelBtn').addEventListener('click', finCloseTxnEdit);
    document.getElementById('txnEditSaveBtn').addEventListener('click', finSaveTxnEdit);

    // Delete modal
    document.getElementById('deleteModalBackdrop').addEventListener('click', finCloseDeleteModal);
    document.getElementById('deleteCancelBtn').addEventListener('click', finCloseDeleteModal);
    document.getElementById('deleteConfirmBtn').addEventListener('click', finExecuteDelete);

    // Rules modal
    document.getElementById('addRuleBtn').addEventListener('click', () => finOpenRuleModal());
    document.getElementById('ruleModalBackdrop').addEventListener('click', finCloseRuleModal);
    document.getElementById('ruleModalClose').addEventListener('click', finCloseRuleModal);
    document.getElementById('ruleCancelBtn').addEventListener('click', finCloseRuleModal);
    document.getElementById('ruleSaveBtn').addEventListener('click', finSaveRule);

    // Double-tap on account tab opens edit modal
    document.getElementById('accountTabs').addEventListener('dblclick', (e) => {
        const tab = e.target.closest('[data-acct]');
        if (tab && tab.dataset.acct !== 'all') {
            const acct = window._finAccounts.find(a => a.id === tab.dataset.acct);
            if (acct) finOpenAccountModal(acct);
        }
    });
}

// ═══════════════════════════════════════════════════════════
//  ACCOUNT MODAL
// ═══════════════════════════════════════════════════════════

function finOpenAccountModal(existing = null) {
    const modal = document.getElementById('accountModal');
    const title = document.getElementById('accountModalTitle');
    const deleteBtn = document.getElementById('acctDeleteBtn');

    document.getElementById('acctLabel').value = existing ? existing.label : '';
    document.getElementById('acctInstitution').value = existing ? (existing.institution || '') : '';
    document.getElementById('acctType').value = existing ? existing.account_type : 'checking';
    document.getElementById('acctEditId').value = existing ? existing.id : '';
    document.getElementById('acctError').classList.add('hidden');

    title.textContent = existing ? 'Edit Account' : 'Add Account';
    if (existing) deleteBtn.classList.remove('hidden');
    else deleteBtn.classList.add('hidden');

    modal.classList.remove('hidden');
}

function finCloseAccountModal() {
    document.getElementById('accountModal').classList.add('hidden');
}

async function finSaveAccount() {
    const label = document.getElementById('acctLabel').value.trim();
    const institution = document.getElementById('acctInstitution').value.trim();
    const accountType = document.getElementById('acctType').value;
    const editId = document.getElementById('acctEditId').value;
    const errorEl = document.getElementById('acctError');

    if (!label) { errorEl.textContent = 'Account name is required'; errorEl.classList.remove('hidden'); return; }
    errorEl.classList.add('hidden');

    if (editId) {
        // Update
        const { error } = await supabaseClient
            .from('member_accounts')
            .update({ label, institution, account_type: accountType })
            .eq('id', editId)
            .eq('user_id', window._finUser.id);
        if (error) { errorEl.textContent = error.message; errorEl.classList.remove('hidden'); return; }
    } else {
        // Insert
        const { error } = await supabaseClient
            .from('member_accounts')
            .insert({ user_id: window._finUser.id, label, institution, account_type: accountType });
        if (error) { errorEl.textContent = error.message; errorEl.classList.remove('hidden'); return; }
    }

    finCloseAccountModal();
    await finLoadAccounts();
}

async function finDeleteAccount() {
    const editId = document.getElementById('acctEditId').value;
    if (!editId) return;

    const acct = window._finAccounts.find(a => a.id === editId);
    if (!confirm(`Delete "${acct?.label || 'this account'}" and all its statements? This cannot be undone.`)) return;

    const { error } = await supabaseClient
        .from('member_accounts')
        .delete()
        .eq('id', editId)
        .eq('user_id', window._finUser.id);

    if (error) { alert('Error: ' + error.message); return; }

    finCloseAccountModal();
    window._finActiveAccount = null;
    await finLoadAccounts();
}

// ═══════════════════════════════════════════════════════════
//  TRANSACTION EDIT MODAL
// ═══════════════════════════════════════════════════════════

function finOpenTxnEdit(txnId) {
    const txn = window._finTransactions.find(t => t.id === txnId);
    if (!txn) return;

    document.getElementById('txnEditId').value = txn.id;
    document.getElementById('txnEditDesc').value = txn.description;
    document.getElementById('txnEditCategory').value = txn.category || 'other';
    document.getElementById('txnEditNotes').value = txn.notes || '';
    document.getElementById('txnEditError').classList.add('hidden');
    document.getElementById('txnAlwaysCheck').checked = false;
    document.getElementById('txnRuleMatchPreview').textContent = finSuggestMatchText(txn.description);
    document.getElementById('txnEditModal').classList.remove('hidden');
}

// Suggest a good match text from a transaction description
function finSuggestMatchText(desc) {
    // For Zelle: extract the name (ZELLE FIRSTNAME LASTNAME)
    const zelle = desc.match(/zelle\s+([a-z]+\s+[a-z]+)/i);
    if (zelle) return 'ZELLE ' + zelle[1].toUpperCase();
    // For loan payments: extract "To Loan XXXX" or "From Loan XXXX"
    const loan = desc.match(/((?:to|from)\s+loan\s+\d+)/i);
    if (loan) return loan[1].toUpperCase();
    // For share transfers: "To Share XXXX" or "From Share XXXX"
    const share = desc.match(/((?:to|from)\s+share\s+\d+)/i);
    if (share) return share[1].toUpperCase();
    // For deposit transfers
    const depTransfer = desc.match(/(deposit\s+transfer\s+(?:from|to)\s+\w+\s+\d+)/i);
    if (depTransfer) return depTransfer[1].toUpperCase();
    // For common merchants, use first 2-3 words
    const words = desc.replace(/\d{2}\/\d{2}\/\d{2,4}.*$/, '').trim().split(/\s+/);
    return words.slice(0, Math.min(3, words.length)).join(' ').toUpperCase();
}

function finCloseTxnEdit() {
    document.getElementById('txnEditModal').classList.add('hidden');
}

async function finSaveTxnEdit() {
    const txnId = document.getElementById('txnEditId').value;
    const description = document.getElementById('txnEditDesc').value.trim();
    const category = document.getElementById('txnEditCategory').value;
    const notes = document.getElementById('txnEditNotes').value.trim();
    const alwaysCheck = document.getElementById('txnAlwaysCheck').checked;
    const errorEl = document.getElementById('txnEditError');

    if (!description) { errorEl.textContent = 'Description is required'; errorEl.classList.remove('hidden'); return; }

    const { error } = await supabaseClient
        .from('member_transactions')
        .update({ description, category, notes })
        .eq('id', txnId)
        .eq('user_id', window._finUser.id);

    if (error) { errorEl.textContent = error.message; errorEl.classList.remove('hidden'); return; }

    finCloseTxnEdit();

    // Update local data and re-render
    const txn = window._finTransactions.find(t => t.id === txnId);
    if (txn) {
        txn.description = description;
        txn.category = category;
        txn.notes = notes;
    }

    // If "Always categorize this way" is checked, create a custom rule
    if (alwaysCheck) {
        const matchText = document.getElementById('txnRuleMatchPreview').textContent.trim();
        if (matchText) {
            const label = notes || description.slice(0, 40);
            const { error: ruleError } = await supabaseClient
                .from('member_category_rules')
                .upsert({ user_id: window._finUser.id, match_text: matchText, category, label }, { onConflict: 'user_id,match_text' });

            if (!ruleError) {
                await finLoadCustomRules();
                // Re-categorize other matching transactions
                await finRecategorizeByRule(matchText, category);
            } else {
                console.warn('Could not create rule:', ruleError);
            }
        }
    }

    finRenderCategoryChart();
    finRenderCategoryList();
    finRenderTxnList();
    finRenderSummaryStats();
}

// ═══════════════════════════════════════════════════════════
//  DELETE MODAL
// ═══════════════════════════════════════════════════════════

window._finDeleteTarget = null;

function finConfirmDelete(type, id, label) {
    window._finDeleteTarget = { type, id };
    document.getElementById('deleteTitle').textContent = `Delete ${type === 'statement' ? 'Statement' : 'Account'}?`;
    document.getElementById('deleteMsg').textContent = type === 'statement'
        ? `Delete "${label}" and all its transactions? This cannot be undone.`
        : `Delete this account and all data? This cannot be undone.`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function finCloseDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    window._finDeleteTarget = null;
}

async function finExecuteDelete() {
    const target = window._finDeleteTarget;
    if (!target) return;

    if (target.type === 'statement') {
        // Also delete the file from storage
        const stmt = window._finStatements.find(s => s.id === target.id);
        if (stmt?.file_url) {
            try {
                const path = stmt.file_url.split('/member-statements/')[1];
                if (path) await supabaseClient.storage.from('member-statements').remove([decodeURIComponent(path)]);
            } catch (e) { console.warn('Could not delete file from storage:', e); }
        }

        const { error } = await supabaseClient
            .from('member_statements')
            .delete()
            .eq('id', target.id)
            .eq('user_id', window._finUser.id);

        if (error) { alert('Error: ' + error.message); return; }
    } else if (target.type === 'rule') {
        await finDeleteRule(target.id);
        finCloseDeleteModal();
        return;
    }

    finCloseDeleteModal();
    await finLoadStatements();
}

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

function finFmtCents(cents) {
    const abs = Math.abs(cents);
    const str = (abs / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (cents < 0 ? '-$' : '$') + str;
}
