import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

/**
 * GET /sessions
 * List all sessions for the authenticated user.
 */
router.get('/', async (req, res) => {
    try {
        const sessions = await store.getSessions(req.apiKeyId);
        res.json({ sessions });
    } catch (err) {
        console.error('Sessions list error:', err);
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});

/**
 * POST /sessions
 * Create a new session.
 */
router.post('/', async (req, res) => {
    try {
        const { title } = req.body;
        const session = await store.createSession(req.apiKeyId, title || 'New Chat');
        res.status(201).json({ session });
    } catch (err) {
        console.error('Session create error:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * GET /sessions/:id
 * Get a session with all messages.
 */
router.get('/:id', async (req, res) => {
    try {
        const session = await store.getSession(req.apiKeyId, req.params.id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({ session });
    } catch (err) {
        console.error('Session get error:', err);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

/**
 * PUT /sessions/:id
 * Update session metadata (title).
 */
router.put('/:id', async (req, res) => {
    try {
        const { title } = req.body;
        const session = await store.updateSession(req.apiKeyId, req.params.id, { title });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({ session });
    } catch (err) {
        console.error('Session update error:', err);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

/**
 * DELETE /sessions/:id
 * Delete a session.
 */
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await store.deleteSession(req.apiKeyId, req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Session delete error:', err);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

/**
 * POST /sessions/:id/messages
 * Add a message to a session.
 * Body: { role: 'user'|'assistant', content: string, usage?, model?, tools? }
 */
router.post('/:id/messages', async (req, res) => {
    try {
        const { role, content, usage, model, tools } = req.body;

        if (!role || !content) {
            return res.status(400).json({ error: 'role and content are required' });
        }

        const result = await store.addMessage(req.apiKeyId, req.params.id, {
            role, content, usage, model, tools,
        });

        if (!result) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.status(201).json({ message: result, sessionTitle: result.sessionTitle });
    } catch (err) {
        console.error('Message add error:', err);
        res.status(500).json({ error: 'Failed to add message' });
    }
});

export default router;
