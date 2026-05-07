const EVENT_OG_BASE = 'https://jcrsfzcabzdeqixbewgf.supabase.co/functions/v1/event-og';

const PREVIEW_BOT_RE = /bot|crawler|spider|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|pinterest|embedly|quora link preview|showyoubot|outbrain|vkshare|applebot|messages/i;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== '/events/' && url.pathname !== '/events') {
      return fetch(request);
    }

    const slug = url.searchParams.get('e');
    const userAgent = request.headers.get('user-agent') || '';
    const wantsPreview = PREVIEW_BOT_RE.test(userAgent);

    if (!slug || !wantsPreview) {
      return fetch(request);
    }

    const ogUrl = new URL(EVENT_OG_BASE);
    ogUrl.searchParams.set('e', slug);

    const ref = url.searchParams.get('ref');
    if (ref) ogUrl.searchParams.set('ref', ref);

    return fetch(ogUrl.toString(), {
      headers: {
        'User-Agent': userAgent,
      },
      cf: {
        cacheTtl: 300,
        cacheEverything: true,
      },
    });
  },
};