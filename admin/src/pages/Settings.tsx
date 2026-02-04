import { useState, useEffect } from 'react';
import { Save, Sparkles, Image as ImageIcon, Clock } from 'lucide-react';
import { api } from '../api';
import ReactMarkdown from 'react-markdown';

const Settings = () => {
    const [systemPrompt, setSystemPrompt] = useState('');
    const [bioMessage, setBioMessage] = useState('');
    const [bioPhotoUrl, setBioPhotoUrl] = useState('');
    const [bioDelay, setBioDelay] = useState('20');

    // UI State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploading, setUploading] = useState(false);

    // AI Variations
    const [variations, setVariations] = useState<string[]>([]);
    const [showVariations, setShowVariations] = useState(false);

    // Default System Prompt (Hardcoded fallback from bot.ts)
    const DEFAULT_PROMPT = `Ты — Цифровой Двойник автора (эксперта). 
Твоя задача — общаться с пользователями от имени автора, используя его стиль и знания.

Твои инструкции:
1. Никогда не начинай ответ со слов "Я искусственный интеллект" или "Как языковая модель".
2. Отвечай кратко, по делу, в стиле Telegram-переписки.
3. Используй ВСЕ предоставленные ниже факты о продуктах и авторе (БАЗА ЗНАНИЙ) для формирования ответов.
4. Если информации в базе нет, попробуй ответить, исходя из здравого смысла, или честно скажи, что пока не обсуждал это с автором.
5. Твоя цель — прогревать аудиторию, делиться пользой и вести к целевому действию (получение лид-магнита или продажа).`;

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const [promptRes, bioRes, photoRes, delayRes] = await Promise.all([
                api.get('/context?key=main_system_prompt'),
                api.get('/context?key=bio_message'),
                api.get('/context?key=bio_photo'),
                api.get('/context?key=bio_delay_minutes')
            ]);

            // If empty, show the default template
            setSystemPrompt(promptRes.data.value || DEFAULT_PROMPT);
            setBioMessage(bioRes.data.value || '');
            setBioPhotoUrl(photoRes.data.value || '');
            setBioDelay(delayRes.data.value || '20');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                api.post('/context', { key: 'main_system_prompt', value: systemPrompt }),
                api.post('/context', { key: 'bio_message', value: bioMessage }),
                api.post('/context', { key: 'bio_photo', value: bioPhotoUrl }),
                api.post('/context', { key: 'bio_delay_minutes', value: bioDelay })
            ]);
            alert('Настройки успешно сохранены!');
        } catch (err) {
            console.error(err);
            alert('Ошибка при сохранении настроек');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateBio = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/generate-bio');
            if (res.data.variations) {
                setVariations(res.data.variations);
                setShowVariations(true);
            }
        } catch (err) {
            console.error(err);
            alert('Не удалось сгенерировать варианты');
        } finally {
            setGenerating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const res = await api.post('/upload', {
                    fileBase64: base64,
                    filename: file.name,
                    type: 'photo'
                });

                if (res.data.fileId) {
                    setBioPhotoUrl(res.data.fileId);
                    alert('Фото успешно загружено (Telegram File ID получен)');
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            alert('Ошибка загрузки файла');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="text-center py-10 text-primary animate-pulse">Загрузка настроек...</div>;

    return (
        <div className="space-y-8 pb-20 max-w-4xl mx-auto">

            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                        Настройки Бота
                    </h1>
                    <p className="text-xs text-text-muted">Управление личностью, приветствиями и правилами.</p>
                </div>
            </div>

            {/* System Prompt Section */}
            <div className="glass-panel p-6 shadow-neon/10">
                <h2 className="text-xl font-bold font-mono text-primary mb-4 flex items-center gap-2">
                    <Sparkles size={20} /> Системный Промт (Личность)
                </h2>
                <div className="text-xs text-text-muted mb-4 bg-surface/50 p-3 rounded-lg border border-border">
                    <p className="mb-2 font-bold text-white">🧠 Это "мозг" вашего бота.</p>
                    <p className="mb-2">Здесь вы задаете тон общения, ограничения и инструкции.</p>
                    <p className="opacity-70 flex items-center gap-1">
                        <Save size={12} className="inline" />
                        Обратите внимание: бот <b>автоматически</b> подтягивает факты из раздела "Контекст" (База Знаний) и добавляет их к этому промту при каждом запросе. Вам не нужно вручную копировать сюда факты о продуктах.
                    </p>
                </div>
                <textarea
                    className="input-field min-h-[300px] font-mono text-xs leading-relaxed"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Ты — полезный помощник..."
                />
            </div>

            {/* Bio Message Section */}
            <div className="glass-panel p-6 shadow-neon/10 border-l-4 border-l-secondary relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ImageIcon size={120} />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold font-mono text-secondary mb-1 flex items-center gap-2">
                            <ImageIcon size={20} /> Приветственное сообщение
                        </h2>
                        <p className="text-xs text-text-muted">
                            Знакомство с экспертом (Биография). Отправляется автоматически новым пользователям.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-surface/30 p-2 rounded-lg border border-white/5">
                        <Clock size={16} className="text-secondary" />
                        <div className="text-xs">
                            <span className="text-text-muted mr-2">Задержка (мин):</span>
                            <input
                                type="number"
                                value={bioDelay}
                                onChange={(e) => setBioDelay(e.target.value)}
                                className="bg-transparent border-b border-secondary w-12 text-center font-bold text-white focus:outline-none"
                                min="1"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleGenerateBio}
                        disabled={generating}
                        className="btn-secondary text-xs flex items-center gap-2"
                    >
                        <Sparkles size={16} />
                        {generating ? 'Генерирую варианты...' : 'Сгенерировать с помощью ИИ'}
                    </button>
                </div>

                {/* AI Variations Carousel */}
                {showVariations && (
                    <div className="mb-6 p-4 bg-surface/50 rounded-xl border border-secondary/20 overflow-x-auto flex gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        {variations.map((variant, i) => (
                            <div key={i} className="min-w-[300px] w-[300px] bg-background p-4 rounded-lg border border-border flex flex-col shadow-lg">
                                <div className="text-xs text-secondary mb-2 font-bold uppercase tracking-wider">Вариант {i + 1}</div>
                                <div className="text-xs text-text whitespace-pre-wrap flex-1 overflow-y-auto max-h-[150px] mb-3 p-2 bg-black/20 rounded">
                                    {variant}
                                </div>
                                <button
                                    onClick={() => {
                                        setBioMessage(variant);
                                        setShowVariations(false);
                                    }}
                                    className="btn-primary w-full text-xs py-2"
                                >
                                    Выбрать этот вариант
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowVariations(false)}
                            className="min-w-[50px] flex items-center justify-center hover:bg-white/5 rounded-lg text-text-muted transition-colors"
                        >
                            Закрыть
                        </button>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Editor */}
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-text mb-2 block uppercase tracking-wider opacity-70">Текст сообщения (Markdown)</label>
                            <textarea
                                className="input-field min-h-[300px]"
                                value={bioMessage}
                                onChange={(e) => setBioMessage(e.target.value)}
                                placeholder="Привет! Я..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-text mb-2 block uppercase tracking-wider opacity-70">Вложение</label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="bio-photo-upload"
                                />
                                <label
                                    htmlFor="bio-photo-upload"
                                    className={`btn-secondary cursor-pointer flex items-center gap-2 flex-1 justify-center ${uploading ? 'opacity-50' : ''}`}
                                >
                                    {uploading ? 'Загрузка...' : <><ImageIcon size={16} /> {bioPhotoUrl ? 'Заменить фото' : 'Загрузить фото'}</>}
                                </label>
                                {bioPhotoUrl && (
                                    <button
                                        onClick={() => setBioPhotoUrl('')}
                                        className="text-xs text-red-400 hover:text-red-300 px-3 py-2 hover:bg-red-500/10 rounded transition-colors"
                                        title="Удалить фото"
                                    >
                                        Удалить
                                    </button>
                                )}
                            </div>
                            {bioPhotoUrl && <div className="mt-2 text-[10px] text-green-400 font-mono bg-green-500/10 inline-block px-2 py-1 rounded">ID: {bioPhotoUrl}</div>}
                        </div>
                    </div>

                    {/* Preview */}
                    <div>
                        <label className="text-xs font-bold text-text mb-2 block uppercase tracking-wider opacity-70">Превью (Telegram)</label>
                        <div className="bg-[#182533] rounded-xl overflow-hidden shadow-2xl border border-[#0e1621]">
                            {/* Fake Header */}
                            <div className="bg-[#242f3d] p-3 flex items-center gap-3 border-b border-[#0e1621]">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">bot</div>
                                <div>
                                    <div className="text-white text-sm font-bold leading-none mb-1">Ваш Бот</div>
                                    <div className="text-[#6c7883] text-xs leading-none">bot</div>
                                </div>
                            </div>

                            <div className="p-4 bg-[#0e1621] min-h-[350px] pattern-bg block-bg-pattern">
                                {/* Message Bubble */}
                                <div className="bg-[#2b5278] text-white rounded-lg rounded-tl-none max-w-[95%] shadow-sm relative group">
                                    {bioPhotoUrl && (
                                        <div className="p-1 pb-0">
                                            <div className="w-full aspect-video bg-[#1f2c38] rounded flex items-center justify-center overflow-hidden">
                                                <ImageIcon className="text-white/20 w-12 h-12" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 pb-6 text-[14px] leading-snug">
                                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-a:text-[#64b5ef] prose-strong:font-bold">
                                            <ReactMarkdown>{bioMessage || '*(Сообщение пустое)*'}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <span className="absolute bottom-1 right-2 text-[10px] text-[#6cb3f3]/60">12:00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="fixed bottom-6 right-6 z-30">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-full shadow-lg shadow-green-900/50 flex items-center gap-2 font-bold transition-all hover:scale-105 active:scale-95 border-2 border-white/10 backdrop-blur-sm"
                >
                    {saving ? 'Сохранение...' : <><Save size={20} /> Сохранить изменения</>}
                </button>
            </div>

        </div>
    );
};

export default Settings;
