import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Plus, Trash, Edit, X, Brain, Check, XCircle } from 'lucide-react';
import { api } from '../api';
import type { KnowledgeEntry, KnowledgeCategory } from '../types';
import { CATEGORY_CONFIG } from '../types';

interface ChatMessage {
    role: 'user' | 'agent';
    text: string;
}

interface PendingFact {
    category: KnowledgeCategory;
    title: string;
    content: string;
}

const ContextEditor = () => {
    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'agent', text: 'Привет! Я твой продюсер. Расскажи мне о себе — кто ты, чем занимаешься, какие у тебя продукты и услуги. Я помогу сформировать твой цифровой портрет.' }
    ]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [pendingFacts, setPendingFacts] = useState<PendingFact[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Knowledge Base State
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'all'>('all');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
    const [formData, setFormData] = useState({
        category: 'author' as KnowledgeCategory,
        title: '',
        content: '',
        keywords: ''
    });

    useEffect(() => {
        fetchEntries();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchEntries = async () => {
        try {
            const res = await api.get('/knowledge');
            setEntries(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingEntries(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || sending) return;

        const userMessage = inputText.trim();
        setInputText('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setSending(true);

        try {
            const res = await api.post('/agent-chat', {
                message: userMessage,
                history: messages
            });

            const { reply, facts } = res.data;

            setMessages(prev => [...prev, { role: 'agent', text: reply }]);

            if (facts && facts.length > 0) {
                setPendingFacts(prev => [...prev, ...facts]);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'agent', text: 'Произошла ошибка. Попробуй еще раз.' }]);
        } finally {
            setSending(false);
        }
    };

    const handleApproveFact = async (fact: PendingFact, index: number) => {
        try {
            await api.post('/knowledge', {
                category: fact.category,
                title: fact.title,
                content: fact.content,
                keywords: []
            });
            setPendingFacts(prev => prev.filter((_, i) => i !== index));
            fetchEntries();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRejectFact = (index: number) => {
        setPendingFacts(prev => prev.filter((_, i) => i !== index));
    };

    const openModal = (entry?: KnowledgeEntry) => {
        if (entry) {
            setEditingEntry(entry);
            setFormData({
                category: entry.category,
                title: entry.title,
                content: entry.content,
                keywords: entry.keywords?.join(', ') || ''
            });
        } else {
            setEditingEntry(null);
            setFormData({ category: 'author', title: '', content: '', keywords: '' });
        }
        setShowModal(true);
    };

    const handleSaveEntry = async () => {
        const payload = {
            ...formData,
            keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean)
        };

        try {
            if (editingEntry) {
                await api.put(`/knowledge?id=${editingEntry._id}`, payload);
            } else {
                await api.post('/knowledge', payload);
            }
            setShowModal(false);
            fetchEntries();
        } catch (err: any) {
            alert(`Ошибка: ${err.response?.data?.error || err.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить эту запись?')) return;
        try {
            await api.delete(`/knowledge?id=${id}`);
            fetchEntries();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredEntries = activeCategory === 'all'
        ? entries
        : entries.filter(e => e.category === activeCategory);

    const categories = Object.keys(CATEGORY_CONFIG) as KnowledgeCategory[];

    return (
        <div className="space-y-8 pb-20">
            {/* Chat Section */}
            <div className="glass-panel p-6 shadow-neon/10">
                <div className="flex items-center gap-3 mb-4 text-accent">
                    <Bot size={28} />
                    <div>
                        <h2 className="text-xl font-bold font-mono">Продюсер</h2>
                        <p className="text-xs text-text-muted">Расскажи о себе — я сформирую твой портрет</p>
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="bg-surface/50 rounded-xl p-4 h-[300px] overflow-y-auto mb-4 space-y-3">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-primary/20 text-text rounded-br-sm'
                                    : 'bg-surface text-text rounded-bl-sm'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-surface text-text-muted px-4 py-2 rounded-2xl rounded-bl-sm animate-pulse">
                                Думаю...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Pending Facts */}
                {pendingFacts.length > 0 && (
                    <div className="mb-4 space-y-2">
                        <p className="text-xs text-text-muted font-bold uppercase tracking-wider">Найденные факты:</p>
                        {pendingFacts.map((fact, i) => {
                            const cfg = CATEGORY_CONFIG[fact.category];
                            return (
                                <div key={i} className="bg-surface/80 rounded-lg p-3 border-l-4 flex items-start gap-3" style={{ borderLeftColor: cfg?.color || '#888' }}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm">{cfg?.icon}</span>
                                            <span className="text-xs font-bold" style={{ color: cfg?.color }}>{cfg?.label}</span>
                                        </div>
                                        <p className="font-bold text-sm text-text">{fact.title}</p>
                                        <p className="text-xs text-text-muted">{fact.content.slice(0, 100)}...</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleApproveFact(fact, i)} className="p-2 bg-primary/20 rounded-lg hover:bg-primary/40 text-primary">
                                            <Check size={16} />
                                        </button>
                                        <button onClick={() => handleRejectFact(i)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 text-red-400">
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Input */}
                <div className="flex gap-2">
                    <input
                        className="input-field flex-1"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Расскажи о себе..."
                        disabled={sending}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={sending || !inputText.trim()}
                        className="btn-primary px-4"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* Knowledge Base Section */}
            <div className="glass-panel p-6 shadow-neon/10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-primary">
                        <Brain size={28} />
                        <div>
                            <h2 className="text-xl font-bold font-mono">База знаний</h2>
                            <p className="text-xs text-text-muted">Факты для использования в ответах</p>
                        </div>
                    </div>
                    <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
                        <Plus size={18} /> Добавить
                    </button>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeCategory === 'all'
                            ? 'bg-white/10 border-white/30 text-white'
                            : 'border-border text-text-muted hover:border-white/20'
                            }`}
                    >
                        Все ({entries.length})
                    </button>
                    {categories.map(cat => {
                        const cfg = CATEGORY_CONFIG[cat];
                        const count = entries.filter(e => e.category === cat).length;
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                    borderColor: activeCategory === cat ? cfg.color : undefined,
                                    color: activeCategory === cat ? cfg.color : undefined
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeCategory === cat
                                    ? 'bg-white/5'
                                    : 'border-border text-text-muted hover:border-white/20'
                                    }`}
                            >
                                {cfg.icon} {cfg.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Entries Grid */}
                {loadingEntries ? (
                    <div className="text-center text-primary animate-pulse py-8">Загрузка...</div>
                ) : filteredEntries.length === 0 ? (
                    <div className="text-center py-10 text-text-muted border border-dashed border-border rounded-xl">
                        {activeCategory === 'all' ? 'База знаний пуста. Добавьте первую запись!' : 'Нет записей в этой категории.'}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredEntries.map(entry => {
                            const cfg = CATEGORY_CONFIG[entry.category];
                            return (
                                <div
                                    key={entry._id}
                                    className="glass-panel p-4 hover:border-white/30 transition-colors group relative"
                                    style={{ borderLeftColor: cfg.color, borderLeftWidth: 4 }}
                                >
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={() => openModal(entry)} className="p-1 hover:text-primary"><Edit size={14} /></button>
                                        <button onClick={() => handleDelete(entry._id)} className="p-1 hover:text-red-500"><Trash size={14} /></button>
                                    </div>

                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{cfg.icon}</span>
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-text truncate">{entry.title}</h3>
                                    <p className="text-xs text-text-muted mt-1 line-clamp-3">{entry.content}</p>
                                    {entry.keywords?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {entry.keywords.slice(0, 3).map(kw => (
                                                <span key={kw} className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-text-muted">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="glass-panel w-full max-w-lg p-6 border border-border">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-text">
                                {editingEntry ? 'Редактировать запись' : 'Новая запись'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-text-muted block mb-1">Категория</label>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => {
                                        const cfg = CATEGORY_CONFIG[cat];
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, category: cat }))}
                                                style={{
                                                    borderColor: formData.category === cat ? cfg.color : undefined,
                                                    backgroundColor: formData.category === cat ? `${cfg.color}20` : undefined
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border transition-all"
                                            >
                                                {cfg.icon} {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-text-muted block mb-1">Заголовок</label>
                                <input
                                    className="input-field"
                                    value={formData.title}
                                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Краткое название факта"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-text-muted block mb-1">Содержание</label>
                                <textarea
                                    className="input-field min-h-[120px]"
                                    value={formData.content}
                                    onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                                    placeholder="Полное описание факта..."
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-text-muted block mb-1">Ключевые слова (через запятую)</label>
                                <input
                                    className="input-field"
                                    value={formData.keywords}
                                    onChange={(e) => setFormData(p => ({ ...p, keywords: e.target.value }))}
                                    placeholder="цена, продукт, курс"
                                />
                            </div>

                            <button onClick={handleSaveEntry} className="btn-primary w-full mt-4">
                                {editingEntry ? 'Сохранить изменения' : 'Создать запись'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContextEditor;
