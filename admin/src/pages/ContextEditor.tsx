import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Plus, Trash, Edit, X, Brain, Check, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useKnowledge } from '../context/KnowledgeContext';
import { api } from '../api';
import type { KnowledgeEntry, KnowledgeCategory } from '../types';
import { CATEGORY_CONFIG } from '../types';

interface ChatMessage {
    role: 'user' | 'agent';
    text: string;
    isTyping?: boolean;
}

interface PendingFact {
    category: KnowledgeCategory;
    title: string;
    content: string;
}

// Typing effect component
const TypewriterText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, 15); // Speed of typing
            return () => clearTimeout(timer);
        } else if (onComplete) {
            onComplete();
        }
    }, [currentIndex, text, onComplete]);

    return (
        <div className="prose prose-invert prose-sm max-w-none prose-strong:text-accent prose-strong:font-bold prose-headings:text-accent prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-p:my-1">
            <ReactMarkdown>{displayText}</ReactMarkdown>
        </div>
    );
};

const ContextEditor = () => {
    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'agent', text: '👋 **Привет!** Я твой продюсер.\n\nРасскажи мне о себе — кто ты, чем занимаешься, какие у тебя продукты и услуги.\n\n_Я помогу сформировать твой цифровой портрет._' }
    ]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [pendingFacts, setPendingFacts] = useState<PendingFact[]>([]);
    const [isTypingComplete, setIsTypingComplete] = useState(true);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Knowledge Base State (from Context)
    const { entries, loading: loadingEntries, addEntry, updateEntry, deleteEntry } = useKnowledge();
    const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'all'>('all');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
    const [formData, setFormData] = useState({
        category: 'author' as KnowledgeCategory,
        title: '',
        content: '',
    });



    // Smart scroll - only scroll within chat container
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Keep focus on input
    useEffect(() => {
        if (!sending && isTypingComplete) {
            inputRef.current?.focus();
        }
    }, [sending, isTypingComplete]);



    const handleSendMessage = async () => {
        if (!inputText.trim() || sending) return;

        const userMessage = inputText.trim();
        setInputText('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setSending(true);
        setIsTypingComplete(false);

        try {
            const res = await api.post('/agent-chat', {
                message: userMessage,
                history: messages
            });

            const { reply, facts } = res.data;

            setMessages(prev => [...prev, { role: 'agent', text: reply, isTyping: true }]);

            if (facts && facts.length > 0) {
                setPendingFacts(prev => [...prev, ...facts]);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'agent', text: '❌ Произошла ошибка. Попробуй еще раз.' }]);
            setIsTypingComplete(true);
        } finally {
            setSending(false);
        }
    };

    const handleTypingComplete = (index: number) => {
        setMessages(prev => prev.map((msg, i) =>
            i === index ? { ...msg, isTyping: false } : msg
        ));
        setIsTypingComplete(true);
    };

    const handleApproveFact = async (fact: PendingFact, index: number) => {
        try {
            await addEntry({
                category: fact.category,
                title: fact.title,
                content: fact.content
            });
            setPendingFacts(prev => prev.filter((_, i) => i !== index));
        } catch (err) {
            console.error(err);
        }
    };

    const handleRejectFact = (index: number) => {
        setPendingFacts(prev => prev.filter((_, i) => i !== index));
    };

    // Load draft on mount/when opening modal for new entry
    useEffect(() => {
        if (!showModal || editingEntry) return;

        const draft = localStorage.getItem('context_editor_draft');
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                setFormData(parsed);
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }, [showModal, editingEntry]);

    // Save draft when form data changes (debounced slightly by nature of React state, but explicit debounce is better if high frequency)
    // For simplicity, saving on every change is fine for small text
    useEffect(() => {
        if (!showModal || editingEntry) return;

        if (formData.title || formData.content) {
            localStorage.setItem('context_editor_draft', JSON.stringify(formData));
        }
    }, [formData, showModal, editingEntry]);

    const openModal = (entry?: KnowledgeEntry) => {
        if (entry) {
            setEditingEntry(entry);
            setFormData({
                category: entry.category,
                title: entry.title,
                content: entry.content
            });
        } else {
            setEditingEntry(null);
            // Try to load draft immediately or fall back to default
            const draft = localStorage.getItem('context_editor_draft');
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    setFormData(parsed);
                } catch {
                    setFormData({ category: 'author', title: '', content: '' });
                }
            } else {
                setFormData({ category: 'author', title: '', content: '' });
            }
        }
        setShowModal(true);
    };

    const handleSaveEntry = async () => {
        const payload = {
            ...formData
        };

        try {
            if (editingEntry) {
                await updateEntry(editingEntry._id, payload);
            } else {
                await addEntry(payload);
                // Clear draft on successful save
                localStorage.removeItem('context_editor_draft');
            }
            setShowModal(false);
            // Reset form
            setFormData({ category: 'author', title: '', content: '' });
        } catch (err: any) {
            alert(`Ошибка: ${err.response?.data?.error || err.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить эту запись?')) return;
        try {
            await deleteEntry(id);
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
                <div
                    ref={chatContainerRef}
                    className="bg-surface/50 rounded-xl p-4 h-[400px] overflow-y-auto mb-4 space-y-4 scroll-smooth"
                >
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-lg ${msg.role === 'user'
                                ? 'bg-primary/30 text-text rounded-br-sm border border-primary/20'
                                : 'bg-surface/90 text-text rounded-bl-sm border border-accent/10'
                                }`}>
                                {msg.role === 'agent' && msg.isTyping ? (
                                    <TypewriterText
                                        text={msg.text}
                                        onComplete={() => handleTypingComplete(i)}
                                    />
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none prose-strong:text-accent prose-strong:font-bold prose-headings:text-accent prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-p:my-1">
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-surface/90 text-accent px-4 py-3 rounded-2xl rounded-bl-sm border border-accent/20 flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                                <span className="text-sm text-text-muted">Думаю...</span>
                            </div>
                        </div>
                    )}
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
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl p-2 bg-surface rounded-lg">{cfg.icon}</span>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5" style={{ color: cfg.color }}>
                                                    {cfg.label}
                                                </span>
                                                <h3 className="font-bold text-text text-sm line-clamp-1">{entry.title}</h3>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            <button onClick={() => openModal(entry)} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(entry._id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors">
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pl-[52px]">
                                        <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">{entry.content}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto" onClick={(e) => {
                    if (e.target === e.currentTarget) setShowModal(false);
                }}>
                    <div className="min-h-full flex items-center justify-center p-4">
                        <div className="glass-panel w-full max-w-lg p-6 border border-border relative my-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-text">
                                    {editingEntry ? 'Редактировать запись' : 'Новая запись'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 pb-32"> {/* Added extra padding for mobile keyboard */}
                                <div>
                                    <label className="text-sm font-medium text-text-muted block mb-2">Категория</label>
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
                                    <label className="text-sm font-medium text-text-muted block mb-2">Заголовок</label>
                                    <input
                                        className="input-field w-full"
                                        value={formData.title}
                                        onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                        placeholder="Краткое название факта"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-muted block mb-2">Содержание</label>
                                    <textarea
                                        ref={(el) => {
                                            if (el) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                            }
                                        }}
                                        className="input-field min-h-[120px] w-full resize-none overflow-hidden"
                                        value={formData.content}
                                        onChange={(e) => {
                                            setFormData(p => ({ ...p, content: e.target.value }));
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        placeholder="Полное описание факта..."
                                    />
                                </div>

                                <button onClick={handleSaveEntry} className="btn-primary w-full mt-4 py-3">
                                    {editingEntry ? 'Сохранить изменения' : 'Сохранить факт'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContextEditor;
