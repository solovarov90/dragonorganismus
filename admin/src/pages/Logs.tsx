import { useState, useEffect } from 'react';
import { Activity, User, Bell } from 'lucide-react';
import { api } from '../api';

interface SystemLog {
    _id: string;
    type: string;
    userId: string;
    details: string;
    timestamp: string;
    metadata?: any;
}

const Logs = () => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const res = await api.get('/logs');
            setLogs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'bot_start': return 'text-green-400';
            case 'lead_magnet_consumed': return 'text-purple-400';
            case 'error': return 'text-red-400';
            default: return 'text-text';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bot_start': return <User size={16} />;
            case 'lead_magnet_consumed': return <Bell size={16} />;
            case 'error': return <Activity size={16} />;
            default: return <Activity size={16} />;
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="glass-panel p-6 shadow-neon/10">
                <div className="flex items-center gap-3 mb-6 text-accent">
                    <Activity size={24} />
                    <h2 className="text-xl font-bold font-mono">Системный Журнал</h2>
                </div>

                {loading ? (
                    <div className="text-center text-text-muted animate-pulse">Загрузка...</div>
                ) : (
                    <div className="space-y-4">
                        {logs.length === 0 ? (
                            <div className="text-center text-text-muted py-8">Пусто...</div>
                        ) : (
                            logs.map(log => (
                                <div key={log._id} className="bg-surface/50 border border-border/50 rounded-lg p-3 flex flex-col md:flex-row gap-3 text-sm">
                                    <div className="flex items-center gap-2 min-w-[150px] font-mono text-xs text-text-muted">
                                        {new Date(log.timestamp).toLocaleString('ru-RU')}
                                    </div>
                                    <div className={`flex items-center gap-2 font-bold uppercase text-xs tracking-wider min-w-[120px] ${getTypeColor(log.type)}`}>
                                        {getTypeIcon(log.type)}
                                        {log.type.replace(/_/g, ' ')}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-text">{log.details}</p>
                                        <p className="text-xs text-text-muted mt-1 font-mono">User ID: {log.userId}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Logs;
