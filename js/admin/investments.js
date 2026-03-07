// Admin Investment Management
// Handles CSV upload, manual entry, and snapshot history

// Ticker → Proper Fund Name lookup (Fidelity CSVs store account name in Description)
const FUND_NAME_MAP = {
    'VTI': 'Vanguard Total Stock Market ETF',
    'VXUS': 'Vanguard Total International Stock ETF',
    'VIG': 'Vanguard Dividend Appreciation ETF',
    'SPAXX': 'Fidelity Government Money Market',
    'SPAXX**': 'Fidelity Government Money Market',
    'VOO': 'Vanguard S&P 500 ETF',
    'VNQ': 'Vanguard Real Estate ETF',
    'BND': 'Vanguard Total Bond Market ETF',
    'VBTLX': 'Vanguard Total Bond Market Index',
    'FXAIX': 'Fidelity 500 Index Fund',
    'FSKAX': 'Fidelity Total Market Index Fund',
    'FTIHX': 'Fidelity Total International Index Fund',
};

let parsedCsvData = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async function () {
    currentUser = await checkAuth(true);
    if (!currentUser) return;

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('csvDate').value = today;
    document.getElementById('manualDate').value = today;

    // CSV drag & drop
    setupCsvUpload();

    // Add default fund rows
    const defaultFunds = [
        { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF' },
        { ticker: 'VXUS', name: 'Vanguard Total International Stock ETF' },
        { ticker: 'VIG', name: 'Vanguard Dividend Appreciation ETF' },
        { ticker: 'SPAXX', name: 'Fidelity Government Money Market' },
    ];
    defaultFunds.forEach(f => addHoldingRow(f.ticker, f.name));

    // Load snapshot history
    await loadSnapshots();
});

// ─── Tab Switching ──────────────────────────────────────
function switchTab(tab) {
    const csvTab = document.getElementById('tabCsv');
    const manualTab = document.getElementById('tabManual');
    const csvPanel = document.getElementById('panelCsv');
    const manualPanel = document.getElementById('panelManual');

    if (tab === 'csv') {
        csvTab.className = 'flex-1 px-4 py-3 text-sm font-semibold text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 transition';
        manualTab.className = 'flex-1 px-4 py-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition';
        csvPanel.classList.remove('hidden');
        manualPanel.classList.add('hidden');
    } else {
        manualTab.className = 'flex-1 px-4 py-3 text-sm font-semibold text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 transition';
        csvTab.className = 'flex-1 px-4 py-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition';
        manualPanel.classList.remove('hidden');
        csvPanel.classList.add('hidden');
    }
}

// ─── CSV Upload ─────────────────────────────────────────
function setupCsvUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('csvFileInput');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-brand-400', 'bg-brand-50/30');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-brand-400', 'bg-brand-50/30');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-brand-400', 'bg-brand-50/30');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            processCsvFile(file);
        } else {
            showCsvError('Please upload a .csv file');
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processCsvFile(file);
    });
}

function processCsvFile(file) {
    hideMessages('csv');
    document.getElementById('csvFileName').textContent = file.name;
    document.getElementById('csvFileName').classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            parsedCsvData = parseFidelityCsv(e.target.result);
            if (parsedCsvData.length === 0) {
                showCsvError('No valid holdings found in CSV. Make sure it contains columns like Symbol, Description, Quantity, Last Price, Current Value.');
                return;
            }
            renderCsvPreview(parsedCsvData);
        } catch (err) {
            showCsvError('Failed to parse CSV: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function parseFidelityCsv(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV file appears empty');

    // Find header row (Fidelity CSVs sometimes have metadata rows before headers)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const lower = lines[i].toLowerCase();
        if (lower.includes('symbol') || lower.includes('ticker')) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) throw new Error('Could not find header row with Symbol column');

    const headers = parseCsvLine(lines[headerIdx]).map(h => h.trim().toLowerCase());
    const symbolIdx = headers.findIndex(h => h === 'symbol' || h === 'ticker');
    const nameIdx = headers.findIndex(h => h.includes('description') || h.includes('name'));
    const sharesIdx = headers.findIndex(h => h.includes('quantity') || h.includes('shares'));
    const priceIdx = headers.findIndex(h => h.includes('last price') || h.includes('price'));
    const valueIdx = headers.findIndex(h => h.includes('current value') || h.includes('market value') || h.includes('value'));

    if (symbolIdx === -1) throw new Error('Could not find Symbol/Ticker column');

    const holdings = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCsvLine(line);
        const ticker = (cols[symbolIdx] || '').trim().replace(/"/g, '');
        if (!ticker || ticker.toLowerCase().includes('total') || ticker === '--') continue;

        const name = nameIdx >= 0 ? (cols[nameIdx] || '').trim().replace(/"/g, '') : ticker;
        // Use known fund name if CSV description is generic (e.g., account name)
        const resolvedName = FUND_NAME_MAP[ticker] || FUND_NAME_MAP[ticker.replace(/\*+$/, '')] ||
            (name.toLowerCase().includes('limited liability') || name.toLowerCase().includes('individual') || name.toLowerCase().includes('account') ? ticker : name);
        const shares = sharesIdx >= 0 ? parseFloat((cols[sharesIdx] || '0').replace(/[$,"\s]/g, '')) || 0 : 0;
        const price = priceIdx >= 0 ? parseFloat((cols[priceIdx] || '0').replace(/[$,"\s]/g, '')) || 0 : 0;
        let value = valueIdx >= 0 ? parseFloat((cols[valueIdx] || '0').replace(/[$,"\s]/g, '')) || 0 : shares * price;

        if (value <= 0 && shares > 0 && price > 0) value = shares * price;

        holdings.push({ ticker, name: resolvedName, shares, price, value });
    }
    return holdings;
}

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

function renderCsvPreview(data) {
    const body = document.getElementById('csvPreviewBody');
    let total = 0;
    body.innerHTML = data.map(h => {
        total += h.value;
        return `<tr class="border-b border-gray-100 last:border-0">
            <td class="py-2 pr-4 font-mono font-semibold text-brand-700">${h.ticker}</td>
            <td class="py-2 pr-4 text-gray-700">${h.name}</td>
            <td class="py-2 pr-4 text-right text-gray-600">${h.shares.toFixed(4)}</td>
            <td class="py-2 pr-4 text-right text-gray-600">$${h.price.toFixed(2)}</td>
            <td class="py-2 text-right font-semibold text-gray-900">$${h.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>`;
    }).join('');
    document.getElementById('csvPreviewTotal').textContent = '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('csvPreview').classList.remove('hidden');
}

function clearCsvPreview() {
    parsedCsvData = [];
    document.getElementById('csvPreview').classList.add('hidden');
    document.getElementById('csvFileName').classList.add('hidden');
    document.getElementById('csvFileInput').value = '';
    hideMessages('csv');
}

async function saveCsvSnapshot() {
    if (parsedCsvData.length === 0) return;
    const date = document.getElementById('csvDate').value;
    if (!date) { showCsvError('Please select a snapshot date'); return; }

    const btn = document.getElementById('csvSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    hideMessages('csv');

    try {
        const totalCents = Math.round(parsedCsvData.reduce((s, h) => s + h.value, 0) * 100);
        const fileName = document.getElementById('csvFileName').textContent;

        // Insert snapshot
        const { data: snapshot, error: snapErr } = await supabaseClient
            .from('investment_snapshots')
            .insert({
                snapshot_date: date,
                total_value_cents: totalCents,
                source: 'csv_upload',
                original_filename: fileName,
                uploaded_by: currentUser.id,
                notes: `CSV upload: ${fileName}`,
            })
            .select()
            .single();

        if (snapErr) throw snapErr;

        // Insert holdings
        const holdings = parsedCsvData.map(h => ({
            snapshot_id: snapshot.id,
            fund_ticker: h.ticker,
            fund_name: h.name,
            shares: h.shares,
            price_per_share_cents: Math.round(h.price * 100),
            market_value_cents: Math.round(h.value * 100),
            allocation_percent: totalCents > 0 ? parseFloat(((h.value * 100 / (totalCents / 100)) ).toFixed(2)) : 0,
        }));

        const { error: holdErr } = await supabaseClient
            .from('investment_holdings')
            .insert(holdings);

        if (holdErr) throw holdErr;

        document.getElementById('csvSuccess').textContent = 'Snapshot saved successfully!';
        document.getElementById('csvSuccess').classList.remove('hidden');
        clearCsvPreview();
        await loadSnapshots();
    } catch (err) {
        showCsvError('Failed to save: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Snapshot';
    }
}

// ─── Manual Entry ───────────────────────────────────────
let holdingRowCount = 0;

function addHoldingRow(ticker = '', name = '') {
    holdingRowCount++;
    const id = holdingRowCount;
    const container = document.getElementById('holdingRows');
    const row = document.createElement('div');
    row.id = `holdingRow${id}`;
    row.className = 'bg-surface-50 rounded-xl p-3 sm:p-4';
    row.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3 items-end">
            <div class="sm:col-span-2">
                <label class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Ticker</label>
                <input type="text" class="holding-ticker w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono font-semibold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" value="${ticker}" placeholder="VTI">
            </div>
            <div class="sm:col-span-4">
                <label class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fund Name</label>
                <input type="text" class="holding-name w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" value="${name}" placeholder="Vanguard Total Stock Market ETF">
            </div>
            <div class="sm:col-span-2">
                <label class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Shares</label>
                <input type="number" step="0.0001" class="holding-shares w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" placeholder="0.0000" oninput="updateManualTotal()">
            </div>
            <div class="sm:col-span-2">
                <label class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Price</label>
                <input type="number" step="0.01" class="holding-price w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" placeholder="0.00" oninput="updateManualTotal()">
            </div>
            <div class="sm:col-span-1 flex items-end">
                <div class="holding-value text-sm font-semibold text-emerald-600 py-2 px-1 whitespace-nowrap">$0.00</div>
            </div>
            <div class="sm:col-span-1 flex items-end justify-end">
                <button type="button" onclick="removeHoldingRow(${id})" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>
    `;
    container.appendChild(row);
}

function removeHoldingRow(id) {
    const row = document.getElementById(`holdingRow${id}`);
    if (row) {
        row.remove();
        updateManualTotal();
    }
}

function updateManualTotal() {
    let total = 0;
    document.querySelectorAll('#holdingRows > div').forEach(row => {
        const shares = parseFloat(row.querySelector('.holding-shares')?.value) || 0;
        const price = parseFloat(row.querySelector('.holding-price')?.value) || 0;
        const value = shares * price;
        const valueEl = row.querySelector('.holding-value');
        if (valueEl) valueEl.textContent = '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        total += value;
    });
    document.getElementById('manualTotal').textContent = '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function saveManualSnapshot() {
    const date = document.getElementById('manualDate').value;
    const notes = document.getElementById('manualNotes').value;
    if (!date) { showManualError('Please select a snapshot date'); return; }

    // Gather holdings from rows
    const holdings = [];
    let totalValue = 0;
    document.querySelectorAll('#holdingRows > div').forEach(row => {
        const ticker = row.querySelector('.holding-ticker')?.value.trim().toUpperCase();
        const name = row.querySelector('.holding-name')?.value.trim();
        const shares = parseFloat(row.querySelector('.holding-shares')?.value) || 0;
        const price = parseFloat(row.querySelector('.holding-price')?.value) || 0;
        const value = shares * price;
        if (ticker && (shares > 0 || price > 0)) {
            holdings.push({ ticker, name: name || ticker, shares, price, value });
            totalValue += value;
        }
    });

    if (holdings.length === 0) { showManualError('Please add at least one holding with shares and price'); return; }

    const btn = document.getElementById('manualSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    hideMessages('manual');

    try {
        const totalCents = Math.round(totalValue * 100);

        const { data: snapshot, error: snapErr } = await supabaseClient
            .from('investment_snapshots')
            .insert({
                snapshot_date: date,
                total_value_cents: totalCents,
                source: 'manual',
                uploaded_by: currentUser.id,
                notes: notes || 'Manual entry',
            })
            .select()
            .single();

        if (snapErr) throw snapErr;

        const holdingRows = holdings.map(h => ({
            snapshot_id: snapshot.id,
            fund_ticker: h.ticker,
            fund_name: h.name,
            shares: h.shares,
            price_per_share_cents: Math.round(h.price * 100),
            market_value_cents: Math.round(h.value * 100),
            allocation_percent: totalCents > 0 ? parseFloat(((h.value / totalValue) * 100).toFixed(2)) : 0,
        }));

        const { error: holdErr } = await supabaseClient.from('investment_holdings').insert(holdingRows);
        if (holdErr) throw holdErr;

        document.getElementById('manualSuccess').textContent = 'Snapshot saved successfully!';
        document.getElementById('manualSuccess').classList.remove('hidden');

        // Reset shares and prices
        document.querySelectorAll('#holdingRows .holding-shares').forEach(el => el.value = '');
        document.querySelectorAll('#holdingRows .holding-price').forEach(el => el.value = '');
        document.querySelectorAll('#holdingRows .holding-value').forEach(el => el.textContent = '$0.00');
        document.getElementById('manualTotal').textContent = '$0.00';

        await loadSnapshots();
    } catch (err) {
        showManualError('Failed to save: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Snapshot';
    }
}

// ─── Snapshot History ───────────────────────────────────
async function loadSnapshots() {
    const list = document.getElementById('snapshotList');
    const empty = document.getElementById('noSnapshots');
    const countBadge = document.getElementById('snapshotCount');

    try {
        const { data: snapshots, error } = await supabaseClient
            .from('investment_snapshots')
            .select('*')
            .order('snapshot_date', { ascending: false });

        if (error) throw error;

        if (!snapshots || snapshots.length === 0) {
            list.classList.add('hidden');
            empty.classList.remove('hidden');
            countBadge.classList.add('hidden');
            return;
        }

        empty.classList.add('hidden');
        list.classList.remove('hidden');
        countBadge.textContent = `${snapshots.length} snapshot${snapshots.length !== 1 ? 's' : ''}`;
        countBadge.classList.remove('hidden');

        list.innerHTML = snapshots.map((snap, i) => {
            const value = (snap.total_value_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            const date = new Date(snap.snapshot_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const isLatest = i === 0;
            const sourceIcon = snap.source === 'csv_upload'
                ? '<svg class="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>'
                : '<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
            const sourceLabel = snap.source === 'csv_upload' ? 'CSV Upload' : 'Manual Entry';

            // Calculate change from previous
            let changeHtml = '';
            if (i < snapshots.length - 1) {
                const prevValue = snapshots[i + 1].total_value_cents;
                const diff = snap.total_value_cents - prevValue;
                if (diff > 0) {
                    changeHtml = `<span class="text-xs font-medium text-emerald-600">+$${(diff / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`;
                } else if (diff < 0) {
                    changeHtml = `<span class="text-xs font-medium text-red-600">-$${(Math.abs(diff) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`;
                }
            }

            return `<div class="bg-white rounded-2xl border ${isLatest ? 'border-brand-200 ring-1 ring-brand-100' : 'border-gray-200/80'} p-4 sm:p-5 card-hover fade-in">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 ${isLatest ? 'bg-brand-100' : 'bg-gray-100'} rounded-xl flex items-center justify-center flex-shrink-0">
                        ${sourceIcon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-gray-900">${date}</span>
                            ${isLatest ? '<span class="text-[10px] font-semibold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded-full">LATEST</span>' : ''}
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-xs text-gray-500">${sourceLabel}</span>
                            ${snap.original_filename ? `<span class="text-xs text-gray-400 truncate max-w-[150px]">&middot; ${snap.original_filename}</span>` : ''}
                        </div>
                        ${snap.notes && snap.notes !== 'Manual entry' && !snap.notes.startsWith('CSV upload:') ? `<div class="text-xs text-gray-500 mt-1">${snap.notes}</div>` : ''}
                    </div>
                    <div class="text-right flex-shrink-0">
                        <div class="font-bold text-gray-900">${value}</div>
                        ${changeHtml}
                    </div>
                    <button onclick="deleteSnapshot('${snap.id}')" class="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0" title="Delete snapshot">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error('Failed to load snapshots:', err);
        list.innerHTML = '<div class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">Failed to load snapshot history</div>';
    }
}

async function deleteSnapshot(id) {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return;
    try {
        const { error } = await supabaseClient
            .from('investment_snapshots')
            .delete()
            .eq('id', id);
        if (error) throw error;
        await loadSnapshots();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

// ─── Helpers ────────────────────────────────────────────
function showCsvError(msg) {
    const el = document.getElementById('csvError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function showManualError(msg) {
    const el = document.getElementById('manualError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideMessages(prefix) {
    document.getElementById(`${prefix}Error`)?.classList.add('hidden');
    document.getElementById(`${prefix}Success`)?.classList.add('hidden');
}
