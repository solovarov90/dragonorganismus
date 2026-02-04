import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    telegramId: string;
    username: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
    lastInteraction: Date;
    consumedMagnets: string[];
    learningMode?: boolean;
    onboardingMode?: boolean;
    bioSent?: boolean;
}

const UserSchema: Schema = new Schema({
    telegramId: { type: String, required: true, unique: true },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastInteraction: { type: Date, default: Date.now },
    consumedMagnets: [{ type: String }],
    learningMode: { type: Boolean, default: false },
    onboardingMode: { type: Boolean, default: false },
    bioSent: { type: Boolean, default: false },
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
