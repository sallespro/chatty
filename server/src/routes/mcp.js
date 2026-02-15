import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { tavily } from '@tavily/core';
import { z } from 'zod';

// ── Tavily client (lazy-init) ───────────────────────────────────
let tvly;
function getTavily() {
    if (!tvly) {
        const apiKey = process.env.TVLY_API_KEY;
        if (!apiKey) throw new Error('TVLY_API_KEY is not set');
        tvly = tavily({ apiKey });
    }
    return tvly;
}

// ── Build a fresh MCP server with fetch + search tools ──────────
function createMcpServer() {
    const server = new McpServer(
        { name: 'chatty-mcp', version: '1.0.0' },
        { capabilities: { logging: {} } }
    );

    // ── fetch: retrieve content from any URL ────────────────────
    server.tool(
        'fetch',
        'Fetch the contents of a URL and return them as text',
        { url: z.string().url().describe('The URL to fetch') },
        async ({ url }) => {
            try {
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'Chatty-MCP/1.0' },
                    signal: AbortSignal.timeout(15_000),
                });
                const contentType = res.headers.get('content-type') || '';
                let body;

                if (contentType.includes('application/json')) {
                    const json = await res.json();
                    body = JSON.stringify(json, null, 2);
                } else {
                    body = await res.text();
                    // Trim very long HTML to keep context reasonable
                    if (body.length > 50_000) {
                        body = body.slice(0, 50_000) + '\n\n…[truncated]';
                    }
                }

                return {
                    content: [
                        {
                            type: 'text',
                            text: `HTTP ${res.status} ${res.statusText}\nContent-Type: ${contentType}\n\n${body}`,
                        },
                    ],
                };
            } catch (err) {
                return {
                    content: [{ type: 'text', text: `Fetch error: ${err.message}` }],
                    isError: true,
                };
            }
        }
    );

    // ── search: web search via Tavily ───────────────────────────
    server.tool(
        'search',
        'Search the web using Tavily and return relevant results',
        {
            query: z.string().describe('The search query'),
            maxResults: z
                .number()
                .int()
                .min(1)
                .max(20)
                .default(5)
                .describe('Maximum number of results to return'),
        },
        async ({ query, maxResults }) => {
            try {
                const tvlyClient = getTavily();
                const result = await tvlyClient.search(query, {
                    maxResults,
                });

                const formatted = result.results
                    .map(
                        (r, i) =>
                            `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.content}`
                    )
                    .join('\n\n');

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Search results for "${query}":\n\n${formatted}`,
                        },
                    ],
                };
            } catch (err) {
                return {
                    content: [{ type: 'text', text: `Search error: ${err.message}` }],
                    isError: true,
                };
            }
        }
    );

    return server;
}

// ── Express route handlers for /mcp ─────────────────────────────
export async function handleMcpPost(req, res) {
    const server = createMcpServer();
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // stateless
        });
        await server.connect(transport);

        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (req.body?.method) {
            console.log(`[MCP] ${req.body.method} from ${clientIp}`, req.body.params || '');
        }

        await transport.handleRequest(req, res, req.body);
        res.on('close', () => {
            transport.close();
            server.close();
        });
    } catch (error) {
        console.error('MCP request error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null,
            });
        }
    }
}

export function handleMcpGet(_req, res) {
    res.writeHead(405).end(
        JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed.' },
            id: null,
        })
    );
}

export function handleMcpDelete(_req, res) {
    res.writeHead(405).end(
        JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed.' },
            id: null,
        })
    );
}
