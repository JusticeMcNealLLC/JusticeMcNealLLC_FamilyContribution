/** Read shell context from the host page `<body>` data attributes. */
export function readPageContext() {
    const body = document.body;
    const pageType = body.dataset.pageType || 'portal';
    return {
        pageType,
        active: body.dataset.activePage || '',
        isAdmin: pageType === 'admin',
    };
}
