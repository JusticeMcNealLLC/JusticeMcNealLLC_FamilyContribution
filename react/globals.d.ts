// Globals defined by classic scripts on every page (js/config.js, Supabase CDN build).
import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
    const supabaseClient: SupabaseClient;
    function callEdgeFunction<T = any>(functionName: string, body?: Record<string, unknown>): Promise<T>;
    function formatCurrency(cents: number): string;
}

export {};
