import { useState, useEffect } from 'react';
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
            await api.post('/context', { value: context });
            alert("Saved!");
        } catch (err) {
            console.error(err);
            alert("Error saving");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">Author & Product Context</h2>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">System Instruction</label>
                <textarea
                    className="w-full h-64 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Describe how the bot should behave..."
                />
            </div>
            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium shadow-md active:bg-blue-700 disabled:opacity-50"
            >
                {loading ? "Saving..." : "Save Changes"}
            </button>
        </div>
    );
};

export default ContextEditor;
