import { useEffect, useState } from 'react';
import { api } from '../api';
import type { MessageLog } from '../types';
import { X } from 'lucide-react';

interface Props {
    userId: string;
    onClose: () => void;
}

const ChatViewer = ({ userId, onClose }: Props) => {
    const [logs, setLogs] = useState<MessageLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/chat-logs?userId=${userId}`)
            .then(res => setLogs(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-lg h-[80vh] flex flex-col border border-border shadow-2xl">
                <div className="p-4 border-b border-border flex justify-between items-center bg-surface/50">
                    <h3 className="font-bold font-mono text-text">История чата</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="text-center text-primary animate-pulse py-10">Загрузка сообщений...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center text-text-muted py-10 italic">История сообщений пуста.</div>
                    ) : (
                        logs.map(log => (
                            <div key={log._id} className={`flex ${log.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-md ${log.role === 'assistant'
                                        ? 'bg-surface border border-border text-text rounded-tl-none'
                                        : 'bg-primary/20 text-text border border-primary/20 rounded-tr-none'
                                    }`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{log.text}</p>
                                    <span className="text-[10px] opacity-50 block mt-2 font-mono text-right">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatViewer;
