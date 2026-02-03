import { Handler } from '@netlify/functions';
import { connectDB } from './utils/db';
import { KnowledgeEntry } from './models/KnowledgeEntry';

export const handler: Handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    await connectDB();

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // GET: Fetch all entries (optionally filter by category)
        if (event.httpMethod === 'GET') {
            const category = event.queryStringParameters?.category;
            const query = category ? { category } : {};
            const entries = await KnowledgeEntry.find(query).sort({ updatedAt: -1 });
            return { statusCode: 200, headers, body: JSON.stringify(entries) };
        }

        // POST: Create new entry
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body || '{}');
            if (!data.category || !data.title || !data.content) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields (category, title, content)' }) };
            }
            const entry = await KnowledgeEntry.create(data);
            return { statusCode: 201, headers, body: JSON.stringify(entry) };
        }

        // PUT: Update entry by ID
        if (event.httpMethod === 'PUT') {
            const id = event.queryStringParameters?.id;
            if (!id) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id parameter' }) };
            }
            const data = JSON.parse(event.body || '{}');
            const entry = await KnowledgeEntry.findByIdAndUpdate(id, data, { new: true });
            if (!entry) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: 'Entry not found' }) };
            }
            return { statusCode: 200, headers, body: JSON.stringify(entry) };
        }

        // DELETE: Remove entry by ID
        if (event.httpMethod === 'DELETE') {
            const id = event.queryStringParameters?.id;
            if (!id) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id parameter' }) };
            }
            const result = await KnowledgeEntry.findByIdAndDelete(id);
            if (!result) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: 'Entry not found' }) };
            }
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: (error as Error).message }) };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
};
