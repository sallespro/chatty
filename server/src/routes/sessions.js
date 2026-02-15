import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

/**
 * GET /sessions
 * List all sessions for the authenticated user.
 */
router.get('/', (req, res) => {
    const sessions = store.getSessions(req.apiKeyId);
    // Return sessions without full messages (just metadata)
    const list = sessions.map(({ messages, ...rest }) => ({
        ...rest,
        messageCount: messages.length,
    }));
    res.json({ sessions: list });
});

/**
 * POST /sessions
 * Create a new session.
 */
router.post('/', (req, res) => {
    const { title } = req.body;
    const session = store.createSession(req.apiKeyId, title || 'New Chat');
    res.status(201).json({ session });
});

/**
 * GET /sessions/:id
 * Get a session with all messages.
 */
router.get('/:id', (req, res) => {
    const session = store.getSession(req.apiKeyId, req.params.id);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ session });
});

/**
 * PUT /sessions/:id
 * Update session metadata (title).
 */
router.put('/:id', (req, res) => {
    const { title } = req.body;
    const session = store.updateSession(req.apiKeyId, req.params.id, { title });
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ session });
});

/**
 * DELETE /sessions/:id
 * Delete a session.
 */
router.delete('/:id', (req, res) => {
    const deleted = store.deleteSession(req.apiKeyId, req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true });
});

/**
 * POST /sessions/:id/messages
 * Add a message to a session.
 * Body: { role: 'user'|'assistant', content: string, usage?, model?, tools? }
 */
router.post('/:id/messages', (req, res) => {
    const { role, content, usage, model, tools } = req.body;

    if (!role || !content) {
        return res.status(400).json({ error: 'role and content are required' });
    }

    const message = store.addMessage(req.apiKeyId, req.params.id, {
        role, content, usage, model, tools,
    });

    if (!message) {
        return res.status(404).json({ error: 'Session not found' });
    }

    // Return the message and updated session title
    const session = store.getSession(req.apiKeyId, req.params.id);
    res.status(201).json({ message, sessionTitle: session.title });
});

export default router;
