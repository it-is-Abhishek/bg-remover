const defaultCredits = 5;

const users = new Map();
const transactions = new Map();

const getUser = (clerkId) => users.get(clerkId) || null;

const getOrCreateUser = (clerkId, updates = {}) => {
    const existingUser = getUser(clerkId);

    if (existingUser) {
        const nextUser = {
            ...existingUser,
            ...updates,
            clerkId,
            updatedAt: new Date(),
        };
        users.set(clerkId, nextUser);
        return nextUser;
    }

    const newUser = {
        clerkId,
        creditBalance: defaultCredits,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...updates,
    };
    users.set(clerkId, newUser);
    return newUser;
};

const deleteUser = (clerkId) => {
    users.delete(clerkId);
};

const decrementCredits = (clerkId) => {
    const user = getOrCreateUser(clerkId);

    if (user.creditBalance <= 0) {
        return null;
    }

    const updatedUser = {
        ...user,
        creditBalance: user.creditBalance - 1,
        updatedAt: new Date(),
    };
    users.set(clerkId, updatedUser);
    return updatedUser;
};

const insertTransaction = (transactionData) => {
    const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const transaction = {
        _id: id,
        ...transactionData,
        createdAt: new Date(),
    };
    transactions.set(id, transaction);
    return { insertedId: id, transaction };
};

export {
    defaultCredits,
    deleteUser,
    decrementCredits,
    getOrCreateUser,
    getUser,
    insertTransaction,
};
