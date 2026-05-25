# 📁 Admin Documents Vault — Page Spec

**Status:** 🔲 Not Started (Planned)  
**Priority:** Medium — build alongside LLC formation  
**Goal:** Secure, admin-only document management system for storing and sharing legal/business documents for **this LLC only** (Family Contribution website).

> **Scope:** This page stores documents for the Family Contribution website LLC only. Karry Kraze, AI Content Generation, and the Holding Company will each have their own separate websites and document storage.

---

## Why This Page?

As the Family Contribution website becomes its own LLC, it will accumulate critical business documents:
- Operating agreement
- Articles of organization
- EIN / tax ID
- Tax filings (Schedule C, state returns)
- Bank account paperwork
- Stripe/payment processor agreements
- Insurance policies (future)
- Contracts & invoices
- Receipts (large / important ones)

These need a **single, organized, secure place** — not scattered across email, Google Drive, and desktop folders.

---

## Access Model

| Who | Access Level |
|-----|-------------|
| **Admin (Justin)** | Full access — upload, view, delete, share |
| **Regular Members** | ❌ No access — this page doesn't appear in their nav |
| **External (CPA, Attorney, etc.)** | Via signed share links only (time-limited) |

> **This is NOT a public or member-facing page.** It lives exclusively in the admin panel.

---

## Document Categories

### Per-LLC Documents

Each LLC gets its own folder/section:

| Category | Examples |
|----------|---------|
| **Formation** | Articles of Organization, Certificate of Formation |
| **EIN / Tax ID** | IRS EIN confirmation letter |
| **Operating Agreement** | Signed operating agreement (single-member) |
| **Banking** | Account opening docs, statements |
| **Tax Filings** | Schedule C, GA Form 500, annual returns |
| **Stripe / Payments** | Stripe account verification, 1099-K |
| **Insurance** | Business liability policy (future) |
| **Contracts** | Vendor agreements, contractor agreements |
| **Receipts** | Large/important expense receipts |
| **Other** | Miscellaneous |

### Holding Company Specific

| Category | Examples |
|----------|---------|
| **Trust Documents** | Trust agreement (future, Phase 7) |
| **Investment Records** | Fidelity statements, trade confirmations |
| **Intercompany** | Distribution records between LLCs |
| **Annual Reports** | GA Secretary of State annual registration |

---

## LLC Scope

This documents vault is scoped to **one LLC only** — the Family Contribution website.

| LLC | Where Its Docs Live |
|-----|---------------------|
| Justice McNeal Holding LLC | Its own website (separate project) |
| **Family Contribution Website LLC** | **✅ Here — this admin page** |
| Karry Kraze LLC | Its own website (separate project) |
| AI Content Generation LLC | Its own website (separate project) |

---

## Feature Requirements

### MVP

- [ ] Admin-only page at `admin/documents.html`
- [ ] Document categories (collapsible sections)
- [ ] File upload (PDF, PNG, JPG, DOCX) → Supabase Storage
- [ ] File list with: name, category, upload date, file size
- [ ] Download button per document
- [ ] Delete with confirmation
- [ ] Search/filter documents by name or category
- [ ] Drag-and-drop upload support

### Share Links (MVP+)

- [ ] "Share" button on any document
- [ ] Generates a time-limited signed URL (Supabase Storage signed URLs)
- [ ] Configurable expiry: 1 hour, 24 hours, 7 days, 30 days
- [ ] Copy link to clipboard
- [ ] Share log — track who was sent what link and when (manual note field)
- [ ] Expired links automatically stop working (built into Supabase signed URLs)

### Future Enhancements

- [ ] Document versioning (upload new version, keep history)
- [ ] Document expiry reminders (e.g., "Operating agreement needs renewal")
- [ ] Required documents checklist per LLC (track what's missing)
- [ ] Bulk upload
- [ ] Document tags / custom labels
- [ ] PDF preview (inline viewer)
- [ ] Audit log — who accessed what, when
- [ ] Integration with tax prep page (link relevant docs)

---

## Database Schema (Proposed)

```sql
-- Document storage metadata
CREATE TABLE llc_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  category TEXT NOT NULL,       -- 'formation', 'ein', 'operating-agreement', 'tax', 'banking', 'insurance', 'contract', 'receipt', 'other'
  name TEXT NOT NULL,           -- Display name
  file_name TEXT NOT NULL,      -- Original file name
  file_path TEXT NOT NULL,      -- Supabase Storage path
  file_size BIGINT,             -- Bytes
  mime_type TEXT,               -- 'application/pdf', 'image/png', etc.
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  tags TEXT[],                  -- Optional tags
  version INT DEFAULT 1,
  is_archived BOOLEAN DEFAULT false
);

-- Share link tracking
CREATE TABLE llc_document_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  document_id UUID REFERENCES llc_documents(id) NOT NULL,
  shared_by UUID REFERENCES auth.users(id),
  recipient_note TEXT,          -- "Sent to CPA John Smith"
  expires_at TIMESTAMPTZ NOT NULL,
  signed_url TEXT,              -- The generated URL (for reference)
  is_revoked BOOLEAN DEFAULT false
);
```

### Supabase Storage Bucket

```
Bucket: llc-documents (private)
│
├── formation/
├── ein/
├── operating-agreement/
├── banking/
├── tax/
├── stripe/
├── insurance/
├── contracts/
├── receipts/
└── other/
```

> **RLS Policy:** Only users with `role = 'admin'` can read/write to this bucket.

---

## Supabase Storage — Signed URLs

For sharing docs externally without requiring login:

```js
// Generate a signed URL (expires in 24 hours)
const { data, error } = await supabase.storage
  .from('llc-documents')
  .createSignedUrl('holding/formation/articles-of-org.pdf', 60 * 60 * 24);

// data.signedUrl → share this link
// Automatically expires, no auth needed for recipient
```

Expiry options to offer in the UI:
| Option | Seconds |
|--------|---------|
| 1 hour | 3,600 |
| 24 hours | 86,400 |
| 7 days | 604,800 |
| 30 days | 2,592,000 |

---

## UI Wireframe

```
┌─────────────────────────────────────────────────────┐
│  📁 Documents Vault                    [+ Upload]   │
│  Family Contribution Website LLC                    │
├─────────────────────────────────────────────────────┤
│  🔍 Search documents...                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ▼ Formation Documents                              │
│  ┌─────────────────────────────────────────────┐    │
│  │ 📄 Articles of Organization.pdf              │    │
│  │    Uploaded: Mar 15, 2026 · 245 KB          │    │
│  │    [Download] [Share 🔗] [Delete 🗑️]         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ▼ Operating Agreement                              │
│  ┌─────────────────────────────────────────────┐    │
│  │ 📄 Operating-Agreement-v1.pdf                │    │
│  │    Uploaded: Mar 15, 2026 · 180 KB          │    │
│  │    [Download] [Share 🔗] [Delete 🗑️]         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ▼ Tax Filings                                      │
│  │  (No documents yet)                          │    │
│  │  [+ Upload to this category]                 │    │
│                                                     │
│  ▼ Banking                                          │
│  │  (No documents yet)                          │    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## What This Page is NOT

| This page IS | This page is NOT |
|-------------|-----------------|
| Admin-only secure vault | A public document library |
| Legal/business document storage | A place for member-facing resources |
| Organized by LLC entity | A replacement for `pages/resources/` |
| Shareable via signed links | Accessible from the login page |

The existing **`pages/resources/`** pages (Resource Hub, Why Join) remain separate — those are **public marketing pages** for prospective members. This documents page is for **private business records**.

---

## Required Documents Checklist

Track what's been filed/uploaded for this LLC:

- [ ] Articles of Organization (GA SOS)
- [ ] EIN Confirmation Letter (IRS)
- [ ] Operating Agreement (signed)
- [ ] Bank Account Opening Docs
- [ ] Stripe Account Verification
- [ ] Business License (if required by county)

---

## References

- `md/llc/overview.md` — LLC restructuring plan & 4-LLC structure
- `md/llc/expenses.md` — Expense tracking (receipts link here)
- `md/llc/tax-prep.md` — Tax prep (tax filings stored here)
- `md/roadmap/phase7-trust-legal.md` — Trust documents (future)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)

---

*Last Updated: March 13, 2026 | Maintained By: Justin McNeal (Admin)*
