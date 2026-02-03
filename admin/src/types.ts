export interface LeadMagnet {
    _id: string;
    name: string;
    description: string;
    link: string;
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
