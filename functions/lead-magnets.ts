import { Handler } from '@netlify/functions';
import { connectDB } from './utils/db';
import { LeadMagnet } from './models/LeadMagnet';

export const handler: Handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    await connectDB();

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        if (event.httpMethod === 'GET') {
            const magnets = await LeadMagnet.find({});
            return { statusCode: 200, headers, body: JSON.stringify(magnets) };
        }

        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body || '{}');

            // Basic validation
            if (!data.name || !data.triggerId || !data.content) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields (name, triggerId, content)" }) };
            }

            // Auto-increment if ID exists
            let originalId = data.triggerId;
            let finalId = originalId;
            let counter = 1;

            while (await LeadMagnet.findOne({ triggerId: finalId })) {
                finalId = `${originalId}_${counter}`;
                counter++;
            }
            data.triggerId = finalId;

            const newMagnet = await LeadMagnet.create(data);
            return { statusCode: 201, headers, body: JSON.stringify(newMagnet) };
        }

        // Rudimentary PUT/DELETE based on query params or body for simplicity
        // In production, use standard REST paths if possible or separate functions
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: (error as Error).message }) };
    }

    if (event.httpMethod === 'DELETE') {
        try {
            const id = event.queryStringParameters?.id;
            if (!id) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing id parameter" }) };
            }

            const deleted = await LeadMagnet.findByIdAndDelete(id);
            if (!deleted) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: "Magnet not found" }) };
            }

            return { statusCode: 200, headers, body: JSON.stringify({ message: "Deleted successfully" }) };
        } catch (error) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: (error as Error).message }) };
        }
    }

    return { statusCode: 405, headers, body: 'Make sure to use GET or POST' };
};
