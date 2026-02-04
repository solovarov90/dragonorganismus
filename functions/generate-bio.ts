import { Handler } from '@netlify/functions';
import { connectDB } from './utils/db';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { KnowledgeEntry } from './models/KnowledgeEntry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const handler: Handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    await connectDB();

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Fetch ALL knowledge base to give context
        const entries = await KnowledgeEntry.find({});
        const contextText = entries.map(e => `[${e.category.toUpperCase()}] ${e.title}: ${e.content}`).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Ты — креативный копирайтер для Telegram-бота.
Твоя задача — написать 3 ВАРИАНТА приветственного сообщения от имени эксперта.
Это сообщение будет отправлено пользователю через 20 минут после того, как он начал пользоваться ботом.

Цель сообщения: познакомить с автором, влюбить в него, дать ссылки на соцсети (если есть в базе) и создать доверие.

Контекст (факты об эксперте):
${contextText}

Требования:
1. Варианты должны быть РАЗНЫМИ по тону (Дерзкий/Уверенный, Дружелюбный/Заботливый, Краткий/Деловой).
2. Используй Telegram Markdown (жирный, курсив).
3. Используй эмодзи.
4. ВЕРНИ ТОЛЬКО JSON массив строк.

Пример ответа:
["Вариант 1 текст...", "Вариант 2 текст...", "Вариант 3 текст..."]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("AI did not return a JSON array");
        }

        const variations = JSON.parse(jsonMatch[0]);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ variations })
        };

    } catch (error) {
        console.error("Generate Bio Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: (error as Error).message })
        };
    }
};
