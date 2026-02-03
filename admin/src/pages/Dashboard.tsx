import { useEffect, useState } from 'react';
import { api } from '../api';
import type { User } from '../types';
import ChatViewer from '../components/ChatViewer';
import { MessageSquare, Calendar, User as UserIcon } from 'lucide-react';

const Dashboard = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    useEffect(() => {
        api.get('/users')
            .then(res => setUsers(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6 pb-20">
            <h2 className="text-xl font-bold font-mono pl-2 border-l-4 border-primary text-text">Активность пользователей</h2>

            {loading ? (
                <div className="glass-panel p-8 text-center animate-pulse text-text-muted">Загрузка данных...</div>
            ) : (
                <div className="glass-panel overflow-hidden border-primary/20 shadow-neon/5">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-surface/50 text-text-muted font-mono uppercase text-xs tracking-wider border-b border-border">
                            <tr>
                                <th className="p-4">Пользователь</th>
                                <th className="p-4 hidden sm:table-cell">Магниты</th>
                                <th className="p-4">Был в сети</th>
                                <th className="p-4 text-right">Чат</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {users.map(user => (
                                <tr key={user._id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
                                                <UserIcon size={16} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-text">{user.firstName} {user.lastName}</div>
                                                <div className="text-xs text-text-muted font-mono">@{user.username || 'unknown'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 hidden sm:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {user.consumedMagnets?.length > 0 ? (
                                                user.consumedMagnets.map(m => (
                                                    <span key={m} className="px-2 py-0.5 bg-secondary/10 text-secondary border border-secondary/20 rounded text-xs font-mono">
                                                        {m}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-text-muted text-xs italic">нет</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-text-muted">
                                        <div className="flex items-center gap-1 text-xs">
                                            <Calendar size={12} />
                                            {new Date(user.lastInteraction).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => setSelectedUserId(user.telegramId)}
                                            className="text-primary hover:text-primary-glow hover:bg-primary/10 p-2 rounded-lg transition-all"
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedUserId && (
                <ChatViewer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
            )}
        </div>
    );
};

export default Dashboard;
