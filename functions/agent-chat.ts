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

        const extractPrompt = `Ты — цифровой архитектор. Твоя ЕДИНСТВЕННАЯ цель — быстро собрать базу знаний об эксперте.
Твой собеседник — админ/эксперт, который хочет заполнить базу, а не болтать.

Правила:
1. ПИШИ КРАТКО. Максимум 1-2 предложения. НИКАКОЙ ВОДЫ.
2. "АГРЕССИВНО" вычленяй факты. Даже намек на факт — это факт.
   - "Люблю таро" -> Факт: Любит таро (category: author)
   - "Делаю расклады" -> Факт: Услуга раскладов (category: product)
3. Предлагай категорию сам. Если сомневаешься — выбирай наиболее подходящую.

Структура ответа:
---RESPONSE---
[Очень краткий ответ или следующий вопрос (макс 150 символов)]
---FACTS---
[JSON массив выявленных фактов. Если фактов нет - пустой массив []]

Формат факта:
{"category": "author|product|faq|expertise|tone|rules", "title": "Короткий заголовок", "content": "Суть факта"}

Категории:
- author: биография, регалии
- product: цены, форматы, офеферы
- faq: частые вопросы
- expertise: методы, подходы
- tone: стиль (на "ты"/"вы", эмодзи и тд)
- rules: стоп-слова, ограничения

${historyText ? `\n### История:\n${historyText}\n` : ''}

### Сообщение:
${message}

### Действие:`;

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
