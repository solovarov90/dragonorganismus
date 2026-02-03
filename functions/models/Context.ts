import mongoose, { Schema, Document } from 'mongoose';

export interface IContext extends Document {
    key: string; // e.g., 'main_system_prompt'
    value: string;
}

const ContextSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
});

export const Context = mongoose.models.Context || mongoose.model<IContext>('Context', ContextSchema);
