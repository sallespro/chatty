const API_BASE = '/api';

class ApiClient {
    #token = null;

    setToken(token) {
        this.#token = token;
        localStorage.setItem('chat_jwt', token);
    }

    getToken() {
        if (!this.#token) {
            this.#token = localStorage.getItem('chat_jwt');
        }
        return this.#token;
    }

    clearToken() {
        this.#token = null;
        localStorage.removeItem('chat_jwt');
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    async #fetch(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || `Request failed: ${res.status}`);
        }

        return data;
    }

    // Auth
    async register(name) {
        const data = await this.#fetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        this.setToken(data.token);
        return data;
    }

    async exchangeToken(secret) {
        const data = await this.#fetch('/auth/token', {
            method: 'POST',
            body: JSON.stringify({ secret }),
        });
        this.setToken(data.token);
        return data;
    }

    async getMe() {
        return this.#fetch('/auth/me');
    }

    // Chat
    async chat(input, { model, mcpServerUrl } = {}) {
        return this.#fetch('/chat', {
            method: 'POST',
            body: JSON.stringify({ input, model, mcpServerUrl }),
        });
    }

    // Sessions
    async listSessions() {
        return this.#fetch('/sessions');
    }

    async createSession(title) {
        return this.#fetch('/sessions', {
            method: 'POST',
            body: JSON.stringify({ title }),
        });
    }

    async getSession(sessionId) {
        return this.#fetch(`/sessions/${sessionId}`);
    }

    async updateSession(sessionId, updates) {
        return this.#fetch(`/sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteSession(sessionId) {
        return this.#fetch(`/sessions/${sessionId}`, {
            method: 'DELETE',
        });
    }

    async addSessionMessage(sessionId, message) {
        return this.#fetch(`/sessions/${sessionId}/messages`, {
            method: 'POST',
            body: JSON.stringify(message),
        });
    }

    // Workspace
    async listArtifacts() {
        return this.#fetch('/workspace/artifacts');
    }

    async saveArtifact(name, content) {
        return this.#fetch('/workspace/artifacts', {
            method: 'POST',
            body: JSON.stringify({ name, content }),
        });
    }

    async getArtifact(filename) {
        return this.#fetch(`/workspace/artifacts/${encodeURIComponent(filename)}`);
    }

    async deleteArtifact(filename) {
        return this.#fetch(`/workspace/artifacts/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
        });
    }

    // Sharing
    async createShare(type, data) {
        return this.#fetch('/share', {
            method: 'POST',
            body: JSON.stringify({ type, data }),
        });
    }

    async fetchShare(shareId) {
        // Public endpoint — no auth needed
        const res = await fetch(`/api/share/${shareId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Share not found');
        return data;
    }
}

export const apiClient = new ApiClient();
