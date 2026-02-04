import { Handler } from '@netlify/functions';
import { connectDB } from './utils/db';
import { Context } from './models/Context';

const SYSTEM_PROMPT_KEY = 'main_system_prompt';

export const handler: Handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    await connectDB();

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod === 'GET') {
        const key = event.queryStringParameters?.key || SYSTEM_PROMPT_KEY;
        const ctx = await Context.findOne({ key });
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ value: ctx ? ctx.value : "" })
        };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
        const { key, value } = JSON.parse(event.body || '{}');
        const targetKey = key || SYSTEM_PROMPT_KEY;

        const updated = await Context.findOneAndUpdate(
            { key: targetKey },
            { value },
            { upsert: true, new: true }
        );
        return { statusCode: 200, headers, body: JSON.stringify(updated) };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
};
