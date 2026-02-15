import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

const DEFAULT_FALLBACK_TOOLS = ['echo', 'start-notification-stream', 'fetch'];

/**
 * Discover available tools from an MCP server.
 * Tries StreamableHTTP transport first, falls back to SSE.
 *
 * @param {string} mcpServerUrl - URL of the MCP server
 * @returns {Promise<string[]>} Array of tool names
 */
export async function discoverTools(mcpServerUrl) {
    const mcpClient = new Client({
        name: 'chat-lib-client',
        version: '1.0.0',
    });

    const baseUrl = new URL(mcpServerUrl);
    let transport;

    try {
        // Try StreamableHTTP transport first
        transport = new StreamableHTTPClientTransport(baseUrl);
        await mcpClient.connect(transport);
    } catch (err) {
        // Fall back to SSE transport
        const sseUrl = new URL(mcpServerUrl.replace(/\/mcp$/, '/sse'));
        transport = new SSEClientTransport(sseUrl);
        await mcpClient.connect(transport);
    }

    try {
        const result = await mcpClient.request(
            { method: 'tools/list', params: {} },
            ListToolsResultSchema
        );

        if (result.tools && result.tools.length > 0) {
            return result.tools.map((t) => t.name);
        }
        return [];
    } finally {
        await transport.close().catch(() => { });
    }
}

/**
 * Build the MCP tool configuration object for OpenAI Responses API.
 *
 * @param {string} serverUrl   - MCP server URL
 * @param {string[]} toolNames - Tool names to allow without approval
 * @param {string} [label]     - Server label (default: 'mcp-server')
 * @returns {object} MCP tool config for OpenAI
 */
export function buildMcpTool(serverUrl, toolNames, label = 'mcp-server') {
    return {
        type: 'mcp',
        server_label: label,
        server_url: serverUrl,
        require_approval: {
            never: {
                tool_names: toolNames,
            },
        },
    };
}

/**
 * Discover tools with a fallback to defaults if discovery fails.
 *
 * @param {string} mcpServerUrl
 * @param {string[]} [fallback]
 * @returns {Promise<string[]>}
 */
export async function discoverToolsWithFallback(
    mcpServerUrl,
    fallback = DEFAULT_FALLBACK_TOOLS
) {
    try {
        const tools = await discoverTools(mcpServerUrl);
        return tools.length > 0 ? tools : fallback;
    } catch {
        return fallback;
    }
}
