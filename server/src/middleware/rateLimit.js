import { store } from '../store.js';

const DEFAULT_TOKEN_LIMIT = 100_000; // 100k tokens per hour

/**
 * Token usage rate limiting middleware.
 * Tracks usage per API key and blocks when limit is exceeded.
 *
 * @param {number} [limit] - Max tokens per hour per API key
 */
export function rateLimitMiddleware(limit = DEFAULT_TOKEN_LIMIT) {
    return (req, res, next) => {
        const { apiKeyId } = req;

        if (!apiKeyId) {
            return res.status(500).json({ error: 'Rate limiter requires auth middleware' });
        }

        const usage = store.getUsage(apiKeyId);

        if (usage.tokens >= limit) {
            res.set('Retry-After', String(usage.windowRemaining));
            return res.status(429).json({
                error: 'Token usage rate limit exceeded',
                limit,
                used: usage.tokens,
                retryAfterSeconds: usage.windowRemaining,
            });
        }

        // Attach helper for routes to track usage after completion
        req.trackTokenUsage = (tokens) => {
            store.trackUsage(apiKeyId, tokens);
        };

        // Attach current usage info for response headers
        req.usageInfo = usage;

        next();
    };
}
