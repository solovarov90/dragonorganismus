import { Handler } from '@netlify/functions';
import { Bot } from "grammy";
import dotenv from "dotenv";
import { connectDB } from './utils/db';
import { User } from './models/User';
import { Context } from './models/Context';

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim());

// We need a separate handler for the scheduled task
// This can be triggered by Netlify Scheduled Functions or an external cron (GET request)
export const handler: Handler = async (event, context) => {
    // Basic security to prevent abuse if public (optional: check secret header)
    // if (event.headers['x-scheduler-secret'] !== process.env.SCHEDULER_SECRET) return { statusCode: 403, body: 'Forbidden' };

    context.callbackWaitsForEmptyEventLoop = false;
    await connectDB();

    try {
        // 1. Get the Bio Message and Photo
        const bioContext = await Context.findOne({ key: 'bio_message' });
        const photoContext = await Context.findOne({ key: 'bio_photo' });

        // Default bio message if not set in DB
        const defaultBio = "Привет! Это снова я. \n\nПока вы знакомитесь с материалами, хотел рассказать немного о себе.\n\n[Тут должно быть описание эксперта, фото и ссылки]";
        const bioText = bioContext ? bioContext.value : defaultBio;
        const photoId = photoContext ? photoContext.value : null;

        // 2. Find users who joined > 20 minutes ago and haven't received bio
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
        // Also add a safety buffer (e.g. users joined < 24 hours ago) to avoid spamming old users if we just deployed this
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const users = await User.find({
            createdAt: { $lte: twentyMinutesAgo, $gte: twentyFourHoursAgo },
            bioSent: { $ne: true }
        }).limit(50); // Process in batches

        console.log(`Found ${users.length} users to send bio to.`);

        let sentCount = 0;

        for (const user of users) {
            try {
                if (photoId) {
                    await bot.api.sendPhoto(user.telegramId, photoId, { caption: bioText, parse_mode: "Markdown" });
                } else {
                    await bot.api.sendMessage(user.telegramId, bioText, { parse_mode: "Markdown" });
                }

                // Track success
                user.bioSent = true;
                await user.save();
                sentCount++;
            } catch (e: any) {
                console.error(`Failed to send bio to ${user.telegramId}:`, e.message);
                if (e.description?.includes('blocked') || e.description?.includes('not found')) {
                    // User blocked bot, stick a flag so we don't retry
                    user.bioSent = true;
                    await user.save();
                }
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Bio check complete. Sent to ${sentCount} users.` })
        };
    } catch (error) {
        console.error("Scheduler Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: (error as Error).message })
        };
    }
};
