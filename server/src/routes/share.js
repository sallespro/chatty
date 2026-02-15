import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dirname, '../../data/workspaces');

const router = Router();

// In-memory share store: Map<shareId, { type, data, createdAt, expiresAt }>
const shares = new Map();

/**
 * POST /share
 * Create a share link for a session or workspace file.
 * Requires authentication.
 * Body: { type: 'session' | 'artifact', data: object }
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { type, data } = req.body;

        if (!type || !data) {
            return res.status(400).json({ error: 'type and data are required' });
        }

        const shareId = uuidv4().split('-')[0]; // Short ID
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

        let shareData;

        if (type === 'session') {
            // Store the session snapshot directly
            shareData = {
                type: 'session',
                title: data.title || 'Shared Chat',
                messages: data.messages || [],
                createdAt: Date.now(),
                expiresAt,
            };
        } else if (type === 'artifact') {
            // Read the file content and store it
            const apiKeyId = req.apiKeyId;
            const filename = basename(data.filename);
            const filePath = join(DATA_ROOT, apiKeyId, 'artifacts', filename);

            try {
                const content = await fs.readFile(filePath, 'utf-8');
                shareData = {
                    type: 'artifact',
                    filename,
                    content,
                    createdAt: Date.now(),
                    expiresAt,
                };
            } catch (err) {
                if (err.code === 'ENOENT') {
                    return res.status(404).json({ error: 'Artifact not found' });
                }
                throw err;
            }
        } else {
            return res.status(400).json({ error: 'type must be "session" or "artifact"' });
        }

        shares.set(shareId, shareData);

        res.status(201).json({
            shareId,
            shareUrl: `/shared/${shareId}`,
            expiresAt: new Date(expiresAt).toISOString(),
        });
    } catch (err) {
        console.error('Share create error:', err);
        res.status(500).json({ error: 'Failed to create share link' });
    }
});

/**
 * GET /share/:shareId
 * Get shared content (public, no auth required).
 */
router.get('/:shareId', (req, res) => {
    const share = shares.get(req.params.shareId);

    if (!share) {
        return res.status(404).json({ error: 'Share not found or expired' });
    }

    if (share.expiresAt < Date.now()) {
        shares.delete(req.params.shareId);
        return res.status(404).json({ error: 'Share link has expired' });
    }

    res.json(share);
});

export default router;
