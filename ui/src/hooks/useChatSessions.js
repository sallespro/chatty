import { useState, useCallback, useEffect } from 'react';

const SESSIONS_KEY = 'chat_sessions';
const ACTIVE_SESSION_KEY = 'chat_active_session';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadSessions() {
    try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveSessions(sessions) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function loadActiveSessionId() {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
}

function saveActiveSessionId(id) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function useChatSessions() {
    const [sessions, setSessions] = useState(() => loadSessions());
    const [activeSessionId, setActiveSessionId] = useState(() => {
        const id = loadActiveSessionId();
        const sessions = loadSessions();
        if (id && sessions.some((s) => s.id === id)) return id;
        return sessions.length > 0 ? sessions[0].id : null;
    });

    // Persist sessions
    useEffect(() => {
        saveSessions(sessions);
    }, [sessions]);

    // Persist active session
    useEffect(() => {
        if (activeSessionId) saveActiveSessionId(activeSessionId);
    }, [activeSessionId]);

    const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

    const createSession = useCallback(() => {
        const newSession = {
            id: generateId(),
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        return newSession;
    }, []);

    const selectSession = useCallback((id) => {
        setActiveSessionId(id);
    }, []);

    const deleteSession = useCallback(
        (id) => {
            setSessions((prev) => {
                const next = prev.filter((s) => s.id !== id);
                if (activeSessionId === id) {
                    setActiveSessionId(next.length > 0 ? next[0].id : null);
                }
                return next;
            });
        },
        [activeSessionId]
    );

    const addMessage = useCallback(
        (sessionId, message) => {
            setSessions((prev) =>
                prev.map((s) => {
                    if (s.id !== sessionId) return s;
                    const messages = [...s.messages, { ...message, id: generateId(), timestamp: Date.now() }];
                    // Auto-title from first user message
                    const title =
                        s.messages.length === 0 && message.role === 'user'
                            ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                            : s.title;
                    return { ...s, messages, title, updatedAt: Date.now() };
                })
            );
        },
        []
    );

    return {
        sessions,
        activeSession,
        activeSessionId,
        createSession,
        selectSession,
        deleteSession,
        addMessage,
    };
}
