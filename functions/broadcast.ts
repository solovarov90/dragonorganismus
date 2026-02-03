import { Handler } from '@netlify/functions';
import { Bot } from "grammy";
import { connectDB } from './utils/db';
import { User } from './models/User';
import dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");

export const handler: Handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    await connectDB();

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { segment, magnetId, message, type = 'text', attachment } = body;

        if (!message && type === 'text') {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Message text is required" }) };
        }

        let query = {};
        if (segment === 'magnet') {
            if (!magnetId) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Magnet ID is required for this segment" }) };
            }
            query = { consumedMagnets: magnetId };
        }

        const users = await User.find(query).select('telegramId');

        let successCount = 0;
        let failCount = 0;

        // In a real production environment, this should be a queue system. 
        // For now, we process continuously but be mindful of timeouts (Netlify has 10s limit on free tier usually, but here we assume it might run longer or list is small)
        // If list is large, this will time out.

        for (const user of users) {
            try {
                if (type === 'text') {
                    await bot.api.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
                } else if (type === 'photo') {
                    await bot.api.sendPhoto(user.telegramId, attachment, { caption: message, parse_mode: 'Markdown' });
                } else if (type === 'document') {
                    await bot.api.sendDocument(user.telegramId, attachment, { caption: message, parse_mode: 'Markdown' });
                }
                successCount++;
                // Small delay to avoid hitting limits too hard
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (e) {
                console.error(`Failed to send to ${user.telegramId}:`, e);
                failCount++;
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                total: users.length,
                sent: successCount,
                failed: failCount
            })
        };

    } catch (error) {
        console.error("Broadcast Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: (error as Error).message })
        };
    }
};
