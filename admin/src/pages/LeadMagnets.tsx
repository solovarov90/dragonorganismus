import { useState, useEffect } from 'react';
import { Plus, Trash, Edit, Link as LinkIcon, FileText, File, Sparkles } from 'lucide-react';
import type { LeadMagnet } from '../types';
import { api } from '../api';

const LeadMagnets = () => {
    const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'link' | 'text' | 'file'>('link');
    const [content, setContent] = useState('');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [triggerId, setTriggerId] = useState('');
    const [isAutoSlug, setIsAutoSlug] = useState(true);

    const [creating, setCreating] = useState(false);

    const fetchMagnets = async () => {
        try {
            const res = await api.get('/lead-magnets');
            setMagnets(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMagnets();
    }, []);

    // Auto-generate slug/triggerId from name
    useEffect(() => {
        if (isAutoSlug && name) {
            const rusToLat: Record<string, string> = {
                'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
                'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
                'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
                'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
                'я': 'ya'
            };

            const slug = name.toLowerCase()
                .split('')
                .map(char => rusToLat[char] || char)
                .join('')
                .replace(/ /g, '_')
                .replace(/[^\w-]+/g, '');
            setTriggerId(slug);
        }
    }, [name, isAutoSlug]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post('/lead-magnets', {
                name,
                description,
                type,
                content,
                triggerId,
                welcomeMessage,
                isActive: true
            });
            // Reset form
            setName('');
            setDescription('');
            setContent('');
            setWelcomeMessage('');
            setTriggerId('');
            setCreating(false);
            fetchMagnets();
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || err.message || 'Ошибка при создании';
            alert(`Ошибка: ${msg}`);
            setCreating(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Create Section */}
            <div className="glass-panel p-6 border-primary/20 shadow-neon/10">
                <div className="flex items-center gap-2 mb-6 text-primary">
                    <Sparkles size={24} />
                    <h2 className="text-xl font-bold font-mono">Создать Лид-магнит</h2>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Название</label>
                            <input
                                className="input-field"
                                placeholder="Например: Чек-лист по дизайну"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-text-muted">ID (Slug)</label>
                                <span
                                    onClick={() => setIsAutoSlug(!isAutoSlug)}
                                    className="text-xs text-primary cursor-pointer hover:underline"
                                >
                                    {isAutoSlug ? 'Авто' : 'Вручную'}
                                </span>
                            </div>
                            <div className="flex items-center bg-surface rounded-lg border border-border px-3">
                                <span className="text-text-muted font-mono text-sm">/start</span>
                                <input
                                    className="bg-transparent border-none focus:ring-0 text-primary font-mono w-full"
                                    placeholder="check_list"
                                    value={triggerId}
                                    onChange={(e) => {
                                        setTriggerId(e.target.value);
                                        setIsAutoSlug(false);
                                    }}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Описание</label>
                        <input
                            className="input-field"
                            placeholder="Краткое описание для вас"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Type Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Тип контента</label>
                            <div className="flex bg-surface rounded-lg p-1 border border-border">
                                <button
                                    type="button"
                                    onClick={() => setType('link')}
                                    className={`flex-1 flex justify-center py-2 rounded-md transition-all ${type === 'link' ? 'bg-primary/20 text-primary' : 'text-text-muted'}`}
                                >
                                    <LinkIcon size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('text')}
                                    className={`flex-1 flex justify-center py-2 rounded-md transition-all ${type === 'text' ? 'bg-primary/20 text-primary' : 'text-text-muted'}`}
                                >
                                    <FileText size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('file')}
                                    className={`flex-1 flex justify-center py-2 rounded-md transition-all ${type === 'file' ? 'bg-primary/20 text-primary' : 'text-text-muted'}`}
                                >
                                    <File size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content Input */}
                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-medium text-text-muted">
                                {type === 'link' ? 'Ссылка' : type === 'text' ? 'Текст сообщения' : 'File ID или Ссылка'}
                            </label>
                            <input
                                className="input-field"
                                placeholder={
                                    type === 'link' ? 'https://example.com' :
                                        type === 'text' ? 'Ваш секретный текст...' :
                                            'BQACAgIAAxkBAA...'
                                }
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Приветственное сообщение (опционально)</label>
                        <textarea
                            className="input-field min-h-[80px]"
                            placeholder="Если пусто, бот отправит стандартное сообщение..."
                            value={welcomeMessage}
                            onChange={(e) => setWelcomeMessage(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={creating}
                        className="btn-primary w-full flex justify-center items-center gap-2 mt-4"
                    >
                        {creating ? 'Создание...' : <><Plus size={20} /> Создать Лид-магнит</>}
                    </button>
                </form>
            </div>

            {/* List Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold font-mono text-text-muted">Активные Магниты</h3>

                {loading ? <div className="text-center text-primary animate-pulse">Загрузка...</div> : magnets.length === 0 ? (
                    <div className="text-center py-10 text-text-muted bg-surface/30 rounded-xl border border-dashed border-border">
                        Список пуст. Создайте первый магнит выше!
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {magnets.map((m) => (
                            <div key={m._id} className="glass-panel p-4 hover:border-primary/50 transition-colors group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button className="text-text-muted hover:text-primary"><Edit size={16} /></button>
                                    <button className="text-text-muted hover:text-red-500"><Trash size={16} /></button>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="bg-surface p-2 rounded-lg border border-border text-primary">
                                        {m.type === 'link' ? <LinkIcon size={24} /> :
                                            m.type === 'text' ? <FileText size={24} /> : <File size={24} />}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-lg truncate">{m.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="text-xs bg-black/50 px-2 py-1 rounded text-secondary font-mono">
                                                /start {m.triggerId}
                                            </code>
                                        </div>
                                        <p className="text-xs text-text-muted mt-2 truncate">{m.description}</p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-border/30 flex justify-between items-center">
                                    <span className="text-xs text-text-muted uppercase font-bold tracking-wider">{m.type}</span>
                                    <a
                                        href={`https://t.me/DragonOrganismusBot?start=${m.triggerId}`}
                                        target="_blank"
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                        Открыть <Sparkles size={10} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeadMagnets;
