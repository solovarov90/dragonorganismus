
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api';
import type { KnowledgeEntry } from '../types';

interface KnowledgeContextType {
    entries: KnowledgeEntry[];
    loading: boolean;
    refreshEntries: () => Promise<void>;
    addEntry: (data: Omit<KnowledgeEntry, '_id' | 'createdAt' | 'updatedAt' | 'keywords'>) => Promise<void>;
    updateEntry: (id: string, data: Partial<KnowledgeEntry>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

export const KnowledgeProvider = ({ children }: { children: ReactNode }) => {
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshEntries = async () => {
        try {
            const res = await api.get('/knowledge');
            setEntries(res.data);
        } catch (err) {
            console.error('Failed to fetch knowledge entries', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshEntries();
    }, []);

    const addEntry = async (data: any) => {
        await api.post('/knowledge', data);
        await refreshEntries();
    };

    const updateEntry = async (id: string, data: any) => {
        await api.put(`/knowledge?id=${id}`, data);
        await refreshEntries();
    };

    const deleteEntry = async (id: string) => {
        await api.delete(`/knowledge?id=${id}`);
        await refreshEntries();
    };

    return (
        <KnowledgeContext.Provider value={{ entries, loading, refreshEntries, addEntry, updateEntry, deleteEntry }}>
            {children}
        </KnowledgeContext.Provider>
    );
};

export const useKnowledge = () => {
    const context = useContext(KnowledgeContext);
    if (!context) {
        throw new Error('useKnowledge must be used within a KnowledgeProvider');
    }
    return context;
};
