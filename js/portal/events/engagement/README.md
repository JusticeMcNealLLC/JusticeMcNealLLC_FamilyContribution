# Engagement (RSVP + member raffle actions)

Cross-cutting member flows used from list, detail, team tools, and manage.

| File | Role |
|------|------|
| `rsvp.js` | RSVP, waitlist, host status updates, parity helpers |
| `raffle.js` | Draw modal, winner selection, celebration UI |

Both export named functions for ESM (Phase 7) and still assign `window.evt*` for HTML `onclick` until migration completes.

Load order: see `../main.js` (after detail pipeline, before create).
