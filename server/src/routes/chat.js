import { Router } from 'express';
import { ChatClient } from '@chat/sdk';

const router = Router();

/**
 * POST /chat
 * Authenticated chat endpoint. Uses the SDK to make completions.
 * Body: { input: string, model?: string, mcpServerUrl?: string }
 */
router.post('/', async (req, res) => {
    try {
        const { input, model, mcpServerUrl } = req.body;

        if (!input || typeof input !== 'string') {
            return res.status(400).json({ error: 'input is required (string)' });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured on server' });
        }

        const client = new ChatClient({
            apiKey: process.env.OPENAI_API_KEY,
            model: model || 'gpt-4.1-mini',
            mcpServerUrl: mcpServerUrl || 'https://cool.cloudpilot.com.br/mcp',
        });

        const result = await client.chat(input);

        // Track token usage for rate limiting
        if (result.usage && req.trackTokenUsage) {
            const totalTokens =
                (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0);
            req.trackTokenUsage(totalTokens);
        }

        res.json({
            success: true,
            response: result.outputText,
            responseId: result.responseId,
            model: result.model,
            mcpServerUrl: result.mcpServerUrl,
            toolsDiscovered: result.toolsDiscovered,
            usage: result.usage,
        });
    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: err.message,
        });
    }
});

export default router;
