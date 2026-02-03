import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemLog extends Document {
    type: 'bot_start' | 'lead_magnet_consumed' | 'admin_action' | 'error' | 'other';
    userId?: string;
    details: string;
    timestamp: Date;
    metadata?: any;
}

const SystemLogSchema: Schema = new Schema({
    type: { type: String, required: true },
    userId: { type: String },
    details: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed }
});

export const SystemLog = mongoose.models.SystemLog || mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
