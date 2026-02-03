import { useState, useEffect } from 'react';
import { Send, Users, Magnet, Paperclip, CheckCircle, AlertTriangle, Image, File } from 'lucide-react';
import { api } from '../api';
import type { LeadMagnet } from '../types';

const Broadcasts = () => {
    const [segment, setSegment] = useState<'all' | 'magnet'>('all');
    const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
    const [selectedMagnet, setSelectedMagnet] = useState('');
    const [message, setMessage] = useState('');
    const [attachmentType, setAttachmentType] = useState<'text' | 'photo' | 'document'>('text');
    const [attachment, setAttachment] = useState('');

    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        // Fetch magnets for the dropdown
        api.get('/lead-magnets')
            .then(res => setMagnets(res.data))
            .catch(console.error);
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setStatus(null);

        if (segment === 'magnet' && !selectedMagnet) {
            setStatus({ type: 'error', text: 'Выберите лид-магнит для сегментации' });
            setSending(false);
            return;
        }

        if (!message) {
            setStatus({ type: 'error', text: 'Введите текст сообщения' });
            setSending(false);
            return;
        }

        try {
            const payload = {
                segment,
                magnetId: segment === 'magnet' ? selectedMagnet : undefined,
                message,
                type: attachmentType,
                attachment: attachmentType !== 'text' ? attachment : undefined
            };

            const res = await api.post('/broadcast', payload);

            setStatus({
                type: 'success',
                text: `Рассылка завершена! Отправлено: ${res.data.sent}, Ошибок: ${res.data.failed}`
            });

            // Clear critical fields on success, keep segment
            setMessage('');
            setAttachment('');

        } catch (err: any) {
            console.error(err);
            setStatus({
                type: 'error',
                text: err.response?.data?.error || 'Ошибка при отправке рассылки'
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="glass-panel p-6 border-primary/20 shadow-neon/10">
                <div className="flex items-center gap-2 mb-6 text-primary">
                    <Send size={24} />
                    <h2 className="text-xl font-bold font-mono">Создать Рассылку</h2>
                </div>

                <form onSubmit={handleSend} className="space-y-6">

                    {/* Segment Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Получатели</label>
                        <div className="flex gap-4 p-1 bg-surface rounded-lg border border-border">
                            <button
                                type="button"
                                onClick={() => setSegment('all')}
                                className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${segment === 'all' ? 'bg-primary/20 text-primary' : 'text-text-muted'}`}
                            >
                                <Users size={18} />
                                Все пользователи
                            </button>
                            <button
                                type="button"
                                onClick={() => setSegment('magnet')}
                                className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${segment === 'magnet' ? 'bg-primary/20 text-primary' : 'text-text-muted'}`}
                            >
                                <Magnet size={18} />
                                По магниту
                            </button>
                        </div>
                    </div>

                    {segment === 'magnet' && (
                        <div className="space-y-2 animate-in slide-in-from-top">
                            <label className="text-sm font-medium text-text-muted">Выберите магнит</label>
                            <select
                                className="input-field"
                                value={selectedMagnet}
                                onChange={(e) => setSelectedMagnet(e.target.value)}
                            >
                                <option value="">-- Выберите магнит --</option>
                                {magnets.map(m => (
                                    <option key={m.triggerId} value={m.triggerId}>
                                        {m.name} ({m.triggerId})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Message Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Тип сообщения</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setAttachmentType('text')}
                                className={`px-4 py-2 rounded-lg border border-border transition-all ${attachmentType === 'text' ? 'bg-primary/20 border-primary text-primary' : 'bg-surface text-text-muted'}`}
                            >
                                Текст
                            </button>
                            <button
                                type="button"
                                onClick={() => setAttachmentType('photo')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-border transition-all ${attachmentType === 'photo' ? 'bg-primary/20 border-primary text-primary' : 'bg-surface text-text-muted'}`}
                            >
                                <Image size={16} /> Фото
                            </button>
                            <button
                                type="button"
                                onClick={() => setAttachmentType('document')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-border transition-all ${attachmentType === 'document' ? 'bg-primary/20 border-primary text-primary' : 'bg-surface text-text-muted'}`}
                            >
                                <File size={16} /> Документ
                            </button>
                        </div>
                    </div>

                    {/* Attachment Input */}
                    {attachmentType !== 'text' && (
                        <div className="space-y-2 animate-in slide-in-from-left">
                            <label className="text-sm font-medium text-text-muted">
                                {attachmentType === 'photo' ? 'Ссылка на фото или File ID' : 'Ссылка на документ или File ID'}
                            </label>
                            <div className="flex items-center gap-2 bg-surface rounded-lg border border-border px-3">
                                <Paperclip size={18} className="text-text-muted" />
                                <input
                                    className="bg-transparent border-none focus:ring-0 text-text w-full py-2"
                                    placeholder="https://... или AgACAg... (или выберите файл)"
                                    value={attachment}
                                    onChange={(e) => setAttachment(e.target.value)}
                                />
                                <label className="cursor-pointer p-1 hover:bg-primary/20 rounded transition-colors" title="Загрузить файл">
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            // 4MB limit for Serverless Function body
                                            if (file.size > 4 * 1024 * 1024) {
                                                alert("Файл слишком большой (макс 4MB). Используйте File ID для больших файлов.");
                                                return;
                                            }

                                            setAttachment("Загрузка...");

                                            const reader = new FileReader();
                                            reader.readAsDataURL(file);
                                            reader.onload = async () => {
                                                const base64 = reader.result?.toString().split(',')[1];
                                                try {
                                                    const res = await api.post('/upload', {
                                                        fileBase64: base64,
                                                        filename: file.name,
                                                        type: attachmentType // hint to backend
                                                    });
                                                    setAttachment(res.data.fileId);
                                                    // Optional: setAttachmentType based on file?
                                                } catch (err) {
                                                    console.error(err);
                                                    setAttachment("");
                                                    alert("Ошибка загрузки");
                                                }
                                            };
                                        }}
                                    />
                                    <div className="text-primary text-xs font-bold border border-primary px-2 py-0.5 rounded">URL/File</div>
                                </label>
                            </div>
                            <p className="text-xs text-text-muted">
                                Можно использовать прямую ссылку или Telegram File ID (рекомендуется для скорости).
                            </p>
                        </div>
                    )}

                    {/* Message Body */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Текст сообщения (Markdown)</label>
                        <textarea
                            className="input-field min-h-[150px] font-mono text-sm"
                            placeholder="Привет! У нас новости..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        />
                    </div>

                    {/* Status & Action */}
                    {status && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                            <p className="text-sm">{status.text}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={sending}
                        className="btn-primary w-full flex justify-center items-center gap-2 h-12 text-lg"
                    >
                        {sending ? 'Отправка...' : <><Send size={20} /> Отправить Рассылку</>}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default Broadcasts;
