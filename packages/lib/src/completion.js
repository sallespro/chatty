import OpenAI from 'openai';
import { discoverToolsWithFallback, buildMcpTool } from './mcp.js';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_MCP_URL = 'https://chat.cloudpilot.com.br/api/mcp';

/**
 * Extract the final text output from a Responses API result.
 * The response.output array may contain multiple items including:
 *   - An intermediate message ("I'll fetch that for you...")
 *   - MCP tool call items
 *   - A final message with the actual answer
 *
 * response.output_text concatenates ALL text, which gives a messy result.
 * Instead, we take only the LAST output_text message item.
 *
 * @param {object} response - OpenAI Responses API result
 * @returns {string} Final text output
 */
function extractFinalText(response) {
    // Walk the output array and find all text content from message items
    const textParts = [];

    if (response.output && Array.isArray(response.output)) {
        for (const item of response.output) {
            // Only consider message-type output items
            if (item.type === 'message' && item.content) {
                for (const block of item.content) {
                    if (block.type === 'output_text' && block.text) {
                        textParts.push(block.text);
                    }
                }
            }
        }
    }

    // Return the last text part (the final answer after tool execution),
    // or fall back to the full output_text if we can't parse the structure
    if (textParts.length > 0) {
        return textParts[textParts.length - 1];
    }

    return response.output_text || '';
}

/**
 * Create a chat completion using OpenAI Responses API with MCP tools.
 *
 * @param {object} options
 * @param {string}   options.apiKey             - OpenAI API key
 * @param {string}   [options.model]            - Model name (default: o3-mini)
 * @param {string}   options.input              - User input text
 * @param {string}   [options.mcpServerUrl]     - MCP server URL
 * @param {string}   [options.mcpServerLabel]   - Label for the MCP server
 * @param {string[]} [options.tools]            - Pre-discovered tool names (skip discovery)
 * @param {string}   [options.previousResponseId] - For conversation continuity
 * @returns {Promise<object>} Completion result
 */
export async function createCompletion({
    apiKey,
    model = DEFAULT_MODEL,
    input,
    mcpServerUrl = DEFAULT_MCP_URL,
    mcpServerLabel = 'mcp-server',
    tools,
    previousResponseId,
}) {
    if (!apiKey) throw new Error('apiKey is required');
    if (!input) throw new Error('input is required');

    const client = new OpenAI({ apiKey });

    // Discover or use provided tools
    const toolNames = tools || (await discoverToolsWithFallback(mcpServerUrl));
    const mcpTool = buildMcpTool(mcpServerUrl, toolNames, mcpServerLabel);

    // Build request params
    const params = {
        model,
        tools: [mcpTool],
        input,
        truncation: 'auto',
    };

    if (previousResponseId) {
        params.previous_response_id = previousResponseId;
    }

    const response = await client.responses.create(params);

    // Extract the final text (after all tool calls complete), not the
    // concatenated output_text which includes intermediate "I'll fetch..." text
    const finalText = extractFinalText(response);

    return {
        responseId: response.id,
        outputText: finalText,
        fullOutputText: response.output_text,
        model: response.model,
        mcpServerUrl,
        toolsDiscovered: toolNames,
        usage: response.usage || null,
    };
}
