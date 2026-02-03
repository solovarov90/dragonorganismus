import { useState, useEffect } from 'react';
import { Save, Bot, Plus, Trash, Edit, X, Brain } from 'lucide-react';
import { api } from '../api';
import type { KnowledgeEntry, KnowledgeCategory } from '../types';
import { CATEGORY_CONFIG } from '../types';

const ContextEditor = () => {
    const [context, setContext] = useState("");
    const [loading, setLoading] = useState(false);

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
        api.get('/context').then(res => setContext(res.data.value || '')).catch(console.error);
        fetchEntries();
    }, []);

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

    const handleSaveContext = async () => {
        setLoading(true);
        try {
            await api.post('/context', { key: 'main_system_prompt', value: context });
            alert("Сохранено!");
        } catch (err) {
            console.error(err);
            alert("Ошибка сохранения");
        } finally {
            setLoading(false);
        }
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
            {/* System Prompt Section */}
            <div className="glass-panel p-6 shadow-neon/10">
                <div className="flex items-center gap-3 mb-6 text-accent">
                    <Bot size={28} />
                    <div>
                        <h2 className="text-xl font-bold font-mono">Системный промпт</h2>
                        <p className="text-xs text-text-muted">Базовая инструкция для ИИ</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <textarea
                        className="input-field min-h-[200px] font-mono text-sm leading-relaxed"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Ты — экспертный помощник..."
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveContext}
                            disabled={loading}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save size={18} />
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
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
