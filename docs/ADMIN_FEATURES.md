# Admin Features Documentation

## Admin: Change Member Contribution Amount

**Added:** February 27, 2026

### Overview
Admins can now change a member's monthly contribution amount directly from the Admin Dashboard.

### How It Works
1. Navigate to the **Admin Dashboard**.
2. Click on any **active member** row to open their detail modal.
3. In the modal, the **Monthly Amount** card now includes an input field and **Save** button.
4. Enter a new amount ($30–$250, whole dollars only) and click **Save**.
5. The change is sent to the `update-subscription` Edge Function with `admin_override: true` and the target `user_id`.
6. The backend verifies the caller is an admin before applying the change.
7. The new amount takes effect on the member's **next billing date** (no proration).

### Technical Details
- **Frontend:** `admin/index.html` (modal UI) and `js/admin.js` (form handler).
- **Backend:** `supabase/functions/update-subscription/index.ts` now accepts optional `user_id` and `admin_override` fields. If both are present, the function checks that the caller has `admin` role before proceeding.
- **Validation:** Amount must be between $30 and $250 (whole dollars). Non-admin callers cannot use the override.

### Security
- Only users with `role: 'admin'` in the `profiles` table can use the admin override.
- The admin's identity is verified via JWT before any change is made.
- Standard (non-admin) users can still only update their own subscription as before.

---

## Future Enhancements

### Admin Action Log System
A dedicated logging system should be built to track all admin actions for accountability and auditing.

**Proposed approach:**
- Create an `admin_logs` table in the database with columns such as:
  - `id` (UUID, primary key)
  - `admin_id` (UUID, references profiles.id)
  - `action` (text, e.g., "change_contribution", "deactivate_user", "invite_user")
  - `target_user_id` (UUID, nullable)
  - `details` (JSONB, stores old/new values and context)
  - `created_at` (timestamp)
- All Edge Functions performing admin actions should insert a log entry.
- The Admin Dashboard should include a page/section to view the log.

### Expanded User/Admin Permissions
- Add more granular permissions (e.g., `super_admin`, `read_only_admin`).
- Store permissions in the `profiles` table or a separate `roles`/`permissions` table.
- Gate each admin action by the required permission level.

### Transactional Email Notifications
- When an admin changes a member's contribution, the member should receive an email notification.
- Recommended providers for use with Supabase Edge Functions:
  - **Resend** — modern, developer-friendly, simple API
  - **Postmark** — excellent deliverability, clean UI
  - **Mailgun** — reliable, good API
- Integration would be done inside the relevant Edge Functions, calling the provider's REST API.
