import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageLog extends Document {
    userId: string; // Linked to User.telegramId
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
}

const MessageLogSchema: Schema = new Schema({
    userId: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

export const MessageLog = mongoose.models.MessageLog || mongoose.model<IMessageLog>('MessageLog', MessageLogSchema);
