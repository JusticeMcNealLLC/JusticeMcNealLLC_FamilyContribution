# Events Refactor — Phase 5L Audit Doc Path Inventory

**Document:** `038_phase_5l_doc_path_inventory.md`  
**Date:** 2026-05-23  
**Status:** **Inventory only** — no file moves, no renames, no production changes  
**Purpose:** Clarify where Phase 5L.1 / 5L.2 checkpoint docs live before any Phase 5L.3 planning  
**Related commits:** `dc5d203` (5L.1 doc), `1c4ea8a` (5L.2 doc), `b084f62` (5L.2 code)  
**Out of scope:** Moving `036` / `037`, editing `036` / `037`, app code, HTML, CSS, compat, **5L.3**

---

## 1. Phase 5L Checkpoint Doc Locations (confirmed)

| Phase | Doc ID | Filename | **Current path** | Commit (doc) |
| --- | --- | --- | --- | --- |
| **5L.0** | 035 | `035_phase_5l_module_entry_readiness_audit.md` | `docs/audit/pages/events/` | `7b5640d` |
| **5L.1** | 036 | `036_phase_5l1_readiness_completion_status.md` | `docs/audit/pages/events/` | **`dc5d203`** |
| **5L.2** | 037 | `037_phase_5l2_boot_completion_status.md` | `docs/audit/events/` | **`1c4ea8a`** |
| **5L paths** | 038 | `038_phase_5l_doc_path_inventory.md` | `docs/audit/events/` | *(this file)* |

### Implementation commits (not doc paths)

| Phase | Commit | Scope |
| --- | --- | --- |
| 5L.1 smoke | `1df9cdf` | `test/_smoke-phase5l-readiness.js` |
| 5L.2 boot | `b084f62` | `js/portal/events/init.js`, smoke extensions |

---

## 2. Path Mismatch (confirmed)

Two directories currently hold Events refactor audit markdown:

| Directory | Role today | Phase 5L files |
| --- | --- | --- |
| **`docs/audit/pages/events/`** | **Primary** — numbered phase audits `008`–`036`, roadmap, plans, `info/` subfolder (~30 `.md` files) | `035`, **`036`** |
| **`docs/audit/events/`** | **Secondary** — created at 5L.2 doc checkpoint; only 5L.2+ path-inventory docs so far | **`037`**, **`038`** |

**Mismatch:** `036` (5L.1 completion) lives under **`pages/events/`**; `037` (5L.2 completion) lives under **`events/`** (no `pages/` segment). Same numeric series (`035` → `036` → `037`), different folders.

**No moves in this checkpoint** — inventory only. Links in `037` already reference `036` by filename; readers must know both base paths.

---

## 3. Recommended Canonical Folder (no action yet)

**Recommendation:** Use **`docs/audit/pages/events/`** as the canonical home for **future** numbered Events audit docs (including any **5L.3** completion doc).

| Reason | Detail |
| --- | --- |
| **History** | All pre–5L.2 phase audits (`008`–`036`, plus `035` 5L.0) already live there |
| **Consistency** | Matches `docs/audit/pages/admin/`, `docs/audit/pages/documents/`, etc. |
| **Discoverability** | One folder per portal page feature under `pages/` |

**Optional later cleanup (explicit approval only):**

- Move `037` and `038` into `docs/audit/pages/events/` with a doc-only PR, **or**
- Leave `037`/`038` in `docs/audit/events/` and add a short `docs/audit/events/README.md` pointer to `pages/events/` — **not done now**.

**Do not** move or rename `036` / `037` without a dedicated doc-only PR and updated cross-links.

---

## 4. No Code Changes

This checkpoint confirms:

| Area | Touched? |
| --- | --- |
| `js/**` | **No** |
| `portal/events.html` | **No** |
| `css/**` | **No** |
| `compat/**` runtime / HTML load | **No** |
| `036` / `037` content | **No** (inventory only; this file is new) |
| Supabase / admin | **No** |

Doc-only: **`038_phase_5l_doc_path_inventory.md`** (create).

---

## 5. 5L.3 Hold

**Phase 5L.3 — HTML / script consolidation — remains ON HOLD** until explicit written approval.

Until go-ahead:

- Do **not** remove classic `<script>` tags from `portal/events.html`
- Do **not** add `type="module"` on portal Events scripts
- Do **not** load compat installers (`window-exports`, `inline-handlers`, `external-globals`) in production HTML
- Do **not** treat this inventory as permission to start 5L.3

Prior gates still satisfied: 5L.1 readiness smoke (`1df9cdf`), 5L.2 boot hardening (`b084f62`), 5L.2 live QA, doc checkpoints `dc5d203` / `1c4ea8a`.

---

## 6. Quick Reference — Phase 5L doc chain

```text
docs/audit/pages/events/035_phase_5l_module_entry_readiness_audit.md     (5L.0)
docs/audit/pages/events/036_phase_5l1_readiness_completion_status.md      (5L.1)  dc5d203
docs/audit/events/037_phase_5l2_boot_completion_status.md                (5L.2)  1c4ea8a
docs/audit/events/038_phase_5l_doc_path_inventory.md                     (paths) this file
```

---

## 7. Doc-Only Commit Workflow (this file)

From repo root. Stage **only** this file.

```bash
git status --short
git diff -- docs/audit/events/038_phase_5l_doc_path_inventory.md
git add docs/audit/events/038_phase_5l_doc_path_inventory.md
git diff --staged --name-only
git commit -m "Add Phase 5L doc path inventory"
git push
```

Expected staged file:

```text
docs/audit/events/038_phase_5l_doc_path_inventory.md
```

---

## Appendix — Other `docs/audit/` Events-related paths

| Path | Contents |
| --- | --- |
| `docs/audit/pages/events/*.md` | Numbered phase audits, plans, completion status (primary) |
| `docs/audit/pages/events/info/` | Supplemental copies (e.g. `EVENT_INVITES.md`) |
| `docs/audit/events/` | 5L.2+ checkpoint docs (`037`, `038`) only (today) |
