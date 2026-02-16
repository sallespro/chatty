import { supabaseAdmin } from '../supabase.js';
import { store } from '../store.js';

/**
 * Supabase JWT authentication middleware.
 * Expects: Authorization: Bearer <supabase-access-token>
 * Sets req.userId, req.apiKeyId, and req.apiKeyName on success.
 */
export async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Missing or invalid Authorization header. Use: Bearer <token>',
        });
    }

    const token = authHeader.slice(7);

    try {
        // Verify the Supabase JWT and get the user
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Look up the user's API key
        const apiKey = await store.findApiKeyByUserId(user.id);
        if (!apiKey) {
            return res.status(401).json({ error: 'No API key found. Please log in again.' });
        }

        req.userId = user.id;
        req.apiKeyId = apiKey.id;
        req.apiKeyName = apiKey.name;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}
