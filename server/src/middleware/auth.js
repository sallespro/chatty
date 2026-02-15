import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * JWT authentication middleware.
 * Expects: Authorization: Bearer <token>
 * Sets req.apiKeyId and req.apiKeyName on success.
 */
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Missing or invalid Authorization header. Use: Bearer <token>',
        });
    }

    const token = authHeader.slice(7);

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.apiKeyId = payload.apiKeyId;
        req.apiKeyName = payload.name;
        next();
    } catch (err) {
        return res.status(401).json({
            error: 'Invalid or expired token',
        });
    }
}

/**
 * Sign a JWT for an API key.
 * @param {{ apiKeyId: string, name: string }} payload
 * @returns {string} JWT token
 */
export function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}
