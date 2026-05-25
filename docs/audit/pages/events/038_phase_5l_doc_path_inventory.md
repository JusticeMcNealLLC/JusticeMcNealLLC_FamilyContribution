# Events Refactor — Phase 5L Audit Doc Path Inventory

**Document:** `038_phase_5l_doc_path_inventory.md`  
**Path:** `docs/audit/pages/events/038_phase_5l_doc_path_inventory.md`  
**Date:** 2026-05-23  
**Status:** **Complete** — `037` / `038` moved to canonical folder (doc-only; no production changes)  
**Purpose:** Record Phase 5L doc locations and resolve the `docs/audit/events/` vs `docs/audit/pages/events/` split  
**Related commits:** `dc5d203` (5L.1 doc), `1c4ea8a` (5L.2 doc, original path), `15d2217` (this inventory, original path), path-move commit *(this relocation)*  
**Out of scope:** App code, HTML, CSS, compat, **5L.3**

---

## 1. Phase 5L Checkpoint Doc Locations (canonical)

All numbered Phase **5L** audit docs now live under **`docs/audit/pages/events/`**:

| Phase | Doc ID | Filename | **Path** | Commit (doc) |
| --- | --- | --- | --- | --- |
| **5L.0** | 035 | `035_phase_5l_module_entry_readiness_audit.md` | `docs/audit/pages/events/` | `7b5640d` |
| **5L.1** | 036 | `036_phase_5l1_readiness_completion_status.md` | `docs/audit/pages/events/` | **`dc5d203`** |
| **5L.2** | 037 | `037_phase_5l2_boot_completion_status.md` | `docs/audit/pages/events/` | **`1c4ea8a`** (content); moved here doc-only |
| **5L paths** | 038 | `038_phase_5l_doc_path_inventory.md` | `docs/audit/pages/events/` | **`15d2217`** (content); moved here doc-only |

### Implementation commits (not doc paths)

| Phase | Commit | Scope |
| --- | --- | --- |
| 5L.1 smoke | `1df9cdf` | `test/_smoke-phase5l-readiness.js` |
| 5L.2 boot | `b084f62` | `js/portal/events/init.js`, smoke extensions |

---

## 2. Path Mismatch — Resolved

**Previously:** `035`–`036` in `docs/audit/pages/events/`; `037`–`038` in `docs/audit/events/`.

**Now:** `035` through `038` are together in **`docs/audit/pages/events/`**.

| Directory | Status |
| --- | --- |
| **`docs/audit/pages/events/`** | **Canonical** — all Phase 5L numbered docs (`035`–`038`) |
| **`docs/audit/events/`** | **Deprecated for 5L docs** — empty after `git mv`; not removed as a folder unless Git drops it |

Relocation used **`git mv`** (no duplicate copies). Historical commits (`1c4ea8a`, `15d2217`) still point at old paths in git history; this file records the canonical location going forward.

---

## 3. Canonical Folder (confirmed)

**Use `docs/audit/pages/events/`** for all **future** Events audit docs (including any **5L.3** completion doc).

| Reason | Detail |
| --- | --- |
| **History** | Phase audits `008`–`038` (numbered series) live here |
| **Consistency** | Aligns with `docs/audit/pages/admin/`, `docs/audit/pages/documents/`, etc. |
| **5L series** | `035` → `036` → `037` → `038` in one directory |

**Do not** recreate `docs/audit/events/` for new 5L checkpoints unless explicitly directed.

---

## 4. No Code Changes

This path cleanup confirms:

| Area | Touched? |
| --- | --- |
| `js/**` | **No** |
| `portal/events.html` | **No** |
| `css/**` | **No** |
| `compat/**` runtime / HTML load | **No** |
| `036` content | **No** (not moved) |
| **5L.3** | **Not started** |

Doc-only: **`git mv`** of `037` and `038` plus path-reference updates inside those two files.

---

## 5. 5L.3 Hold

**Phase 5L.3 — HTML / script consolidation — remains ON HOLD** until explicit written approval.

Until go-ahead:

- Do **not** remove classic `<script>` tags from `portal/events.html`
- Do **not** add `type="module"` on portal Events scripts
- Do **not** load compat installers in production HTML
- Do **not** treat doc path cleanup as permission to start 5L.3

Prior gates unchanged: 5L.1 smoke (`1df9cdf`), 5L.2 boot (`b084f62`), live QA, doc checkpoints `dc5d203` / `1c4ea8a`.

---

## 6. Quick Reference — Phase 5L doc chain

```text
docs/audit/pages/events/035_phase_5l_module_entry_readiness_audit.md
docs/audit/pages/events/036_phase_5l1_readiness_completion_status.md   (5L.1)  dc5d203
docs/audit/pages/events/037_phase_5l2_boot_completion_status.md        (5L.2)  1c4ea8a
docs/audit/pages/events/038_phase_5l_doc_path_inventory.md             (paths) 15d2217 + move
```

---

## 7. Doc-Only Move Commit Workflow

From repo root. Stage **only** the moves and path edits under `docs/audit/`.

```bash
git status --short
git diff -- docs/audit/pages/events/037_phase_5l2_boot_completion_status.md docs/audit/pages/events/038_phase_5l_doc_path_inventory.md
git diff --name-status
git add -A docs/audit/events docs/audit/pages/events/037_phase_5l2_boot_completion_status.md docs/audit/pages/events/038_phase_5l_doc_path_inventory.md
git diff --staged --name-status
git commit -m "Move Phase 5L docs into Events audit folder"
git push
```

Expected staged name-status:

```text
R100  docs/audit/events/037_phase_5l2_boot_completion_status.md -> docs/audit/pages/events/037_phase_5l2_boot_completion_status.md
R100  docs/audit/events/038_phase_5l_doc_path_inventory.md -> docs/audit/pages/events/038_phase_5l_doc_path_inventory.md
```

(Plus any small path-reference edits inside `037` / `038`.)

---

## Appendix — `docs/audit/` Events-related paths

| Path | Contents |
| --- | --- |
| `docs/audit/pages/events/*.md` | Numbered phase audits `008`–`038`, plans, completion status (**canonical**) |
| `docs/audit/pages/events/info/` | Supplemental copies (e.g. `EVENT_INVITES.md`) |
| `docs/audit/events/` | Empty after 5L doc move; do not add new 5L docs here |
