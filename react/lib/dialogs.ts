// Themed dialogs live in js/components/events/helpers.js (styles: .evt-confirm-dialog in css/shared.css)

export function confirmDialog(opts: { title: string; message: string; confirmLabel: string; cancelLabel?: string }): Promise<boolean> {
    const helpers = window.EventsHelpers;
    if (helpers) return helpers.confirmDialog(opts);
    return Promise.resolve(window.confirm(`${opts.title}\n\n${opts.message}`));
}
