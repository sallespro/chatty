import { Router } from 'express';
import { promises as fs } from 'fs';
import { resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dirname, '../../data/workspaces');

const router = Router();

/**
 * Get the workspace artifacts directory for an API key.
 * Creates it if it doesn't exist.
 */
async function getArtifactsDir(apiKeyId) {
    const dir = join(DATA_ROOT, apiKeyId, 'artifacts');
    await fs.mkdir(dir, { recursive: true });
    return dir;
}

/**
 * Sanitize filename to prevent path traversal.
 */
function sanitizeFilename(name) {
    return basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * GET /workspace/artifacts
 * List all artifacts in the workspace.
 */
router.get('/artifacts', async (req, res) => {
    try {
        const dir = await getArtifactsDir(req.apiKeyId);
        let files;
        try {
            files = await fs.readdir(dir);
        } catch {
            files = [];
        }

        const artifacts = await Promise.all(
            files.map(async (name) => {
                const filePath = join(dir, name);
                const stat = await fs.stat(filePath);
                return {
                    name,
                    size: stat.size,
                    createdAt: stat.birthtimeMs,
                    updatedAt: stat.mtimeMs,
                };
            })
        );

        // Sort by most recently updated
        artifacts.sort((a, b) => b.updatedAt - a.updatedAt);

        res.json({ artifacts });
    } catch (err) {
        console.error('Workspace list error:', err);
        res.status(500).json({ error: 'Failed to list artifacts' });
    }
});

/**
 * POST /workspace/artifacts
 * Save a new artifact file.
 * Body: { name: string, content: string }
 */
router.post('/artifacts', async (req, res) => {
    try {
        const { name, content } = req.body;

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'name is required (string)' });
        }
        if (content === undefined || content === null) {
            return res.status(400).json({ error: 'content is required' });
        }

        const dir = await getArtifactsDir(req.apiKeyId);
        const filename = sanitizeFilename(name);
        const filePath = join(dir, filename);

        await fs.writeFile(filePath, content, 'utf-8');
        const stat = await fs.stat(filePath);

        res.status(201).json({
            artifact: {
                name: filename,
                size: stat.size,
                createdAt: stat.birthtimeMs,
                updatedAt: stat.mtimeMs,
            },
        });
    } catch (err) {
        console.error('Workspace save error:', err);
        res.status(500).json({ error: 'Failed to save artifact' });
    }
});

/**
 * GET /workspace/artifacts/:filename
 * Read a specific artifact file.
 */
router.get('/artifacts/:filename', async (req, res) => {
    try {
        const dir = await getArtifactsDir(req.apiKeyId);
        const filename = sanitizeFilename(req.params.filename);
        const filePath = join(dir, filename);

        const content = await fs.readFile(filePath, 'utf-8');
        const stat = await fs.stat(filePath);

        res.json({
            artifact: {
                name: filename,
                content,
                size: stat.size,
                createdAt: stat.birthtimeMs,
                updatedAt: stat.mtimeMs,
            },
        });
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: 'Artifact not found' });
        }
        console.error('Workspace read error:', err);
        res.status(500).json({ error: 'Failed to read artifact' });
    }
});

/**
 * DELETE /workspace/artifacts/:filename
 * Delete an artifact file.
 */
router.delete('/artifacts/:filename', async (req, res) => {
    try {
        const dir = await getArtifactsDir(req.apiKeyId);
        const filename = sanitizeFilename(req.params.filename);
        const filePath = join(dir, filename);

        await fs.unlink(filePath);
        res.json({ success: true, deleted: filename });
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: 'Artifact not found' });
        }
        console.error('Workspace delete error:', err);
        res.status(500).json({ error: 'Failed to delete artifact' });
    }
});

export default router;
