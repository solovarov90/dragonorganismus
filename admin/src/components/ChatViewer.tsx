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
            .finally(() => setLoading(false));
    }, [userId]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-lg h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold">Chat History</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? <div className="text-center">Loading...</div> : logs.length === 0 ? (
                        <div className="text-center text-gray-500">No messages found.</div>
                    ) : (
                        logs.map(log => (
                            <div key={log._id} className={`flex ${log.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${log.role === 'assistant' ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'
                                    }`}>
                                    <p>{log.text}</p>
                                    <span className="text-[10px] opacity-70 block mt-1">
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
