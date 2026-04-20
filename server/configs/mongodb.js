import mongoose from "mongoose";

let connectionPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    const rawUri = process.env.MONGODB_URI?.trim();

    if (!rawUri) {
        throw new Error("MONGODB_URI is missing");
    }

    const normalizedUri = rawUri.replace(/\/+$/, "");

    mongoose.connection.on('connected', () => {
        console.log("Database Connected");
    });
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
    });

    connectionPromise = mongoose.connect(normalizedUri, {
        dbName: 'bg-remover',
        retryWrites: true,
        w: 'majority',
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        bufferCommands: false,
        maxPoolSize: 10,
        tls: true,
    }).finally(() => {
        connectionPromise = null;
    });

    return connectionPromise;
};

export default connectDB
