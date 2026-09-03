-- 110: Idempotent SMS flag for failed installment notifications (§13.10 line 440)

ALTER TABLE event_payment_installments
  ADD COLUMN IF NOT EXISTS failure_notified_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN event_payment_installments.failure_notified_at IS
  'Set when payment-failure SMS was attempted/sent; prevents duplicate SMS for same installment';

-- Allow payment-failure SMS rows in sms_messages
ALTER TABLE public.sms_messages DROP CONSTRAINT IF EXISTS sms_messages_type_check;
ALTER TABLE public.sms_messages
  ADD CONSTRAINT sms_messages_type_check CHECK (
    message_type IN (
      'rsvp_confirmation',
      'reminder_24h',
      'manual',
      'cancellation',
      'update',
      'event_payment_failed'
    )
  );
