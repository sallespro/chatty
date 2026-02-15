import { createCompletion, discoverToolsWithFallback } from '@chat/lib';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_MCP_URL = 'https://cool.cloudpilot.com.br/mcp';

/**
 * Stateful chat client that wraps the core library.
 * Manages conversation context via previousResponseId.
 */
export class ChatClient {
    #apiKey;
    #model;
    #mcpServerUrl;
    #mcpServerLabel;
    #previousResponseId;
    #cachedTools;

    /**
     * @param {object} options
     * @param {string}  options.apiKey           - OpenAI API key
     * @param {string}  [options.model]          - Model name (default: o3-mini)
     * @param {string}  [options.mcpServerUrl]   - MCP server URL
     * @param {string}  [options.mcpServerLabel] - MCP server label
     */
    constructor({
        apiKey,
        model = DEFAULT_MODEL,
        mcpServerUrl = DEFAULT_MCP_URL,
        mcpServerLabel = 'mcp-server',
    }) {
        if (!apiKey) throw new Error('apiKey is required');
        this.#apiKey = apiKey;
        this.#model = model;
        this.#mcpServerUrl = mcpServerUrl;
        this.#mcpServerLabel = mcpServerLabel;
        this.#previousResponseId = null;
        this.#cachedTools = null;
    }

    /**
     * Send a message and get a completion response.
     * Maintains conversation continuity via previousResponseId.
     *
     * @param {string} input - User message
     * @param {object} [options]
     * @param {string} [options.model]        - Override model for this request
     * @param {string} [options.mcpServerUrl] - Override MCP server for this request
     * @returns {Promise<object>} Completion result
     */
    async chat(input, options = {}) {
        const mcpServerUrl = options.mcpServerUrl || this.#mcpServerUrl;

        // Use cached tools if same MCP server, otherwise re-discover
        if (!this.#cachedTools || options.mcpServerUrl) {
            this.#cachedTools = await discoverToolsWithFallback(mcpServerUrl);
        }

        const result = await createCompletion({
            apiKey: this.#apiKey,
            model: options.model || this.#model,
            input,
            mcpServerUrl,
            mcpServerLabel: this.#mcpServerLabel,
            tools: this.#cachedTools,
            previousResponseId: this.#previousResponseId,
        });

        this.#previousResponseId = result.responseId;
        return result;
    }

    /**
     * Reset conversation context (start a new conversation).
     */
    resetConversation() {
        this.#previousResponseId = null;
    }

    /**
     * Change the MCP server URL at runtime.
     * Clears cached tools so they will be re-discovered.
     *
     * @param {string} url - New MCP server URL
     */
    setMcpServer(url) {
        this.#mcpServerUrl = url;
        this.#cachedTools = null;
    }

    /**
     * Change the model at runtime.
     * @param {string} model
     */
    setModel(model) {
        this.#model = model;
    }

    /** Get current config (read-only) */
    get config() {
        return {
            model: this.#model,
            mcpServerUrl: this.#mcpServerUrl,
            mcpServerLabel: this.#mcpServerLabel,
            hasConversation: this.#previousResponseId !== null,
        };
    }
}
