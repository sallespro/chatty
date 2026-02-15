import { useState, useCallback, useEffect } from 'react';

const SETTINGS_KEY = 'chat_settings';

const DEFAULT_SETTINGS = {
    model: 'gpt-4.1-mini',
    mcpServerUrl: 'https://cool.cloudpilot.com.br/mcp',
};

export function useSettings() {
    const [settings, setSettings] = useState(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });

    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings]);

    const updateSettings = useCallback((updates) => {
        setSettings((prev) => ({ ...prev, ...updates }));
    }, []);

    return { settings, updateSettings, DEFAULT_SETTINGS };
}
