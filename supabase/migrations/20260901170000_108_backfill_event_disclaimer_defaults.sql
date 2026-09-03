-- Backfill default disclaimer clauses on legacy events with empty catalog and zero RSVPs.
-- Avoids retroactive re-ack on events that already have member/guest RSVPs.

UPDATE events e
SET disclaimers = '[
  {
    "id": "default-no-refunds",
    "title": "No refunds",
    "body": "Payments for this event are non-refundable for the payment period unless the event is cancelled or rescheduled by organizers.",
    "required": true,
    "is_default": true
  },
  {
    "id": "default-flyers",
    "title": "Flyers / tickets",
    "body": "Guests who book their own travel (flights, etc.) are responsible for those costs; the event fee does not reimburse tickets or travel.",
    "required": true,
    "is_default": true
  }
]'::jsonb
WHERE e.disclaimers = '[]'::jsonb
  AND NOT EXISTS (
    SELECT 1 FROM event_rsvps r WHERE r.event_id = e.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM event_guest_rsvps g WHERE g.event_id = e.id
  );
