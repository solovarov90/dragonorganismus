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

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const { message, history } = JSON.parse(event.body || '{}');

        if (!message) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message required' }) };
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Build conversation context
        const historyText = (history || [])
            .map((h: { role: string; text: string }) => `${h.role === 'user' ? 'Эксперт' : 'Агент'}: ${h.text}`)
            .join('\n');

        const extractPrompt = `Ты — продюсер экспертов и digital-стратег. Твоя задача — вести диалог с экспертом, вытаскивать из него ценную информацию и формировать его цифровой портрет.

Стиль общения:
- Задавай уточняющие вопросы
- Будь дружелюбным, но профессиональным
- Помогай эксперту раскрыться
- Ищи уникальные факты, истории, методологии

После каждого сообщения эксперта:
1. ОТВЕЧАЙ ему как продюсер (задавай вопросы, уточняй, вдохновляй)
2. Если в сообщении есть полезные факты для базы знаний — выдели их

ВАЖНО: Свой ответ структурируй так:
---RESPONSE---
[Твой ответ эксперту как продюсер]
---FACTS---
[JSON массив извлеченных фактов, или пустой массив []]

Формат каждого факта:
{"category": "author|product|faq|expertise|tone|rules", "title": "Краткий заголовок", "content": "Полное содержание"}

Категории:
- author: информация об эксперте (биография, достижения, история)
- product: продукты, услуги, цены, предложения
- faq: типичные вопросы клиентов
- expertise: профессиональные знания, методологии, инсайты
- tone: стиль общения, фразы, манера речи
- rules: что НЕ говорить, ограничения

${historyText ? `\n### История диалога:\n${historyText}\n` : ''}

### Новое сообщение эксперта:
${message}

### Твой ход:`;

        const result = await model.generateContent(extractPrompt);
        const responseText = result.response.text();

        // Parse response
        let agentReply = responseText;
        let facts: any[] = [];

        const responseParts = responseText.split('---RESPONSE---');
        if (responseParts.length > 1) {
            const afterResponse = responseParts[1];
            const factsParts = afterResponse.split('---FACTS---');

            agentReply = factsParts[0].trim();

            if (factsParts.length > 1) {
                const factsText = factsParts[1].trim();
                const jsonMatch = factsText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    try {
                        facts = JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        console.error('Failed to parse facts:', e);
                    }
                }
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                reply: agentReply,
                facts: facts
            })
        };

    } catch (error) {
        console.error('Chat error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: (error as Error).message })
        };
    }
};
