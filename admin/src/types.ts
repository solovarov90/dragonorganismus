export interface LeadMagnet {
    _id: string;
    name: string;
    description: string;
    type: 'link' | 'text' | 'file';
    content: string;
    triggerId: string;
    isActive: boolean;
    welcomeMessage?: string;
    followUpMessages?: string[];
}

export interface BotContext {
    _id: string;
    key: string;
    value: string;
}

export interface User {
    _id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    lastInteraction: string;
    consumedMagnets: string[];
}

export interface MessageLog {
    _id: string;
    userId: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: string;
}

export type KnowledgeCategory = 'author' | 'product' | 'faq' | 'expertise' | 'tone' | 'rules';

export interface KnowledgeEntry {
    _id: string;
    category: KnowledgeCategory;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export const CATEGORY_CONFIG: Record<KnowledgeCategory, { label: string; color: string; icon: string }> = {
    author: { label: 'Автор', color: '#8b5cf6', icon: '🧑‍💼' },
    product: { label: 'Продукт', color: '#10b981', icon: '📦' },
    faq: { label: 'FAQ', color: '#3b82f6', icon: '❓' },
    expertise: { label: 'Экспертиза', color: '#f59e0b', icon: '📚' },
    tone: { label: 'Тон общения', color: '#ec4899', icon: '💬' },
    rules: { label: 'Правила', color: '#ef4444', icon: '📋' },
};
