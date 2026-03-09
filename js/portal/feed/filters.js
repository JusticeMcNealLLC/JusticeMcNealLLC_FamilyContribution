// ═══════════════════════════════════════════════════════════
// Feed — Filters & Infinite Scroll
// ═══════════════════════════════════════════════════════════

// ─── Feed Filters ───────────────────────────────────────
function setupFilters() {
    document.querySelectorAll('.feed-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.feed-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.dataset.filter;
            loadFeed();
        });
    });
}

// ─── Infinite Scroll ────────────────────────────────────
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && feedHasMore && !feedLoading) {
            loadFeed(true);
        }
    }, { rootMargin: '400px' });

    // Watch the scroll trigger area
    const trigger = document.getElementById('scrollTrigger');
    if (trigger) observer.observe(trigger);

    // Also detect scroll near bottom as fallback
    window.addEventListener('scroll', () => {
        if (feedLoading || !feedHasMore) return;
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) {
            loadFeed(true);
        }
    });
}
