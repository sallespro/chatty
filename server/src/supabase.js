import { createClient } from '@supabase/supabase-js';

let _admin = null;

/**
 * Admin Supabase client using the service role key.
 * Bypasses RLS — use for server-side operations.
 * Lazily initialized to ensure dotenv has loaded.
 */
export function getSupabaseAdmin() {
    if (!_admin) {
        const url = process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) {
            console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
            process.exit(1);
        }

        _admin = createClient(url, key, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return _admin;
}

// For convenience — default export as a getter
export const supabaseAdmin = new Proxy({}, {
    get(_, prop) {
        return getSupabaseAdmin()[prop];
    },
});
