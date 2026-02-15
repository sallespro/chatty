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
    }

    /**
     * Register a new API key.
     * @param {string} name - Friendly name for the key
     * @returns {{ id: string, secret: string, name: string }}
     */
    createApiKey(name) {
        const id = uuidv4();
        const secret = `ck_${uuidv4().replace(/-/g, '')}`;
        const entry = { id, name, secret, createdAt: Date.now() };
        this.apiKeys.set(id, entry);
        return { id, secret, name };
    }

    /**
     * Find an API key by its secret.
     * @param {string} secret
     * @returns {object|null}
     */
    findBySecret(secret) {
        for (const entry of this.apiKeys.values()) {
            if (entry.secret === secret) return entry;
        }
        return null;
    }

    /**
     * Find an API key by its ID.
     * @param {string} id
     * @returns {object|null}
     */
    findById(id) {
        return this.apiKeys.get(id) || null;
    }

    /**
     * Track token usage for an API key.
     * @param {string} apiKeyId
     * @param {number} tokens - Number of tokens used
     */
    trackUsage(apiKeyId, tokens) {
        const now = Date.now();
        let record = this.usage.get(apiKeyId);

        if (!record || now - record.windowStart > 3600000) {
            // Start a new 1-hour window
            record = { tokens: 0, windowStart: now };
        }

        record.tokens += tokens;
        this.usage.set(apiKeyId, record);
    }

    /**
     * Get current token usage for an API key in the current window.
     * @param {string} apiKeyId
     * @returns {{ tokens: number, windowStart: number, windowRemaining: number }}
     */
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
}

export const store = new Store();
