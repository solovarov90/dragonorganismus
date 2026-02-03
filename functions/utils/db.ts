import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
    if (isConnected) {
        return;
    }

    if (mongoose.connection.readyState >= 1) {
        isConnected = true;
        return;
    }

    try {
        const db = await mongoose.connect(process.env.MONGODB_URI || "");
        isConnected = db.connections[0].readyState === 1;
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};
