import { Bot, webhookCallback, Keyboard, InlineKeyboard } from "grammy";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { connectDB } from "./utils/db";
import { User } from "./models/User";
import { LeadMagnet } from "./models/LeadMagnet";
import { Context } from "./models/Context";
import { MessageLog } from "./models/MessageLog";

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());
const WEBAPP_URL = process.env.WEBAPP_URL || "https://example.com"; // Should be updated with real URL

// Middleware to ensure DB connection and User tracking
bot.use(async (ctx, next) => {
    await connectDB();
    if (ctx.from) {
        await User.findOneAndUpdate(
            { telegramId: ctx.from.id.toString() },
            {
                username: ctx.from.username,
                firstName: ctx.from.first_name,
                lastName: ctx.from.last_name,
                lastInteraction: new Date()
            },
            { upsert: true, new: true }
        );
    }
    await next();
});

const logMessage = async (userId: string, role: 'user' | 'assistant', text: string) => {
    try {
        await MessageLog.create({ userId, role, text });
    } catch (e) {
        console.error("Failed to log message:", e);
    }
};

import { SystemLog } from "./models/SystemLog";

const notifyAdmins = async (message: string) => {
    for (const adminId of ADMIN_IDS) {
        try {
            await bot.api.sendMessage(adminId, message, { parse_mode: "Markdown" });
        } catch (e) {
            console.error(`Failed to notify admin ${adminId}:`, e);
        }
    }
};

const logEvent = async (type: string, userId: string, details: string, metadata?: any) => {
    try {
        await SystemLog.create({ type, userId, details, metadata });
    } catch (e) {
        console.error("Failed to write system log:", e);
    }
};

bot.command("start", async (ctx) => {
    const payload = ctx.match; // Deep link payload
    const userId = ctx.from?.id.toString();
    const username = ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name || 'Unknown');

    // Admin Menu Handling
    if (userId && ADMIN_IDS.includes(userId)) {
        console.log(`Setting Admin Menu for user ${userId}`);
        try {
            await ctx.setChatMenuButton({
                type: "web_app",
                text: "Admin Panel",
                web_app: { url: WEBAPP_URL }
            });

            // Fallback: Also send an inline button, as the Menu Button can be glitchy
            await ctx.reply("👮‍♂️ Вы опознаны как администратор.", {
                reply_markup: {
                    inline_keyboard: [[
                        { text: "🚀 Открыть Админку", web_app: { url: WEBAPP_URL } }
                    ]]
                }
            });
        } catch (err) {
            console.error("Failed to set admin menu:", err);
        }
    }

    if (payload) {
        const magnet = await LeadMagnet.findOne({ triggerId: payload });
        if (magnet && magnet.isActive) {
            // Track consumption
            await User.findOneAndUpdate(
                { telegramId: userId },
                { $addToSet: { consumedMagnets: magnet.triggerId } }
            );

            // Notify Admins & Log
            const notificationMsg = `🧲 **Новый лид!**\n\n👤 Пользователь: [${username}](tg://user?id=${userId})\n📦 Магнит: ${magnet.name}\n🆔 Trigger: ${payload}`;
            await notifyAdmins(notificationMsg);
            await logEvent('lead_magnet_consumed', userId!, `Consumed magnet: ${magnet.name}`, { magnetId: magnet._id, triggerId: payload });

            const welcomeMsg = magnet.welcomeMessage || `Вот ваш контент: ${magnet.name}\n\n${magnet.description}`;

            // Deliver based on type
            if (magnet.type === 'link' || (!magnet.type && magnet.link)) {
                const link = magnet.content || magnet.link;
                const btnText = magnet.buttonText || "Открыть 🚀";

                await ctx.reply(welcomeMsg, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [[{ text: btnText, url: link }]]
                    }
                });
            } else if (magnet.type === 'text') {
                await ctx.reply(welcomeMsg, { parse_mode: "Markdown" });
                await ctx.reply(magnet.content);
            } else if (magnet.type === 'file') {
                await ctx.reply(welcomeMsg, { parse_mode: "Markdown" });
                // Content should be a file_id or url
                try {
                    await ctx.replyWithDocument(magnet.content, { caption: magnet.name });
                } catch (e) {
                    await ctx.reply(`Не удалось отправить файл. Вот ссылка: ${magnet.content}`);
                }
            }

            await logMessage(userId!, 'assistant', `Sent Lead Magnet: ${magnet.name} (${magnet.type})`);

            // Simple immediate follow-up simulation
            if (magnet.followUpMessages && magnet.followUpMessages.length > 0) {
                for (const msg of magnet.followUpMessages) {
                    // In a real app, this would be scheduled. Here we just wait a bit or send immediately for demo.
                    await ctx.reply(msg);
                    await logMessage(userId!, 'assistant', `Follow-up: ${msg}`);
                }
            }
            return;
        }
    }

    // Standard Start Notification
    await notifyAdmins(`🏃 **Новый старт бота**\n\n👤 Пользователь: [${username}](tg://user?id=${userId})`);
    await logEvent('bot_start', userId!, 'User started bot');

    const menu = getMainMenu(ADMIN_IDS.includes(userId!));
    await ctx.reply("Добро пожаловать! Я ваш персональный помощник. Чем могу помочь?", {
        reply_markup: menu
    });
});

const getMainMenu = (isAdmin: boolean) => {
    const keyboard = new Keyboard()
        .text("🐉 Поговорить")
        .text("💎 Сокровища");

    if (isAdmin) {
        keyboard.row().webApp("🏔️ Пещера", WEBAPP_URL);
    }

    return keyboard.resized();
};

bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id.toString();
    const userText = ctx.message.text;
    const isAdmin = ADMIN_IDS.includes(userId);

    await logMessage(userId, 'user', userText);

    // MENU HANDLING
    if (userText === "🐉 Поговорить") {
        await ctx.reply("Я вас внимательно слушаю! Спрашивайте о чем угодно.", {
            reply_markup: getMainMenu(isAdmin)
        });
        return;
    }

    if (userText === "💎 Сокровища") {
        const user = await User.findOne({ telegramId: userId });
        const magnets = user?.consumedMagnets || [];

        if (magnets.length === 0) {
            await ctx.reply("У вас пока нет сокровищ (лид-магнитов). Следите за новостями!", {
                reply_markup: getMainMenu(isAdmin)
            });
            return;
        }

        const magnetDocs = await LeadMagnet.find({ triggerId: { $in: magnets } });

        await ctx.reply("Вот ваши собранные сокровища:", {
            reply_markup: {
                inline_keyboard: magnetDocs.map(m => ([
                    { text: `📥 ${m.name}`, url: `https://t.me/DragonOrganismusBot?start=${m.triggerId}` }
                ]))
            }
        });
        return;
    }

    try {
        // Check for /learn command (admin only)
        if (userText.startsWith('/learn') && isAdmin) {
            await ctx.reply(
                "🎓 **Режим обучения включен!**\n\n" +
                "Теперь расскажите мне о себе, вашем продукте, услугах, ценах, стиле общения — всё, что я должен знать.\n\n" +
                "Я буду выделять ключевые факты и предлагать их на одобрение. После одобрения они попадут в базу знаний.\n\n" +
                "Напишите `/stop` чтобы выйти из режима обучения.",
                { parse_mode: "Markdown" }
            );
            // Mark user as in learning mode
            await User.findOneAndUpdate(
                { telegramId: userId },
                { $set: { learningMode: true } }
            );
            return;
        }

        // Check for /stop command
        if (userText === '/stop' && isAdmin) {
            await User.findOneAndUpdate(
                { telegramId: userId },
                { $set: { learningMode: false } }
            );
            await ctx.reply("✅ Режим обучения отключен. Теперь я обычный помощник.");
            return;
        }

        // Check if admin is in learning mode
        const user = await User.findOne({ telegramId: userId });
        const isLearningMode = isAdmin && user?.learningMode;

        if (isLearningMode) {
            // LEARNING MODE: Extract facts using AI
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const extractPrompt = `Ты — продюсер экспертов. Твоя задача — извлекать ключевые факты из информации, которую дает эксперт.

Проанализируй следующее сообщение от эксперта и выдели 1-3 ключевых факта для добавления в базу знаний.

Для каждого факта укажи:
1. CATEGORY: одна из [author, product, faq, expertise, tone, rules]
   - author: информация об авторе/эксперте
   - product: продукты, услуги, цены
   - faq: частые вопросы и ответы
   - expertise: профессиональные знания
   - tone: стиль общения, фразы
   - rules: ограничения, что НЕ говорить
2. TITLE: краткий заголовок (до 50 символов)
3. CONTENT: полное содержание факта

Формат ответа (JSON массив):
[{"category": "...", "title": "...", "content": "..."}]

Если в сообщении нет полезной информации для базы знаний, верни пустой массив: []

Сообщение эксперта:
"${userText}"`;

            const result = await model.generateContent(extractPrompt);
            const responseText = result.response.text();

            // Parse JSON from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    const facts = JSON.parse(jsonMatch[0]);

                    if (facts.length === 0) {
                        await ctx.reply("🤔 Не нашел конкретных фактов в этом сообщении. Расскажите подробнее или попробуйте другую тему.");
                        return;
                    }

                    // Send each fact for approval
                    for (const fact of facts) {
                        const categoryLabels: Record<string, string> = {
                            author: '🧑‍💼 Автор',
                            product: '📦 Продукт',
                            faq: '❓ FAQ',
                            expertise: '📚 Экспертиза',
                            tone: '💬 Тон общения',
                            rules: '📋 Правила'
                        };

                        const label = categoryLabels[fact.category] || fact.category;

                        await ctx.reply(
                            `📝 **Новый факт для базы знаний:**\n\n` +
                            `**Категория:** ${label}\n` +
                            `**Заголовок:** ${fact.title}\n\n` +
                            `${fact.content}`,
                            {
                                parse_mode: "Markdown",
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: "✅ Добавить", callback_data: `kb_add:${fact.category}:${Buffer.from(fact.title).toString('base64').slice(0, 30)}` },
                                        { text: "❌ Отклонить", callback_data: "kb_reject" }
                                    ]]
                                }
                            }
                        );

                        // Store pending fact in user's session (using a simple approach via message)
                        // We'll extract from the message text on callback
                    }
                } catch (parseErr) {
                    console.error("Failed to parse AI response:", parseErr);
                    await ctx.reply("Не смог обработать ответ. Попробуйте переформулировать.");
                }
            } else {
                await ctx.reply("🤔 Не нашел конкретных фактов. Расскажите что-то конкретное о себе или продукте.");
            }
            return;
        }

        // NORMAL MODE: Regular AI chat
        const systemPromptDoc = await Context.findOne({ key: 'main_system_prompt' });
        const defaultPrompt = `Ты — Цифровой Двойник автора (эксперта). 
Твоя задача — общаться с пользователями от имени автора, используя его стиль и знания.
1. Никогда не начинай ответ со слов "Я искусственный интеллект" или "Как языковая модель".
2. Отвечай кратко, по делу, в стиле Telegram-переписки.
3. Используй информацию из БАЗЫ ЗНАНИЙ (ниже) для ответов. Если информации нет, попробуй ответить, исходя из логики, или честно скажи, что пока не обсуждал это с автором.
4. Твоя цель — прогревать аудиторию, делиться пользой и вести к целевому действию (получение лид-магнита или продажа).`;

        const systemPrompt = systemPromptDoc ? systemPromptDoc.value : defaultPrompt;

        // Fetch Knowledge Base entries
        const { KnowledgeEntry } = await import('./models/KnowledgeEntry');
        const knowledgeEntries = await KnowledgeEntry.find({}).lean();

        // Format knowledge as context
        let knowledgeContext = '';
        if (knowledgeEntries.length > 0) {
            knowledgeContext = '\n\n### База знаний (используй эту информацию в ответах):\n';
            knowledgeEntries.forEach((entry: any) => {
                knowledgeContext += `\n[${entry.category.toUpperCase()}] ${entry.title}:\n${entry.content}\n`;
            });
        }

        // Construct context with recent history
        const history = await MessageLog.find({ userId }).sort({ timestamp: -1 }).limit(10);
        const historyText = history.reverse().map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `${systemPrompt}${knowledgeContext}\n\nВАЖНО: ИСПОЛЬЗУЙ Telegram Markdown для форматирования (жирный шрифт через *, списки). Не используй # заголовки, они не поддерживаются.\n\n### История чата:\n${historyText}\n\nUser: ${userText}\nAssistant:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        try {
            await ctx.reply(text, {
                parse_mode: "Markdown",
                reply_markup: getMainMenu(isAdmin)
            });
        } catch (e) {
            // Fallback if Markdown fails
            console.error("Markdown parse error:", e);
            await ctx.reply(text, {
                reply_markup: getMainMenu(isAdmin)
            });
        }

        await logMessage(userId, 'assistant', text);
    } catch (error) {
        console.error("AI Error:", error);
        await ctx.reply("У меня возникли трудности с ответом. Попробуйте чуть позже.");
    }
});

// Handle callback queries for knowledge approval
bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data === "kb_reject") {
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
        await ctx.answerCallbackQuery({ text: "❌ Отклонено" });
        return;
    }

    if (data.startsWith("kb_add:")) {
        try {
            // Extract info from the message
            const message = ctx.callbackQuery.message;
            if (!message || !('text' in message)) {
                await ctx.answerCallbackQuery({ text: "Ошибка: сообщение недоступно" });
                return;
            }

            const text = message.text;

            // Parse category from callback data
            const parts = data.split(":");
            const category = parts[1];

            // Extract title and content from message text
            const titleMatch = text.match(/\*\*Заголовок:\*\* (.+)/);
            const title = titleMatch ? titleMatch[1] : "Без заголовка";

            // Content is everything after the title line
            const contentStart = text.indexOf(title) + title.length;
            const content = text.slice(contentStart).trim();

            // Save to Knowledge Base
            const { KnowledgeEntry } = await import('./models/KnowledgeEntry');
            await KnowledgeEntry.create({
                category,
                title,
                content,
                keywords: []
            });

            await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
            await ctx.answerCallbackQuery({ text: "✅ Добавлено в базу знаний!" });

            // Also send a confirmation
            await ctx.reply(`✅ Факт "${title}" добавлен в категорию ${category.toUpperCase()}`);
        } catch (err) {
            console.error("Failed to save knowledge:", err);
            await ctx.answerCallbackQuery({ text: "Ошибка сохранения" });
        }
    }
});

// Webhook handler
export const handler = async (event: any, context: any) => {
    try {
        await connectDB();

        // Ensure bot info is initialized
        if (!bot.isInited()) {
            await bot.init();
        }

        // Use 'aws-lambda-async' adapter for Netlify async functions
        const callback = webhookCallback(bot, "aws-lambda-async");

        return await callback(event, context);
    } catch (error) {
        console.error("Webhook Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
