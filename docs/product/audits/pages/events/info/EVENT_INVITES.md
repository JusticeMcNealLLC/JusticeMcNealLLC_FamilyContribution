# Event Invites

Public event invites use one clean URL format:

```text
https://justicemcneal.com/events/?e={event-slug}
```

The Manage Event overview tab can copy this link, share it through the device share sheet, and download a generic QR code for printed invitations.

## Cloudflare Preview Routing

Cloudflare runs `cloudflare/event-preview-worker.js` on:

```text
justicemcneal.com/events*
www.justicemcneal.com/events*
```

Normal browsers pass through to GitHub Pages. Preview crawlers such as Applebot, iMessage, Facebook, Slack, Discord, and Twitter/X are routed to the Supabase `event-og` function.

Both DNS records must be proxied in Cloudflare, not DNS-only. In Cloudflare DNS, `justicemcneal.com` and `www` should show the orange cloud. If crawler responses show `Server: GitHub.com` and no `cf-ray` header, Cloudflare is being bypassed and rich previews will fall back to the generic static tags in `events/index.html`.

The Worker returns the Supabase metadata to crawlers as `text/html` so Discord, iMessage, and other embed parsers read the Open Graph tags reliably.

## Open Graph Source

The deployed Supabase Edge Function is:

```text
supabase/functions/event-og/index.ts
```

It returns event-specific metadata for crawlers:

- Host-aware invite title
- Event date and time
- Location when available
- RSVP-specific copy when RSVP is open
- Event banner image when available

Deploy updates with:

```powershell
supabase functions deploy event-og --project-ref jcrsfzcabzdeqixbewgf --use-api
```

`--use-api` avoids the local Docker requirement.

## Testing

Use a fresh `ref` value when testing iMessage or other previews because clients cache aggressively:

```text
https://justicemcneal.com/events/?e=testevent-moushuj2&ref=imessage-test-3
```

Crawler verification through Cloudflare can be checked with:

```powershell
curl.exe -A "Applebot/0.1" -s -D - "https://justicemcneal.com/events/?e=testevent-moushuj2&ref=worker-test" | Select-String -Pattern "HTTP/|server:|cf-ray|content-type:|og:title|og:description"
curl.exe -A "Discordbot/2.0" -s -D - "https://justicemcneal.com/events/?e=testevent-moushuj2&ref=discord-test" | Select-String -Pattern "HTTP/|server:|cf-ray|content-type:|og:title|og:description|twitter:card"
```

Normal visitor requests should still return the static event app HTML.