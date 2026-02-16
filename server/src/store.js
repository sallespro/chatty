import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from './supabase.js';

/**
 * Supabase-backed store for API keys, usage tracking, and sessions.
 */
class Store {
    // ── API Keys ──────────────────────────────────────

    /**
     * Find or create an API key for a Supabase user.
     * Called on login — creates the key on first login.
     */
    async findOrCreateApiKey(userId, name) {
        // Check if key already exists
        const { data: existing } = await supabaseAdmin
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (existing) {
            return { id: existing.id, name: existing.name, secret: existing.secret };
        }

        // Create new key
        const secret = `ck_${uuidv4().replace(/-/g, '')}`;
        const { data: created, error } = await supabaseAdmin
            .from('api_keys')
            .insert({ user_id: userId, name, secret })
            .select()
            .single();

        if (error) throw new Error(`Failed to create API key: ${error.message}`);

        return { id: created.id, name: created.name, secret: created.secret };
    }

    async findApiKeyByUserId(userId) {
        const { data } = await supabaseAdmin
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .single();

        return data || null;
    }

    async findById(id) {
        const { data } = await supabaseAdmin
            .from('api_keys')
            .select('*')
            .eq('id', id)
            .single();

        return data || null;
    }

    // ── Usage Tracking ────────────────────────────────

    async trackUsage(apiKeyId, tokens) {
        const now = new Date();
        const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

        // Try to upsert usage for current hour-window
        const { data: existing } = await supabaseAdmin
            .from('usage_tracking')
            .select('*')
            .eq('api_key_id', apiKeyId)
            .gte('window_start', windowStart.toISOString())
            .single();

        if (existing) {
            await supabaseAdmin
                .from('usage_tracking')
                .update({ tokens: existing.tokens + tokens })
                .eq('id', existing.id);
        } else {
            await supabaseAdmin
                .from('usage_tracking')
                .insert({ api_key_id: apiKeyId, tokens, window_start: windowStart.toISOString() });
        }
    }

    async getUsage(apiKeyId) {
        const now = new Date();
        const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

        const { data } = await supabaseAdmin
            .from('usage_tracking')
            .select('*')
            .eq('api_key_id', apiKeyId)
            .gte('window_start', windowStart.toISOString())
            .single();

        if (!data) {
            return { tokens: 0, windowStart: now.getTime(), windowRemaining: 3600 };
        }

        const elapsed = now.getTime() - new Date(data.window_start).getTime();
        const remaining = Math.max(0, Math.ceil((3600000 - elapsed) / 1000));
        return { tokens: data.tokens, windowStart: new Date(data.window_start).getTime(), windowRemaining: remaining };
    }

    // ── Sessions (per-user) ───────────────────────────

    async createSession(apiKeyId, title = 'New Chat') {
        const id = uuidv4().split('-')[0] + Date.now().toString(36);

        const { data, error } = await supabaseAdmin
            .from('chat_sessions')
            .insert({ id, api_key_id: apiKeyId, title })
            .select()
            .single();

        if (error) throw new Error(`Failed to create session: ${error.message}`);

        return {
            id: data.id,
            title: data.title,
            messages: [],
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: new Date(data.updated_at).getTime(),
        };
    }

    async getSessions(apiKeyId) {
        const { data: sessions } = await supabaseAdmin
            .from('chat_sessions')
            .select('id, title, created_at, updated_at')
            .eq('api_key_id', apiKeyId)
            .order('updated_at', { ascending: false });

        if (!sessions) return [];

        // Get message counts
        const result = await Promise.all(sessions.map(async (s) => {
            const { count } = await supabaseAdmin
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', s.id);

            return {
                id: s.id,
                title: s.title,
                messageCount: count || 0,
                createdAt: new Date(s.created_at).getTime(),
                updatedAt: new Date(s.updated_at).getTime(),
            };
        }));

        return result;
    }

    async getSession(apiKeyId, sessionId) {
        const { data: session } = await supabaseAdmin
            .from('chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('api_key_id', apiKeyId)
            .single();

        if (!session) return null;

        const { data: messages } = await supabaseAdmin
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });

        return {
            id: session.id,
            title: session.title,
            messages: (messages || []).map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                usage: m.usage,
                model: m.model,
                tools: m.tools,
                timestamp: new Date(m.timestamp).getTime(),
            })),
            createdAt: new Date(session.created_at).getTime(),
            updatedAt: new Date(session.updated_at).getTime(),
        };
    }

    async updateSession(apiKeyId, sessionId, updates) {
        const updateData = { updated_at: new Date().toISOString() };
        if (updates.title !== undefined) updateData.title = updates.title;

        const { data, error } = await supabaseAdmin
            .from('chat_sessions')
            .update(updateData)
            .eq('id', sessionId)
            .eq('api_key_id', apiKeyId)
            .select()
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            title: data.title,
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: new Date(data.updated_at).getTime(),
        };
    }

    async deleteSession(apiKeyId, sessionId) {
        // Messages are cascade-deleted
        const { error } = await supabaseAdmin
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId)
            .eq('api_key_id', apiKeyId);

        return !error;
    }

    async addMessage(apiKeyId, sessionId, message) {
        // Verify session belongs to user
        const { data: session } = await supabaseAdmin
            .from('chat_sessions')
            .select('id, title')
            .eq('id', sessionId)
            .eq('api_key_id', apiKeyId)
            .single();

        if (!session) return null;

        const msgId = uuidv4().split('-')[0];
        const { data: msg, error } = await supabaseAdmin
            .from('chat_messages')
            .insert({
                id: msgId,
                session_id: sessionId,
                role: message.role,
                content: message.content,
                usage: message.usage || null,
                model: message.model || null,
                tools: message.tools || null,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to add message: ${error.message}`);

        // Auto-title from first user message
        const { count } = await supabaseAdmin
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);

        let title = session.title;
        if (count === 1 && message.role === 'user') {
            title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
            await supabaseAdmin
                .from('chat_sessions')
                .update({ title, updated_at: new Date().toISOString() })
                .eq('id', sessionId);
        } else {
            await supabaseAdmin
                .from('chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', sessionId);
        }

        return {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            usage: msg.usage,
            model: msg.model,
            tools: msg.tools,
            timestamp: new Date(msg.timestamp).getTime(),
            sessionTitle: title,
        };
    }
}

export const store = new Store();
