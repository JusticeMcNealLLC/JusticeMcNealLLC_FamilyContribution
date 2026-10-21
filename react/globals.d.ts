// Globals defined by classic scripts on every page (js/config.js, Supabase CDN build).
import type { SupabaseClient } from '@supabase/supabase-js';

interface DialogOptions {
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

declare global {
    const supabaseClient: SupabaseClient;
    function callEdgeFunction<T = any>(functionName: string, body?: Record<string, unknown>): Promise<T>;
    function formatCurrency(cents: number): string;
    // js/auth/shared.js
    function handleLogout(): Promise<void>;

    interface Window {
        // js/push.js
        JMPush?: {
            isSupported(): boolean;
            getPermissionState(): NotificationPermission | 'unsupported';
            isSubscribed(): Promise<boolean>;
            subscribe(): Promise<{ success: boolean; reason?: string }>;
            unsubscribe(): Promise<{ success: boolean; reason?: string }>;
        };
        // js/components/events/helpers.js
        EventsHelpers?: {
            confirmDialog(opts: DialogOptions): Promise<boolean>;
        };
    }
}

export {};
