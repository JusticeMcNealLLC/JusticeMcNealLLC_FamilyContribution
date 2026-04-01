# PA-RM-01: Roles & Permissions Admin Page

**Goal:** Build a Discord-style roles & permissions system — admin page to create/edit/delete roles, assign granular permissions per role, and manage which members hold which roles.

**Status:** Planning

---

## Current System Audit

### What Exists Today

**Global roles** (`profiles.role`):
| Role | Description |
|------|-------------|
| `member` | Default. Portal access only. |
| `admin` | Full access to every admin page, every RLS policy, every edge function. |

**Event-specific roles** (`event_hosts.role` — scoped to a single event):
| Role | Description |
|------|-------------|
| `checkin_staff` | Can scan attendee QR codes at an event. |
| `co_host` | Elevated host permissions for an event. |

**How admin is enforced:**
- **Database:** `public.is_admin()` SQL function (SECURITY DEFINER) → used in ~80+ RLS policies across 30+ tables
- **Frontend:** `checkAuth(true)` in every admin JS file → redirects non-admins to `/portal/`
- **Edge Functions:** 6 functions explicitly check `profile.role !== 'admin'`
- **Nav:** "Admin Hub" link dynamically injected only for `role === 'admin'`

### Problems with the Current System

1. **Binary access** — you're either a full admin or a regular member. No middle ground.
2. **No delegation** — can't give someone access to *just* events or *just* finances without making them a full admin.
3. **No audit trail** — no record of who granted/revoked roles or when.
4. **Hardcoded strings** — `'admin'` and `'member'` are magic strings scattered across 80+ RLS policies, 17 admin pages, 14 JS files, and 6 edge functions.
5. **Event roles isolated** — `event_hosts.role` lives in its own silo with no connection to the global permission system.
6. **No permission groups** — every admin page is all-or-nothing. Can't say "this role can view expenses but not edit them."

---

## New System Design (Discord-Style)

### Concept

Roles are named groups with a set of **permissions** (boolean flags). Members can hold multiple roles. Access is granted if **any** of the member's roles has the required permission. Roles have a **position** (priority order) — higher-positioned roles override lower ones (like Discord).

### Permission Categories & Keys

#### Administration
| Key | Description |
|-----|-------------|
| `admin.dashboard` | View admin dashboard |
| `admin.roles` | Create/edit/delete roles and assign to members |
| `admin.members` | View/edit member profiles, deactivate/reactivate |
| `admin.invite` | Send invite links |
| `admin.notifications` | Send push notifications to members |
| `admin.brand` | Edit brand settings (logo, colors) |

#### Finances
| Key | Description |
|-----|-------------|
| `finance.deposits` | View and record manual deposits |
| `finance.transactions` | View transaction history |
| `finance.payouts` | View and send payouts |
| `finance.profits` | View profit calculations |
| `finance.expenses` | View/create/edit expenses |
| `finance.tax_prep` | Access tax prep tools |
| `finance.investments` | Manage investment dashboard |

#### Events
| Key | Description |
|-----|-------------|
| `events.create` | Create new events (any type) |
| `events.manage_all` | Edit/cancel/delete any event (not just own) |
| `events.banners` | Award event banners/cosmetics |

#### Content
| Key | Description |
|-----|-------------|
| `content.documents` | Upload/manage LLC documents |
| `content.quests` | Create/edit quests |
| `content.banners` | Manage banner cosmetics catalog |
| `content.family_approvals` | Approve/reject family tree submissions |

---

## Implementation Roadmap

### Step 1 — Database: Roles & Permissions Tables ✅
- [x] Create `roles` table (`id UUID`, `name TEXT`, `color TEXT`, `icon TEXT`, `position INT`, `is_system BOOL`, `created_at`, `updated_at`)
- [x] Create `role_permissions` table (`role_id UUID`, `permission TEXT`, `PRIMARY KEY(role_id, permission)`)
- [x] Create `member_roles` table (`user_id UUID`, `role_id UUID`, `granted_by UUID`, `granted_at TIMESTAMPTZ`, `PRIMARY KEY(user_id, role_id)`)
- [x] Create `role_audit_log` table (`id UUID`, `actor_id UUID`, `action TEXT`, `target_user_id UUID`, `role_id UUID`, `details JSONB`, `created_at`)
- [x] Seed system roles: **Owner** (all permissions, undeletable, position 0) and **Member** (default, basic portal access, undeletable)
- [x] Create `public.has_permission(permission_key TEXT)` SQL function (SECURITY DEFINER) — checks if `auth.uid()` holds any role with the given permission
- [x] Create `public.is_owner()` SQL function — checks if user has the Owner system role
- [x] Add indexes: `member_roles(user_id)`, `member_roles(role_id)`, `role_permissions(permission)`

### Step 2 — Migration Bridge: Backward Compatibility ✅
- [x] Migrate existing `admin` users → assign them the **Owner** role in `member_roles`
- [x] Migrate existing `member` users → assign them the **Member** role in `member_roles`
- [x] Keep `profiles.role` column for now (read-only, synced via trigger on `member_roles` changes)
- [x] Create trigger: when `member_roles` changes, update `profiles.role` to `'admin'` if user has any role with `admin.dashboard`, else `'member'`
- [x] `is_admin()` function stays working during transition — no RLS policies need to change yet
- [x] Update `checkAuth()` to also fetch user's roles + permissions and expose `userPermissions` globally

### Step 3 — Admin Page: Roles Management UI ✅
- [x] Create `admin/roles.html` — protected by `checkAuth(true)` + `admin.roles` permission
- [x] Create `js/admin/roles.js` — page controller
- [x] **Role list view:**
  - [x] List all roles ordered by position (drag-to-reorder)
  - [x] Show role name, color dot, member count, system badge (if system role)
  - [x] "Create Role" button at top
- [x] **Role editor (slide-out panel or modal):**
  - [x] Name field (text input)
  - [x] Color picker (hex color for the role chip)
  - [x] Icon/emoji picker (optional)
  - [x] Permission toggles — grouped by category (Administration, Finances, Events, Content)
  - [x] Each permission is a toggle switch with description
  - [x] "Select All" / "Deselect All" per category
  - [x] System roles: name + permissions are read-only, can't be deleted
- [x] **Role deletion:**
  - [x] Confirm modal: "X members have this role. They will lose these permissions."
  - [x] Cascade: remove from `member_roles`, delete `role_permissions`, delete role
  - [x] Cannot delete system roles (Owner, Member)
- [x] **Role ordering:**
  - [x] Drag-and-drop reorder (higher position = higher priority)
  - [x] Owner always at top, Member always at bottom
  - [x] Position determines hierarchy display in member profiles

### Step 4 — Admin Page: Member Role Assignment ✅
- [x] Add "Roles" column to existing `admin/members.html` table
  - [x] Show colored role chips next to each member name
  - [x] Click member row → role assignment panel
- [x] **Role assignment panel:**
  - [x] Checkboxes for each role (multi-select — members can hold multiple roles)
  - [x] Owner role: only assignable by another Owner
  - [x] Show warning when removing last admin-level role from a member
  - [x] Changes write to `member_roles` + `role_audit_log`
- [ ] **Bulk actions:**
  - [ ] Select multiple members → "Assign Role" / "Remove Role" dropdown
  - [ ] Confirmation: "Apply [Role] to X members?"

### Step 5 — Permission Enforcement: Frontend
- [ ] Create `js/auth/permissions.js` — utility module
  - [ ] `hasPermission('finance.expenses')` → checks cached permissions
  - [ ] `hasAnyPermission(['finance.expenses', 'finance.transactions'])` → OR check
  - [ ] `hasAllPermissions([...])` → AND check
- [ ] Update `checkAuth()` to accept permission string: `checkAuth({ permission: 'finance.expenses' })`
  - [ ] Keep backward compat: `checkAuth(true)` still works (checks `admin.dashboard`)
- [ ] Update each admin page to require its specific permission:
  - [ ] `admin/deposits.html` → `finance.deposits`
  - [ ] `admin/expenses.html` → `finance.expenses`
  - [ ] `admin/events.html` → `events.manage_all`
  - [ ] `admin/investments.html` → `finance.investments`
  - [ ] `admin/documents.html` → `content.documents`
  - [ ] `admin/quests.html` → `content.quests`
  - [ ] `admin/members.html` → `admin.members`
  - [ ] `admin/notifications.html` → `admin.notifications`
  - [ ] `admin/payouts.html` → `finance.payouts`
  - [ ] `admin/profits.html` → `finance.profits`
  - [ ] `admin/tax-prep.html` → `finance.tax_prep`
  - [ ] `admin/transactions.html` → `finance.transactions`
  - [ ] `admin/banners.html` → `content.banners`
  - [ ] `admin/brand.html` → `admin.brand`
  - [ ] `admin/invite.html` → `admin.invite`
  - [ ] `admin/family-approvals.html` → `content.family_approvals`
  - [ ] `admin/roles.html` → `admin.roles`
- [ ] Update admin nav/sidebar to only show links for pages user has permission for
- [ ] Update portal "Create Event" button: show if user has `events.create` (not just `role === 'admin'`)

### Step 6 — Permission Enforcement: Database (RLS)
- [ ] Create `has_permission(TEXT)` Postgres function (SECURITY DEFINER, SET search_path = public)
- [ ] Gradually migrate RLS policies from `is_admin()` → `has_permission('...')`
  - [ ] Start with low-risk tables: `llc_expenses`, `llc_documents`
  - [ ] Then financial tables: `manual_deposits`, `investment_*`
  - [ ] Then event tables: `events`, `event_cost_items`
  - [ ] Then all remaining admin-gated tables
- [ ] Keep `is_admin()` as a wrapper: `RETURN has_permission('admin.dashboard')` — zero breakage
- [ ] Update edge functions to use permission checks instead of `role !== 'admin'`

### Step 7 — Audit Log & Role Display
- [ ] **Audit log page** (within roles admin):
  - [ ] Filterable table: who changed what role, for whom, when
  - [ ] Actions: `role_created`, `role_updated`, `role_deleted`, `role_assigned`, `role_removed`, `permissions_changed`
- [ ] **Member profile cosmetic integration:**
  - [ ] Show highest-positioned role as colored chip on profile
  - [ ] Role color appears in member lists, event attendee lists, feed posts
  - [ ] Multiple roles visible on full profile page (click to expand)
- [ ] **Portal visibility:**
  - [ ] Members can see their own roles on settings page
  - [ ] Role names visible on other members' profiles (role chips)

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/XXX_roles_permissions.sql` | Tables, functions, seeds, indexes |
| Create | `supabase/migrations/XXX_migrate_roles.sql` | Bridge migration, sync trigger |
| Create | `admin/roles.html` | Roles admin page |
| Create | `js/admin/roles.js` | Roles page controller |
| Create | `js/auth/permissions.js` | Permission utility module |
| Modify | `js/auth.js` | Load roles/permissions on auth, update `checkAuth()` |
| Modify | `js/components/layout.js` | Dynamic admin nav based on permissions |
| Modify | `js/admin/*.js` (all 14) | Update each to require specific permission |
| Modify | `admin/members.html` | Add role chips + assignment UI |
| Modify | `js/admin/hub.js` | Filter dashboard tiles by permission |
| Modify | `js/portal/events/init.js` | Use `events.create` permission instead of `role === 'admin'` |

---

## Testing Checklist
- [ ] Owner role has all permissions and cannot be deleted
- [ ] Member role is auto-assigned to new signups
- [ ] Creating a custom role with specific permissions works
- [ ] Assigning role to member grants access to correct pages
- [ ] Removing role revokes access immediately
- [ ] Member with no admin permissions cannot access any admin page
- [ ] Member with `finance.expenses` can access expenses but not investments
- [ ] Drag-to-reorder updates position correctly
- [ ] Deleting a role removes it from all members
- [ ] Audit log records all role changes
- [ ] `profiles.role` stays in sync via trigger (backward compat)
- [ ] Existing `is_admin()` RLS policies still work during transition
- [ ] Edge functions respect new permission system
- [ ] Admin nav only shows pages user has permission for
- [ ] Multiple roles combine permissions correctly (OR logic)

---

**Last Updated:** March 31, 2026