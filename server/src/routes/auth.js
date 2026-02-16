import { Router } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { store } from '../store.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * POST /auth/login
 * Log in with email and password via Supabase Auth.
 * Auto-creates an API key on first login.
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    try {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        const user = data.user;
        const userName = user.user_metadata?.name || email.split('@')[0];

        // Find or create API key for this user
        const apiKey = await store.findOrCreateApiKey(user.id, userName);

        res.json({
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
            user: {
                id: user.id,
                email: user.email,
                name: userName,
            },
            apiKeyId: apiKey.id,
            apiKeySecret: apiKey.secret,
            name: userName,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /auth/refresh
 * Refresh an expired access token.
 */
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken is required' });
    }

    try {
        const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        res.json({
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
        });
    } catch (err) {
        console.error('Refresh error:', err);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

/**
 * POST /auth/logout
 * Sign out the current user.
 */
router.post('/logout', async (req, res) => {
    // Server-side logout is optional since Supabase JWTs are stateless
    res.json({ success: true });
});

/**
 * GET /auth/me
 * Get current user info from Supabase token.
 */
router.get('/me', authMiddleware, (req, res) => {
    res.json({
        userId: req.userId,
        apiKeyId: req.apiKeyId,
        name: req.apiKeyName,
    });
});

export default router;
