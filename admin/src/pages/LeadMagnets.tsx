import { useState, useEffect } from 'react';
import { Plus, Trash, Edit } from 'lucide-react';
import { LeadMagnet } from '../types';
import { api } from '../api';

const LeadMagnets = () => {
    const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
    const [loading, setLoading] = useState(true);

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

    const createMagnet = async () => {
        // Simple prompt based creation for MVP
        const name = prompt("Name:");
        if (!name) return;
        const description = prompt("Description:");
        const link = prompt("Link:");
        const triggerId = prompt("Trigger ID (unique):");
        const welcomeMessage = prompt("Custom Welcome Message (Optional):");

        if (name && description && link && triggerId) {
            await api.post('/lead-magnets', { name, description, link, triggerId, welcomeMessage });
            fetchMagnets();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Lead Magnets</h2>
                <button onClick={createMagnet} className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition">
                    <Plus size={20} />
                </button>
            </div>

            {loading ? <div>Loading...</div> : magnets.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    No lead magnets found. Create one!
                </div>
            ) : (
                <div className="space-y-3">
                    {magnets.map((m) => (
                        <div key={m._id} className="bg-white p-3 rounded-lg shadow-sm border">
                            <h3 className="font-semibold">{m.name}</h3>
                            <p className="text-sm text-gray-500">Trigger: <span className="font-mono bg-gray-100 px-1">/start {m.triggerId}</span></p>
                            <div className="mt-2 flex justify-end space-x-2">
                                <button className="p-1 text-gray-400 hover:text-blue-500"><Edit size={16} /></button>
                                <button className="p-1 text-gray-400 hover:text-red-500"><Trash size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LeadMagnets;
