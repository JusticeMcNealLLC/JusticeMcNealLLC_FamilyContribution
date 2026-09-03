-- About tabs on events (creator-defined sections for detail pages)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS about_tabs JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN events.about_tabs IS 'Creator About sections: [{id, title, body}] ordered array';
