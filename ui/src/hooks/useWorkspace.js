import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/api';

export function useWorkspace() {
    const [artifacts, setArtifacts] = useState([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiClient.listArtifacts();
            setArtifacts(data.artifacts || []);
        } catch {
            setArtifacts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (apiClient.isAuthenticated()) {
            refresh();
        }
    }, [refresh]);

    const saveArtifact = useCallback(async (name, content) => {
        const result = await apiClient.saveArtifact(name, content);
        await refresh();
        return result;
    }, [refresh]);

    const deleteArtifact = useCallback(async (filename) => {
        await apiClient.deleteArtifact(filename);
        await refresh();
    }, [refresh]);

    const getArtifact = useCallback(async (filename) => {
        const data = await apiClient.getArtifact(filename);
        return data.artifact;
    }, []);

    return { artifacts, loading, refresh, saveArtifact, deleteArtifact, getArtifact };
}
