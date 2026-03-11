# Phase 6 — Family Gallery

**Status:** 🔲 Not Started  
**Priority:** Medium  
**Milestone unlock:** $2,500 (Gaining Ground tier)  
**Goal:** One place for all family memories — organized, searchable, and preserved forever.

---

## Features to Build

- [ ] Photo & video uploads (drag and drop, mobile camera support)
- [ ] Album creation (by event, year, person, custom)
- [ ] Metadata per photo:
  - Date taken
  - Location / address
  - People tagged (linked to member profiles)
  - Caption / description
  - Who uploaded it
- [ ] Search by person, date, location, or keyword
- [ ] Slideshow view
- [ ] Download originals
- [ ] Auto-organize by date (timeline view)
- [ ] "On This Day" — resurface old memories (anniversary-style)
- [ ] Mobile camera support (direct upload from phone camera)
- [ ] Desktop drag-and-drop upload
- [ ] Privacy controls — who can see each album

---

## Technical Approach

| Component | Technology |
|-----------|-----------|
| File storage | Supabase Storage (or S3-compatible bucket) |
| Metadata | Supabase database |
| Search | Supabase full-text search |
| Thumbnails | Edge function for image compression |
| Timeline | Date-grouped gallery grid |

---

## Database

```sql
gallery_photos (
  id UUID PK,
  uploader_id UUID → profiles,
  album_id UUID → gallery_albums,
  url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  date_taken DATE,
  location_name TEXT,
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
)

gallery_albums (
  id UUID PK,
  title TEXT,
  description TEXT,
  cover_photo_id UUID,
  event_id UUID → events,
  created_by UUID → profiles,
  created_at TIMESTAMPTZ DEFAULT now()
)

photo_tags (
  id UUID PK,
  photo_id UUID → gallery_photos,
  user_id UUID → profiles,  -- tagged person
  tagged_by UUID → profiles,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

---

## Integration Points

- **Events** (Phase 5) — auto-create an album for each event; event photos surface in its album
- **Profiles** (Phase 4B) — tagged photos surfaced on member profiles
- **Feed** (Phase 4A) — "On This Day" resurface can auto-post to feed
- **Milestones** (Phase 2A) — milestone celebration photos added to gallery

---

## Notes

- Supabase Storage is the natural fit since we're already on Supabase
- Free tier: 1GB storage, 2GB bandwidth/month — sufficient for early usage
- Expand to paid tier or S3 as storage grows
- Image compression edge function should run on upload to keep storage costs low
