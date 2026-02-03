import { useState, useEffect } from 'react';
import { Save, Bot } from 'lucide-react';
import { api } from '../api';

const ContextEditor = () => {
    const [context, setContext] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/context').then(res => setContext(res.data.value)).catch(console.error);
    }, []);

    const handleSave = async () => {
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

    return (
        <div className="space-y-6 pb-20">
            <div className="glass-panel p-6 shadow-neon/10">
                <div className="flex items-center gap-3 mb-6 text-accent">
                    <Bot size={28} />
                    <div>
                        <h2 className="text-xl font-bold font-mono">Контекст ИИ</h2>
                        <p className="text-xs text-text-muted">Здесь задается личность и знания бота</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <textarea
                        className="input-field min-h-[400px] font-mono text-sm leading-relaxed"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Ты — экспертный помощник..."
                    />

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save size={18} />
                            {loading ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContextEditor;
