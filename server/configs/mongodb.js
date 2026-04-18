import mongoose from "mongoose";

const connectDB = async () => {
    const rawUri = process.env.MONGODB_URI?.trim();

    if (!rawUri) {
        throw new Error("MONGODB_URI is missing");
    }

    const normalizedUri = rawUri.replace(/\/+$/, "");

    mongoose.connection.on('connected', () => {
        console.log("Database Connected");
        
    })
    await mongoose.connect(normalizedUri, { dbName: 'bg-remover' })
};

export default connectDB
