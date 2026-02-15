import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/api';

/**
 * Server-backed chat sessions hook.
 * Sessions are stored on the server, scoped by the authenticated user's API key.
 */
export function useChatSessions() {
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(() => {
        return localStorage.getItem('chat_active_session') || null;
    });
    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(false);

    // Persist active session ID locally (just the selection, not the data)
    useEffect(() => {
        if (activeSessionId) {
            localStorage.setItem('chat_active_session', activeSessionId);
        }
    }, [activeSessionId]);

    // Load sessions from server
    const refresh = useCallback(async () => {
        if (!apiClient.isAuthenticated()) return;
        setLoading(true);
        try {
            const data = await apiClient.listSessions();
            setSessions(data.sessions || []);
        } catch (err) {
            console.error('Failed to load sessions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load sessions on mount
    useEffect(() => {
        refresh();
    }, [refresh]);

    // Load active session details (with messages)
    useEffect(() => {
        if (!activeSessionId) {
            setActiveSession(null);
            return;
        }

        let cancelled = false;
        const load = async () => {
            try {
                const data = await apiClient.getSession(activeSessionId);
                if (!cancelled) {
                    setActiveSession(data.session);
                }
            } catch {
                if (!cancelled) {
                    setActiveSession(null);
                    setActiveSessionId(null);
                }
            }
        };
        load();

        return () => { cancelled = true; };
    }, [activeSessionId, sessions]); // re-fetch when sessions list changes

    const createSession = useCallback(async () => {
        try {
            const data = await apiClient.createSession('New Chat');
            setSessions(prev => [{ ...data.session, messageCount: 0 }, ...prev]);
            setActiveSessionId(data.session.id);
            setActiveSession(data.session);
            return data.session;
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    }, []);

    const selectSession = useCallback((id) => {
        setActiveSessionId(id);
    }, []);

    const deleteSession = useCallback(async (id) => {
        try {
            await apiClient.deleteSession(id);
            setSessions(prev => {
                const next = prev.filter(s => s.id !== id);
                if (activeSessionId === id) {
                    const newActive = next.length > 0 ? next[0].id : null;
                    setActiveSessionId(newActive);
                }
                return next;
            });
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    }, [activeSessionId]);

    const addMessage = useCallback(async (sessionId, message) => {
        // Optimistic local update for instant feedback
        setActiveSession(prev => {
            if (!prev || prev.id !== sessionId) return prev;
            const newMsg = {
                id: Date.now().toString(36),
                ...message,
                timestamp: Date.now(),
            };
            const messages = [...(prev.messages || []), newMsg];
            const title = prev.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                : prev.title;
            return { ...prev, messages, title };
        });

        // Persist to server
        try {
            const data = await apiClient.addSessionMessage(sessionId, message);
            // Update session title in the list if it changed
            if (data.sessionTitle) {
                setSessions(prev => prev.map(s =>
                    s.id === sessionId ? { ...s, title: data.sessionTitle, messageCount: (s.messageCount || 0) + 1 } : s
                ));
            }
        } catch (err) {
            console.error('Failed to save message:', err);
        }
    }, []);

    return {
        sessions,
        activeSession,
        activeSessionId,
        sessionsLoading: loading,
        createSession,
        selectSession,
        deleteSession,
        addMessage,
        refreshSessions: refresh,
    };
}
