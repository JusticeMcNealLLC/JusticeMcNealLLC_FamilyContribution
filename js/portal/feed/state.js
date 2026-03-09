// ═══════════════════════════════════════════════════════════
// Feed — Shared State (Phase 4A)
// ═══════════════════════════════════════════════════════════

let feedUser = null;
let feedProfile = null;
let feedPosts = [];
let feedPage = 0;
const FEED_PAGE_SIZE = 15;
let feedLoading = false;
let feedHasMore = true;
let activeFilter = 'all';
let currentDetailPostId = null;
let replyingToCommentId = null;
let isAdmin = false;
