import { Handler } from '@netlify/functions';
import { connectDB } from './utils/db';
import { User } from './models/User';

export const handler: Handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    await connectDB();

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET'
    };

    if (event.httpMethod === 'GET') {
        try {
            const users = await User.find({}).sort({ lastInteraction: -1 });
            return { statusCode: 200, headers, body: JSON.stringify(users) };
        } catch (error) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: (error as Error).message }) };
        }
    }

    return { statusCode: 405, headers, body: 'Make sure to use GET' };
};
