import { Router } from 'express';
import { store } from '../store.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /auth/register
 * Register a new API key. Returns the key secret and a JWT.
 */
router.post('/register', (req, res) => {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required (string)' });
    }

    const apiKey = store.createApiKey(name.trim());
    const token = signToken({ apiKeyId: apiKey.id, name: apiKey.name });

    res.status(201).json({
        apiKeyId: apiKey.id,
        apiKeySecret: apiKey.secret,
        name: apiKey.name,
        token,
        message: 'Save your API key secret — it cannot be retrieved again.',
    });
});

/**
 * POST /auth/token
 * Exchange an API key secret for a JWT.
 */
router.post('/token', (req, res) => {
    const { secret } = req.body;

    if (!secret || typeof secret !== 'string') {
        return res.status(400).json({ error: 'secret is required' });
    }

    const apiKey = store.findBySecret(secret);
    if (!apiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    const token = signToken({ apiKeyId: apiKey.id, name: apiKey.name });

    res.json({ token, apiKeyId: apiKey.id, name: apiKey.name });
});

export default router;
