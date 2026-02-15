import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import workspaceRoutes from './routes/workspace.js';
import shareRoutes from './routes/share.js';
import sessionRoutes from './routes/sessions.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { handleMcpPost, handleMcpGet, handleMcpDelete } from './routes/mcp.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check (compatibility)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
const apiRouter = express.Router();

// Health check (standard)
apiRouter.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Public routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/share', shareRoutes);

// Protected routes
apiRouter.use('/chat', authMiddleware, rateLimitMiddleware(), chatRoutes);
apiRouter.use('/workspace', authMiddleware, workspaceRoutes);
apiRouter.use('/sessions', authMiddleware, sessionRoutes);

// MCP Server (Streamable HTTP)
apiRouter.post('/mcp', handleMcpPost);
apiRouter.get('/mcp', handleMcpGet);
apiRouter.delete('/mcp', handleMcpDelete);

// Mount all API routes
app.use('/api', apiRouter);

// Legacy MCP Routes Compatibility (Some reverse proxies might still strip /api)
app.post('/mcp', handleMcpPost);
app.get('/mcp', handleMcpGet);
app.delete('/mcp', handleMcpDelete);

// Serve UI static files in production
const uiDist = resolve(__dirname, '../../ui/dist');
if (existsSync(uiDist)) {
    app.use(express.static(uiDist));
    // SPA fallback — serve index.html for all non-API, non-static routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(resolve(uiDist, 'index.html'));
    });
    console.log('📦 Serving UI from', uiDist);
}

app.listen(PORT, () => {
    console.log(`🚀 Chatty server running on http://localhost:${PORT}`);
    console.log(`   POST /auth/register      — Register a new API key`);
    console.log(`   POST /auth/token         — Exchange key for JWT`);
    console.log(`   GET  /auth/me            — Current user info`);
    console.log(`   POST /chat               — Send a chat message`);
    console.log(`   CRUD /sessions           — Manage chat sessions`);
    console.log(`   CRUD /workspace/artifacts — Manage workspace files`);
    console.log(`   POST /share              — Create share link`);
    console.log(`   GET  /share/:id          — View shared content`);
});

export default app;
