// ─── Roles & Permissions Admin Page ─────────────────────
// CRUD for roles, permission toggle UI, drag-to-reorder.

const OWNER_ID  = '00000000-0000-0000-0000-000000000001';
const MEMBER_ID = '00000000-0000-0000-0000-000000000002';

const COLOR_PRESETS = [
    '#dc2626','#ea580c','#d97706','#65a30d','#16a34a','#0d9488',
    '#0891b2','#2563eb','#4f46e5','#7c3aed','#9333ea','#c026d3',
    '#db2777','#e11d48','#6b7280','#1e1b4b',
];

// Permission catalog — matches the 22 keys from the migration
const PERM_CATALOG = {
    Administration: [
        { key: 'admin.dashboard',     label: 'View admin dashboard' },
        { key: 'admin.roles',         label: 'Manage roles & permissions' },
        { key: 'admin.members',       label: 'View/edit member profiles' },
        { key: 'admin.invite',        label: 'Send invite links' },
        { key: 'admin.notifications', label: 'Send push notifications' },
        { key: 'admin.brand',         label: 'Edit brand settings' },
    ],
    Finances: [
        { key: 'finance.deposits',     label: 'Record manual deposits' },
        { key: 'finance.transactions', label: 'View transaction history' },
        { key: 'finance.payouts',      label: 'Send payouts' },
        { key: 'finance.profits',      label: 'View profit calculations' },
        { key: 'finance.expenses',     label: 'Manage expenses' },
        { key: 'finance.tax_prep',     label: 'Access tax prep tools' },
        { key: 'finance.investments',  label: 'Manage investments' },
    ],
    Events: [
        { key: 'events.create',     label: 'Create new events' },
        { key: 'events.manage_all', label: 'Edit/cancel any event' },
        { key: 'events.banners',    label: 'Award event banners' },
    ],
    Content: [
        { key: 'content.documents',        label: 'Manage LLC documents' },
        { key: 'content.quests',           label: 'Create/edit quests' },
        { key: 'content.banners',          label: 'Manage banner catalog' },
        { key: 'content.family_approvals', label: 'Approve family tree submissions' },
    ],
};

let allRoles = [];
let currentUser = null;
let editingRoleId = null;     // null = create mode
let panelPermissions = {};    // { 'admin.dashboard': true, ... }

// ─── Init ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth({ permission: 'admin.roles' });
    if (!currentUser) return;

    document.getElementById('btnCreateRole').addEventListener('click', () => openPanel(null));
    document.getElementById('btnClosePanel').addEventListener('click', closePanel);
    document.getElementById('btnCancelPanel').addEventListener('click', closePanel);
    document.getElementById('panelBackdrop').addEventListener('click', closePanel);
    document.getElementById('btnSaveRole').addEventListener('click', saveRole);
    document.getElementById('btnDeleteRole').addEventListener('click', promptDelete);
    document.getElementById('btnDeleteCancel').addEventListener('click', () => document.getElementById('deleteModal').classList.add('hidden'));
    document.getElementById('btnDeleteConfirm').addEventListener('click', confirmDelete);

    await loadRoles();
});

// ─── Load Roles ──────────────────────────────────────────

async function loadRoles() {
    const { data: roles, error } = await supabaseClient
        .from('roles')
        .select('*, role_permissions(permission)')
        .order('position', { ascending: true });

    if (error) { console.error('loadRoles', error); return; }

    // Get member counts per role
    const { data: memberCounts } = await supabaseClient
        .from('member_roles')
        .select('role_id');

    const countMap = {};
    (memberCounts || []).forEach(mr => {
        countMap[mr.role_id] = (countMap[mr.role_id] || 0) + 1;
    });

    allRoles = roles.map(r => ({
        ...r,
        permissions: (r.role_permissions || []).map(rp => rp.permission),
        memberCount: countMap[r.id] || 0,
    }));

    renderRoleList();
}

// ─── Render Role List ────────────────────────────────────

function renderRoleList() {
    const container = document.getElementById('roleList');

    if (!allRoles.length) {
        container.innerHTML = '<div class="p-8 text-center text-gray-400 text-sm">No roles yet. Create one to get started.</div>';
        return;
    }

    container.innerHTML = allRoles.map(role => {
        const isSystem = role.is_system;
        const canDrag = !isSystem;
        return `
        <div class="role-row flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition cursor-pointer group"
             data-role-id="${role.id}"
             ${canDrag ? 'draggable="true"' : ''}>
            ${canDrag ? `<span class="drag-handle text-gray-300 group-hover:text-gray-400 flex-shrink-0" title="Drag to reorder">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-12a2 2 0 10.001 4.001A2 2 0 0013 2zm0 6a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z"></path></svg>
            </span>` : '<span class="w-4 flex-shrink-0"></span>'}
            <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${role.color}"></span>
            <span class="text-lg flex-shrink-0">${role.icon || ''}</span>
            <div class="min-w-0 flex-1">
                <div class="font-semibold text-gray-900 text-sm truncate">${escHtml(role.name)}</div>
                <div class="text-xs text-gray-400">${role.permissions.length} permission${role.permissions.length === 1 ? '' : 's'} · ${role.memberCount} member${role.memberCount === 1 ? '' : 's'}</div>
            </div>
            ${isSystem ? '<span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">System</span>' : ''}
            <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>`;
    }).join('');

    // Click to edit
    container.querySelectorAll('.role-row').forEach(row => {
        row.addEventListener('click', e => {
            if (e.target.closest('.drag-handle')) return;
            openPanel(row.dataset.roleId);
        });
    });

    // Drag-and-drop
    initDragReorder(container);
}

function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ─── Drag-to-Reorder ────────────────────────────────────

function initDragReorder(container) {
    let draggedEl = null;

    container.querySelectorAll('.role-row[draggable="true"]').forEach(row => {
        row.addEventListener('dragstart', e => {
            draggedEl = row;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            container.querySelectorAll('.role-row').forEach(r => r.classList.remove('drag-over'));
            draggedEl = null;
        });
        row.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // Only allow drop on non-system rows or between them
            const target = row;
            const targetRole = allRoles.find(r => r.id === target.dataset.roleId);
            if (targetRole?.is_system) return;
            target.classList.add('drag-over');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', async e => {
            e.preventDefault();
            row.classList.remove('drag-over');
            if (!draggedEl || draggedEl === row) return;

            const fromId = draggedEl.dataset.roleId;
            const toId = row.dataset.roleId;
            const toRole = allRoles.find(r => r.id === toId);
            if (toRole?.is_system) return;

            // Reorder in the array (excluding system roles at top/bottom)
            const nonSystem = allRoles.filter(r => !r.is_system);
            const systems = allRoles.filter(r => r.is_system);
            const fromIdx = nonSystem.findIndex(r => r.id === fromId);
            const toIdx = nonSystem.findIndex(r => r.id === toId);
            if (fromIdx < 0 || toIdx < 0) return;

            const [moved] = nonSystem.splice(fromIdx, 1);
            nonSystem.splice(toIdx, 0, moved);

            // Recalculate positions: Owner=0, custom roles 1..N, Member=999
            const updates = nonSystem.map((r, i) => ({ id: r.id, position: i + 1 }));
            allRoles = [...systems.filter(r => r.id === OWNER_ID), ...nonSystem, ...systems.filter(r => r.id === MEMBER_ID)];

            // Re-set local positions
            allRoles.forEach(r => {
                if (r.id === OWNER_ID) { r.position = 0; return; }
                if (r.id === MEMBER_ID) { r.position = 999; return; }
                const u = updates.find(u => u.id === r.id);
                if (u) r.position = u.position;
            });

            renderRoleList();

            // Persist
            for (const u of updates) {
                await supabaseClient.from('roles').update({ position: u.position }).eq('id', u.id);
            }
        });
    });
}

// ─── Slide-Out Panel ─────────────────────────────────────

function openPanel(roleId) {
    editingRoleId = roleId;
    const role = roleId ? allRoles.find(r => r.id === roleId) : null;
    const isSystem = role?.is_system ?? false;
    const isCreate = !role;

    document.getElementById('panelTitle').textContent = isCreate ? 'Create Role' : (isSystem ? `${role.name} (System)` : `Edit ${role.name}`);

    // Name
    const nameInput = document.getElementById('roleName');
    nameInput.value = role?.name || '';
    nameInput.disabled = isSystem;

    // Icon
    const iconInput = document.getElementById('roleIcon');
    iconInput.value = role?.icon || '';
    iconInput.disabled = isSystem;

    // Color swatches
    const selectedColor = role?.color || COLOR_PRESETS[0];
    renderColorSwatches(selectedColor, isSystem);

    // Permissions
    panelPermissions = {};
    const existingPerms = role ? role.permissions : [];
    for (const cat of Object.values(PERM_CATALOG)) {
        for (const p of cat) {
            panelPermissions[p.key] = existingPerms.includes(p.key);
        }
    }
    renderPermAccordion(isSystem);

    // Delete button
    const deleteBtn = document.getElementById('btnDeleteRole');
    deleteBtn.classList.toggle('hidden', isCreate || isSystem);

    // Save button label
    document.getElementById('btnSaveRole').textContent = isCreate ? 'Create' : 'Save';
    document.getElementById('btnSaveRole').classList.toggle('hidden', isSystem);
    document.getElementById('btnCancelPanel').textContent = isSystem ? 'Close' : 'Cancel';

    // Open
    document.getElementById('panelBackdrop').classList.add('open');
    document.getElementById('rolePanel').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closePanel() {
    document.getElementById('panelBackdrop').classList.remove('open');
    document.getElementById('rolePanel').classList.remove('open');
    document.body.style.overflow = '';
    editingRoleId = null;
}

// ─── Color Swatches ──────────────────────────────────────

function renderColorSwatches(selected, disabled) {
    const container = document.getElementById('colorSwatches');
    container.innerHTML = COLOR_PRESETS.map(c => `
        <button type="button" class="color-swatch ${c === selected ? 'selected' : ''}" data-color="${c}" style="background:${c}" ${disabled ? 'disabled' : ''}></button>
    `).join('');

    if (!disabled) {
        container.querySelectorAll('.color-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }
}

function getSelectedColor() {
    const sel = document.querySelector('#colorSwatches .color-swatch.selected');
    return sel?.dataset.color || COLOR_PRESETS[0];
}

// ─── Permission Accordion ────────────────────────────────

function renderPermAccordion(readOnly) {
    const container = document.getElementById('permAccordion');
    container.innerHTML = '';

    for (const [category, perms] of Object.entries(PERM_CATALOG)) {
        const catEnabledCount = perms.filter(p => panelPermissions[p.key]).length;

        const section = document.createElement('div');
        section.className = 'border border-gray-200 rounded-xl overflow-hidden';
        section.innerHTML = `
            <button type="button" class="perm-cat-header w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left">
                <span class="text-sm font-semibold text-gray-700">${category}</span>
                <span class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 perm-cat-count">${catEnabledCount}/${perms.length}</span>
                    <svg class="w-4 h-4 text-gray-400 transition perm-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </button>
            <div class="perm-cat-body hidden">
                ${!readOnly ? `<div class="px-4 pt-2 pb-1 flex gap-3">
                    <button type="button" class="text-xs font-medium text-brand-600 hover:underline select-all-btn">Select All</button>
                    <button type="button" class="text-xs font-medium text-gray-400 hover:underline deselect-all-btn">Deselect All</button>
                </div>` : ''}
                <div class="divide-y divide-gray-100">
                    ${perms.map(p => `
                    <div class="flex items-center justify-between px-4 py-2.5">
                        <div class="min-w-0">
                            <div class="text-sm text-gray-700 font-medium">${p.label}</div>
                            <div class="text-[11px] text-gray-400 font-mono">${p.key}</div>
                        </div>
                        <div class="perm-toggle ${panelPermissions[p.key] ? 'on' : ''}" data-perm="${p.key}" ${readOnly ? 'style="opacity:.5;pointer-events:none"' : ''}></div>
                    </div>`).join('')}
                </div>
            </div>`;

        // Accordion toggle
        section.querySelector('.perm-cat-header').addEventListener('click', () => {
            const body = section.querySelector('.perm-cat-body');
            const chevron = section.querySelector('.perm-chevron');
            body.classList.toggle('hidden');
            chevron.style.transform = body.classList.contains('hidden') ? '' : 'rotate(180deg)';
        });

        // Toggle switches
        if (!readOnly) {
            section.querySelectorAll('.perm-toggle').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const key = toggle.dataset.perm;
                    panelPermissions[key] = !panelPermissions[key];
                    toggle.classList.toggle('on', panelPermissions[key]);
                    updateCatCount(section, category);
                });
            });

            // Select All / Deselect All
            section.querySelector('.select-all-btn')?.addEventListener('click', () => {
                perms.forEach(p => { panelPermissions[p.key] = true; });
                section.querySelectorAll('.perm-toggle').forEach(t => t.classList.add('on'));
                updateCatCount(section, category);
            });
            section.querySelector('.deselect-all-btn')?.addEventListener('click', () => {
                perms.forEach(p => { panelPermissions[p.key] = false; });
                section.querySelectorAll('.perm-toggle').forEach(t => t.classList.remove('on'));
                updateCatCount(section, category);
            });
        }

        container.appendChild(section);
    }
}

function updateCatCount(section, category) {
    const perms = PERM_CATALOG[category];
    const count = perms.filter(p => panelPermissions[p.key]).length;
    section.querySelector('.perm-cat-count').textContent = `${count}/${perms.length}`;
}

// ─── Save Role ───────────────────────────────────────────

async function saveRole() {
    const name = document.getElementById('roleName').value.trim();
    if (!name) { alert('Role name is required.'); return; }

    const btn = document.getElementById('btnSaveRole');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const color = getSelectedColor();
    const icon = document.getElementById('roleIcon').value.trim();
    const enabledPerms = Object.entries(panelPermissions).filter(([, v]) => v).map(([k]) => k);

    try {
        if (editingRoleId) {
            // ── Update existing role ──
            const { error } = await supabaseClient.from('roles').update({ name, color, icon }).eq('id', editingRoleId);
            if (error) throw error;

            // Sync permissions: delete all, re-insert enabled
            await supabaseClient.from('role_permissions').delete().eq('role_id', editingRoleId);
            if (enabledPerms.length) {
                const rows = enabledPerms.map(p => ({ role_id: editingRoleId, permission: p }));
                const { error: permErr } = await supabaseClient.from('role_permissions').insert(rows);
                if (permErr) throw permErr;
            }

            // Audit
            await supabaseClient.from('role_audit_log').insert({
                actor_id: currentUser.id,
                action: 'role_updated',
                role_id: editingRoleId,
                details: { name, permissions: enabledPerms },
            });
        } else {
            // ── Create new role ──
            // Position: right before Member (999), after last custom role
            const maxPos = allRoles.filter(r => r.id !== MEMBER_ID).reduce((m, r) => Math.max(m, r.position), 0);
            const { data: newRole, error } = await supabaseClient.from('roles').insert({
                name, color, icon, position: maxPos + 1, is_system: false,
            }).select().single();
            if (error) throw error;

            if (enabledPerms.length) {
                const rows = enabledPerms.map(p => ({ role_id: newRole.id, permission: p }));
                const { error: permErr } = await supabaseClient.from('role_permissions').insert(rows);
                if (permErr) throw permErr;
            }

            // Audit
            await supabaseClient.from('role_audit_log').insert({
                actor_id: currentUser.id,
                action: 'role_created',
                role_id: newRole.id,
                details: { name, permissions: enabledPerms },
            });
        }

        closePanel();
        await loadRoles();
    } catch (err) {
        console.error('saveRole', err);
        alert('Failed to save role: ' + (err.message || err));
    } finally {
        btn.disabled = false;
        btn.textContent = editingRoleId ? 'Save' : 'Create';
    }
}

// ─── Delete Role ─────────────────────────────────────────

function promptDelete() {
    const role = allRoles.find(r => r.id === editingRoleId);
    if (!role || role.is_system) return;

    document.getElementById('deleteMsg').textContent =
        `"${role.name}" is assigned to ${role.memberCount} member${role.memberCount === 1 ? '' : 's'}. They will lose all permissions from this role. This cannot be undone.`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

async function confirmDelete() {
    const roleId = editingRoleId;
    const role = allRoles.find(r => r.id === roleId);
    if (!role || role.is_system) return;

    const btn = document.getElementById('btnDeleteConfirm');
    btn.disabled = true;
    btn.textContent = 'Deleting…';

    try {
        // Cascade: role_permissions & member_roles are ON DELETE CASCADE
        const { error } = await supabaseClient.from('roles').delete().eq('id', roleId);
        if (error) throw error;

        // Audit
        await supabaseClient.from('role_audit_log').insert({
            actor_id: currentUser.id,
            action: 'role_deleted',
            role_id: roleId,
            details: { name: role.name, affected_members: role.memberCount },
        });

        document.getElementById('deleteModal').classList.add('hidden');
        closePanel();
        await loadRoles();
    } catch (err) {
        console.error('deleteRole', err);
        alert('Failed to delete role: ' + (err.message || err));
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
    }
}
