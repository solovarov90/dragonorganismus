import mongoose, { Schema, Document } from 'mongoose';

export type KnowledgeCategory = 'author' | 'product' | 'faq' | 'expertise' | 'tone' | 'rules';

export interface IKnowledgeEntry extends Document {
    category: KnowledgeCategory;
    title: string;
    content: string;
    keywords: string[];
    createdAt: Date;
    updatedAt: Date;
}

const KnowledgeEntrySchema: Schema = new Schema({
    category: {
        type: String,
        enum: ['author', 'product', 'faq', 'expertise', 'tone', 'rules'],
        required: true
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    keywords: [{ type: String }],
}, { timestamps: true });

export const KnowledgeEntry = mongoose.models.KnowledgeEntry || mongoose.model<IKnowledgeEntry>('KnowledgeEntry', KnowledgeEntrySchema);
