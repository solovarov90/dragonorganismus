import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadMagnet extends Document {
    name: string;
    description: string;
    link: string;
    triggerId: string; // The ID used in deep linking like /start <triggerId>
    isActive: boolean;
    welcomeMessage?: string;
    followUpMessages?: string[]; // Array of messages to send after delivery
}

const LeadMagnetSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    link: { type: String, required: true },
    triggerId: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    welcomeMessage: { type: String },
    followUpMessages: [{ type: String }],
});

export const LeadMagnet = mongoose.models.LeadMagnet || mongoose.model<ILeadMagnet>('LeadMagnet', LeadMagnetSchema);
