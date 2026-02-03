import { Handler } from '@netlify/functions';
import { Bot, InputFile } from "grammy";
import dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());

export const handler: Handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { fileBase64, filename, type } = body;

        if (!fileBase64 || !ADMIN_IDS[0]) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing file or no Admin ID configured" }) };
        }

        // Decode Base64
        const fileBuffer = Buffer.from(fileBase64, 'base64');
        const inputFile = new InputFile(fileBuffer, filename);

        // We accept sending to the first admin to generate the ID
        // This is a "silent" upload - we send it to the admin chat.
        const targetAdmin = ADMIN_IDS[0];

        let fileId = '';

        try {
            if (type === 'photo' || filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
                const msg = await bot.api.sendPhoto(targetAdmin, inputFile, { caption: `💾 Uploaded: ${filename}` });
                // Get the largest photo size
                fileId = msg.photo[msg.photo.length - 1].file_id;
            } else {
                const msg = await bot.api.sendDocument(targetAdmin, inputFile, { caption: `💾 Uploaded: ${filename}` });
                fileId = msg.document.file_id;
            }
        } catch (tgError) {
            console.error("Telegram Upload Error:", tgError);
            return { statusCode: 502, headers, body: JSON.stringify({ error: "Failed to upload to Telegram" }) };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                fileId: fileId,
                filename: filename
            })
        };

    } catch (error) {
        console.error("Upload Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: (error as Error).message })
        };
    }
};
