import { useState, useEffect } from 'react';
import { Save, Sparkles, Image as ImageIcon, Eye } from 'lucide-react';
import { api } from '../api';
import ReactMarkdown from 'react-markdown';

const Settings = () => {
    const [systemPrompt, setSystemPrompt] = useState('');
    const [bioMessage, setBioMessage] = useState('');
    const [bioPhotoUrl, setBioPhotoUrl] = useState('');

    // UI State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploading, setUploading] = useState(false);

    // AI Variations
    const [variations, setVariations] = useState<string[]>([]);
    const [showVariations, setShowVariations] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const [promptRes, bioRes, photoRes] = await Promise.all([
                api.get('/context?key=main_system_prompt'),
                api.get('/context?key=bio_message'),
                api.get('/context?key=bio_photo')
            ]);

            setSystemPrompt(promptRes.data.value || '');
            setBioMessage(bioRes.data.value || '');
            setBioPhotoUrl(photoRes.data.value || '');
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
                api.post('/context', { key: 'bio_photo', value: bioPhotoUrl })
            ]);
            alert('Settings saved successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to save settings');
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
            alert('Failed to generate variations');
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
                    alert('Photo uploaded! It will be sent as a file_id.');
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="text-center py-10 text-primary animate-pulse">Loading settings...</div>;

    return (
        <div className="space-y-8 pb-20 max-w-4xl mx-auto">

            {/* System Prompt Section */}
            <div className="glass-panel p-6 shadow-neon/10">
                <h2 className="text-xl font-bold font-mono text-primary mb-4 flex items-center gap-2">
                    <Sparkles size={20} /> System Prompt
                </h2>
                <p className="text-xs text-text-muted mb-4">
                    The core instructions for the AI agent (Digital Twin). Defines personality, tone, and rules.
                </p>
                <textarea
                    className="input-field min-h-[200px] font-mono text-xs"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are a helpful assistant..."
                />
            </div>

            {/* Bio Message Section */}
            <div className="glass-panel p-6 shadow-neon/10 border-l-4 border-l-secondary">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-bold font-mono text-secondary mb-2 flex items-center gap-2">
                            <ImageIcon size={20} /> Bio / Welcome Message
                        </h2>
                        <p className="text-xs text-text-muted">
                            Sent automatically 20 minutes after a user joins (if they haven't received it yet).
                        </p>
                    </div>
                    <button
                        onClick={handleGenerateBio}
                        disabled={generating}
                        className="btn-secondary text-xs flex items-center gap-2"
                    >
                        <Sparkles size={16} />
                        {generating ? 'Generating...' : 'Generate with AI'}
                    </button>
                </div>

                {/* AI Variations Carousel */}
                {showVariations && (
                    <div className="mb-6 p-4 bg-surface/50 rounded-xl border border-secondary/20 overflow-x-auto flex gap-4">
                        {variations.map((variant, i) => (
                            <div key={i} className="min-w-[300px] w-[300px] bg-background p-4 rounded-lg border border-border flex flex-col">
                                <div className="text-xs text-text-muted mb-2 font-bold">Option {i + 1}</div>
                                <div className="text-xs text-text whitespace-pre-wrap flex-1 overflow-y-auto max-h-[200px] mb-3">
                                    {variant}
                                </div>
                                <button
                                    onClick={() => {
                                        setBioMessage(variant);
                                        setShowVariations(false);
                                    }}
                                    className="btn-primary w-full text-xs py-1"
                                >
                                    Select
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowVariations(false)}
                            className="min-w-[50px] flex items-center justify-center hover:bg-white/5 rounded-lg text-text-muted"
                        >
                            Close
                        </button>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Editor */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-text mb-2 block">Message Text (Markdown)</label>
                            <textarea
                                className="input-field min-h-[300px]"
                                value={bioMessage}
                                onChange={(e) => setBioMessage(e.target.value)}
                                placeholder="Hello! I am..."
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-text mb-2 block">Photo (Optional)</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="bio-photo-upload"
                                />
                                <label
                                    htmlFor="bio-photo-upload"
                                    className="btn-secondary cursor-pointer flex items-center gap-2"
                                >
                                    {uploading ? 'Uploading...' : <><ImageIcon size={16} /> Upload Photo</>}
                                </label>
                                {bioPhotoUrl && <span className="text-xs text-green-400">Photo Set! (ID: ...{bioPhotoUrl.slice(-6)})</span>}
                            </div>
                            {bioPhotoUrl && (
                                <button
                                    onClick={() => setBioPhotoUrl('')}
                                    className="text-xs text-red-400 mt-1 hover:underline"
                                >
                                    Remove Photo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-[#182533] rounded-xl p-4 border border-[#2b3e52] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-secondary/50"></div>
                        <div className="flex items-center gap-2 mb-4 text-[#6c7883] text-xs font-bold uppercase tracking-wider">
                            <Eye size={14} /> Telegram Preview
                        </div>

                        {bioPhotoUrl && (
                            <div className="w-full h-40 bg-[#2b3e52] rounded-t-lg mb-1 flex items-center justify-center text-[#6c7883]">
                                <ImageIcon size={32} />
                                <span className="ml-2 text-xs">Photo attached</span>
                            </div>
                        )}

                        <div className="bg-[#2b3e52] text-white p-3 rounded-b-lg rounded-tr-lg inline-block max-w-[90%] text-sm leading-relaxed">
                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
                                <ReactMarkdown>{bioMessage || '*(Empty message)*'}</ReactMarkdown>
                            </div>
                            <div className="text-[10px] text-[#6c7883] text-right mt-1">14:02</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="fixed bottom-6 right-6 z-30">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-full shadow-lg shadow-green-900/50 flex items-center gap-2 font-bold transition-all hover:scale-105 active:scale-95"
                >
                    {saving ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                </button>
            </div>

        </div>
    );
};

export default Settings;
