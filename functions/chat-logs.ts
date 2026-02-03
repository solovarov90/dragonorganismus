import { Handler } from '@netlify/functions';
import { connectDB } from './utils/db';
import { MessageLog } from './models/MessageLog';

export const handler: Handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    await connectDB();

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET'
    };

    if (event.httpMethod === 'GET') {
        const userId = event.queryStringParameters?.userId;
        if (!userId) {
            return { statusCode: 400, headers, body: 'Missing userId parameter' };
        }

        try {
            const logs = await MessageLog.find({ userId }).sort({ timestamp: 1 });
            return { statusCode: 200, headers, body: JSON.stringify(logs) };
        } catch (error) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: (error as Error).message }) };
        }
    }

    return { statusCode: 405, headers, body: 'Make sure to use GET' };
};
