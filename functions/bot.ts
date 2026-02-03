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
        await ctx.setChatMenuButton({
            type: "web_app",
            text: "Admin Panel",
            web_app: { url: WEBAPP_URL }
        });
    }

    if (payload) {
        const magnet = await LeadMagnet.findOne({ triggerId: payload });
        if (magnet && magnet.isActive) {
            // Track consumption
            await User.findOneAndUpdate(
                { telegramId: userId },
                { $addToSet: { consumedMagnets: magnet.triggerId } }
            );

            const welcomeMsg = magnet.welcomeMessage || `Here is your content: ${magnet.name}\n\n${magnet.description}`;

            await ctx.reply(`${welcomeMsg}\n\n[Download/Access Here](${magnet.link})`, { parse_mode: "Markdown" });
            await logMessage(userId!, 'assistant', `Sent Lead Magnet: ${magnet.name}`);

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

    await ctx.reply("Welcome! How can I help you today?");
});

bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id.toString();
    const userText = ctx.message.text;

    await logMessage(userId, 'user', userText);

    try {
        const systemPromptDoc = await Context.findOne({ key: 'main_system_prompt' });
        const systemPrompt = systemPromptDoc ? systemPromptDoc.value : "You are a helpful assistant.";

        // Construct context with recent history (simplified)
        // In prod, fetch last N messages from MessageLog for this user
        const history = await MessageLog.find({ userId }).sort({ timestamp: -1 }).limit(10);
        const historyText = history.reverse().map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `${systemPrompt}\n\nChat History:\n${historyText}\n\nUser: ${userText}\nAssistant:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        await ctx.reply(text);
        await logMessage(userId, 'assistant', text);
    } catch (error) {
        console.error("AI Error:", error);
        await ctx.reply("I'm having trouble thinking right now. Please try again later.");
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

        // Create callback with 'aws-lambda' adapter (Netlify Functions use AWS Lambda under hood)
        const callback = webhookCallback(bot, "aws-lambda");

        return await callback(event, context);
    } catch (error) {
        console.error("Webhook Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
