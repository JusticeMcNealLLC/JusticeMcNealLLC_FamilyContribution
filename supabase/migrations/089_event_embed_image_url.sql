-- Separate portrait-oriented image for social/message embeds.
ALTER TABLE events
ADD COLUMN IF NOT EXISTS embed_image_url TEXT;