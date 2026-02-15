import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory store for API keys, usage tracking, and sessions.
 * Suitable for development/demo purposes.
 */
class Store {
    constructor() {
        // Map<apiKeyId, { id, name, secret, createdAt }>
        this.apiKeys = new Map();
        // Map<apiKeyId, { tokens: number, windowStart: timestamp }>
        this.usage = new Map();
        // Map<apiKeyId, Map<sessionId, session>>
        this.sessions = new Map();
    }

    // ── API Keys ──────────────────────────────────────

    createApiKey(name) {
        const id = uuidv4();
        const secret = `ck_${uuidv4().replace(/-/g, '')}`;
        const entry = { id, name, secret, createdAt: Date.now() };
        this.apiKeys.set(id, entry);
        return { id, secret, name };
    }

    findBySecret(secret) {
        for (const entry of this.apiKeys.values()) {
            if (entry.secret === secret) return entry;
        }
        return null;
    }

    findById(id) {
        return this.apiKeys.get(id) || null;
    }

    // ── Usage Tracking ────────────────────────────────

    trackUsage(apiKeyId, tokens) {
        const now = Date.now();
        let record = this.usage.get(apiKeyId);

        if (!record || now - record.windowStart > 3600000) {
            record = { tokens: 0, windowStart: now };
        }

        record.tokens += tokens;
        this.usage.set(apiKeyId, record);
    }

    getUsage(apiKeyId) {
        const now = Date.now();
        const record = this.usage.get(apiKeyId);

        if (!record || now - record.windowStart > 3600000) {
            return { tokens: 0, windowStart: now, windowRemaining: 3600 };
        }

        const elapsed = now - record.windowStart;
        const remaining = Math.max(0, Math.ceil((3600000 - elapsed) / 1000));
        return { tokens: record.tokens, windowStart: record.windowStart, windowRemaining: remaining };
    }

    // ── Sessions (per-user) ───────────────────────────

    #getUserSessions(apiKeyId) {
        if (!this.sessions.has(apiKeyId)) {
            this.sessions.set(apiKeyId, new Map());
        }
        return this.sessions.get(apiKeyId);
    }

    createSession(apiKeyId, title = 'New Chat') {
        const userSessions = this.#getUserSessions(apiKeyId);
        const session = {
            id: uuidv4().split('-')[0] + Date.now().toString(36),
            title,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        userSessions.set(session.id, session);
        return session;
    }

    getSessions(apiKeyId) {
        const userSessions = this.#getUserSessions(apiKeyId);
        return Array.from(userSessions.values())
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    getSession(apiKeyId, sessionId) {
        const userSessions = this.#getUserSessions(apiKeyId);
        return userSessions.get(sessionId) || null;
    }

    updateSession(apiKeyId, sessionId, updates) {
        const userSessions = this.#getUserSessions(apiKeyId);
        const session = userSessions.get(sessionId);
        if (!session) return null;

        if (updates.title !== undefined) session.title = updates.title;
        session.updatedAt = Date.now();
        return session;
    }

    deleteSession(apiKeyId, sessionId) {
        const userSessions = this.#getUserSessions(apiKeyId);
        return userSessions.delete(sessionId);
    }

    addMessage(apiKeyId, sessionId, message) {
        const userSessions = this.#getUserSessions(apiKeyId);
        const session = userSessions.get(sessionId);
        if (!session) return null;

        const msg = {
            id: uuidv4().split('-')[0],
            ...message,
            timestamp: Date.now(),
        };
        session.messages.push(msg);
        session.updatedAt = Date.now();

        // Auto-title from first user message
        if (session.messages.length === 1 && message.role === 'user') {
            session.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        }

        return msg;
    }
}

export const store = new Store();
