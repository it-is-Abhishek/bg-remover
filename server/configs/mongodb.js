import { MongoClient } from "mongodb";

let clientPromise = null;
let dbInstance = null;

const normalizeMongoError = (error) => {
    const message = error?.message || "Unknown MongoDB connection error";

    if (
        message.includes("IP that isn't whitelisted") ||
        message.includes("IP whitelist")
    ) {
        return new Error(
            "MongoDB Atlas blocked this machine. Add your public IP to the Atlas IP Access List and try again."
        );
    }

    if (
        message.includes("tlsv1 alert internal error") ||
        message.includes("ssl3_read_bytes")
    ) {
        return new Error(
            "MongoDB Atlas connection failed during TLS setup. Add your public IP to the Atlas IP Access List and restart the backend."
        );
    }

    return error;
};

const createClient = (uri) =>
    new MongoClient(uri, {
        tls: true,
        family: 4,
        secureProtocol: 'TLSv1_2_method',
        serverSelectionTimeoutMS: 5000,
    });

const connectDB = async () => {
    if (dbInstance) {
        return dbInstance;
    }

    if (clientPromise) {
        return clientPromise;
    }

    const rawUri = process.env.MONGODB_URI?.trim();

    if (!rawUri) {
        throw new Error("MONGODB_URI is missing");
    }

    const normalizedUri = rawUri.replace(/\/+$/, "");
    const client = createClient(normalizedUri);

    clientPromise = client.connect()
        .then((connectedClient) => {
            dbInstance = connectedClient.db('bg-remover');
            console.log("Database Connected");
            return dbInstance;
        })
        .catch((error) => {
            throw normalizeMongoError(error);
        })
        .finally(() => {
            clientPromise = null;
        });

    return clientPromise;
};

const getDb = async () => {
    if (dbInstance) {
        return dbInstance;
    }

    return connectDB();
};

export { getDb };
export default connectDB;
