-- 114: Allow host event-invite (+ payment-link) SMS message types (§13.12 line 457)

ALTER TABLE public.sms_messages DROP CONSTRAINT IF EXISTS sms_messages_type_check;
ALTER TABLE public.sms_messages
  ADD CONSTRAINT sms_messages_type_check CHECK (
    message_type IN (
      'rsvp_confirmation',
      'reminder_24h',
      'manual',
      'cancellation',
      'update',
      'event_payment_failed',
      'event_payment_link',
      'event_invite'
    )
  );
