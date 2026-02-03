import { Bot, webhookCallback } from "grammy";
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

bot.command("start", async (ctx) => {
    const payload = ctx.match; // Deep link payload
    const userId = ctx.from?.id.toString();

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

            const welcomeMsg = magnet.welcomeMessage || `Вот ваш контент: ${magnet.name}\n\n${magnet.description}`;

            await ctx.reply(welcomeMsg, { parse_mode: "Markdown" });

            // Deliver based on type
            if (magnet.type === 'link' || (!magnet.type && magnet.link)) {
                // Backward compatibility or explicit link
                const link = magnet.content || magnet.link; // use content if available, fallback to old link field
                await ctx.reply(`[Скачать/Открыть](${link})`, { parse_mode: "Markdown" });
            } else if (magnet.type === 'text') {
                await ctx.reply(magnet.content);
            } else if (magnet.type === 'file') {
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

    await ctx.reply("Добро пожаловать! Я ваш персональный помощник. Чем могу помочь?");
});

bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id.toString();
    const userText = ctx.message.text;

    await logMessage(userId, 'user', userText);

    try {
        const systemPromptDoc = await Context.findOne({ key: 'main_system_prompt' });
        const systemPrompt = systemPromptDoc ? systemPromptDoc.value : "You are a helpful assistant.";

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

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `${systemPrompt}${knowledgeContext}\n\n### История чата:\n${historyText}\n\nUser: ${userText}\nAssistant:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        await ctx.reply(text);
        await logMessage(userId, 'assistant', text);
    } catch (error) {
        console.error("AI Error:", error);
        await ctx.reply("У меня возникли трудности с ответом. Попробуйте чуть позже.");
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
