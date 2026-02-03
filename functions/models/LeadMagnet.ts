import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadMagnet extends Document {
    name: string;
    description: string;
    type: 'link' | 'text' | 'file';
    content: string;
    triggerId: string;
    isActive: boolean;
    welcomeMessage?: string;
    followUpMessages?: string[];
}

const LeadMagnetSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['link', 'text', 'file'], default: 'link' },
    content: { type: String, required: true }, // URL for link, text body, or file_id
    link: { type: String }, // Backward compatibility
    triggerId: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    welcomeMessage: { type: String },
    followUpMessages: [{ type: String }],
});

export const LeadMagnet = mongoose.models.LeadMagnet || mongoose.model<ILeadMagnet>('LeadMagnet', LeadMagnetSchema);
