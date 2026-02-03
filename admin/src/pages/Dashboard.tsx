import { useEffect, useState } from 'react';
import { api } from '../api';
import type { User } from '../types';
import ChatViewer from '../components/ChatViewer';
import { MessageSquare } from 'lucide-react';

const Dashboard = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    useEffect(() => {
        api.get('/users').then(res => setUsers(res.data)).catch(console.error);
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">User Activity</h2>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="p-3">User</th>
                            <th className="p-3">Magnets</th>
                            <th className="p-3">Last Active</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user._id}>
                                <td className="p-3">
                                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                                    <div className="text-xs text-gray-500">@{user.username || 'unknown'}</div>
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                        {user.consumedMagnets?.map(m => (
                                            <span key={m} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-3 text-gray-500">
                                    {new Date(user.lastInteraction).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-right">
                                    <button
                                        onClick={() => setSelectedUserId(user.telegramId)}
                                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                    >
                                        <MessageSquare size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedUserId && (
                <ChatViewer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
            )}
        </div>
    );
};

export default Dashboard;
