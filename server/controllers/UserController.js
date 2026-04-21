import { Webhook } from 'svix'
import { getDb } from '../configs/mongodb.js'
import razorpay from 'razorpay';

const defaultCredits = 5;

const buildUserSeed = (auth) => {
    if (!auth?.email || !auth?.photo) {
        return null;
    }

    return {
        clerkId: auth.clerkId,
        email: auth.email,
        firstName: auth.firstName || '',
        lastName: auth.lastName || '',
        photo: auth.photo,
        creditBalance: defaultCredits,
    };
};

const upsertUserFromAuth = async (db, auth) => {
    const userSeed = buildUserSeed(auth);

    if (!userSeed) {
        throw new Error('User profile is incomplete. Please sign out and sign in again.');
    }

    const { clerkId, creditBalance, ...profileFields } = userSeed;

    return db.collection('users').findOneAndUpdate(
        { clerkId: auth.clerkId },
        {
            $setOnInsert: {
                clerkId,
                creditBalance,
                createdAt: new Date(),
            },
            $set: {
                ...profileFields,
                updatedAt: new Date(),
            },
        },
        {
            upsert: true,
            returnDocument: 'after',
        }
    );
};

//API CONTROLLER FUNCTION TO MANAGE CLERK USER WITH DATABASE
//http://localhost:4000/api/user/webhooks

const clerkWebhooks = async (req, res) => {
    try{
        // CREATEB A SVIX INSTANCE WITH CLERK WEBHOOK INSTANCE
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
        const payload = req.body.toString()
        const event = await whook.verify(payload,{
            "svix-id":req.headers["svix-id"],
            "svix-timestamp":req.headers["svix-timestamp"],
            "svix-signature":req.headers["svix-signature"]
        })

        const {data, type} = event

        switch (type){
            case "user.created": {

                const userData = {
                    clerkId: data.id,
                    email: data.email_addresses[0].email_address,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    photo: data.image_url,
                    creditBalance: defaultCredits
                }
                const db = await getDb()
                await db.collection('users').updateOne(
                    { clerkId: data.id },
                    { $setOnInsert: userData },
                    { upsert: true }
                )
                res.json({})

                break;
            }
            case "user.updated": {

                const userData = {
                    clerkId: data.id,
                    email: data.email_addresses[0].email_address,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    photo: data.image_url
                }
                const db = await getDb()
                await db.collection('users').updateOne(
                    { clerkId: data.id },
                    { $set: userData },
                    { upsert: true }
                )
                res.json({})

                break;
            }
            case "user.deleted": {

                const db = await getDb()
                await db.collection('users').deleteOne({ clerkId: data.id })
                res.json({})

                break;
            }
            default:
                break;
        }

    } catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}



// API Controller function to get user available credits
const userCredits = async (req, res) => {
    try{
        const db = await getDb()
        const userData = await upsertUserFromAuth(db, req.auth)

        res.json({success: true, credits: userData.creditBalance })


    } catch(error){
        console.log("DB Error fetching credits:", error.message)
        res.json({success:false, message:error.message})
    }
}

const getRazorpayInstance = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZOPPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('Razorpay keys are missing in server/.env');
    }

    return new razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
}


// API to make payment for credits

const paymentRazorpay = async(req, res) => {
    try{
        const razorpayInstance = getRazorpayInstance()

        const clerkId = req.auth?.clerkId
        const { planId } = req.body

        const db = await getDb()
        const userData = await upsertUserFromAuth(db, req.auth)

        if (!userData || !planId){
            return res.json({ success: false, message: 'Invalid credentials' })
        }

        const normalizedPlanId = String(planId).trim().toLowerCase()
        const planConfig = {
            basic: { plan: 'Basic', credits: 100, amount: 10 },
            advance: { plan: 'Advanced', credits: 500, amount: 50 },
            advanced: { plan: 'Advanced', credits: 500, amount: 50 },
            business: { plan: 'Business', credits: 5000, amount: 250 },
        }[normalizedPlanId]

        if (!planConfig) {
            return res.json({ success: false, message: 'Invalid plan selected' });
        }

        const { plan, credits, amount } = planConfig
        let date

        date = Date.now()

        // Creating transaction
        const transactionData = {
            clerkId,
            plan,
            amount,
            credits,
            date,
            payment: false,
        }

        const newTransaction = await db.collection('transactions').insertOne(transactionData)

        const options = {
            amount: amount * 100,
            currency: process.env.CURRENCY || 'INR',
            receipt: newTransaction.insertedId.toString()
        }

        const order = await razorpayInstance.orders.create(options)
        res.json({ success: true, order })

    } catch(error){
        console.log({ success: false, message: error.message })
        res.json({ success: false, message: error.message })
    }
}

//API Controller funciton to verify razorpay payment
const verifyRazorPay = async (req, res) => {
    try{
        const { razorpay_order_id } = req.body
        if (!razorpay_order_id) {
            return res.json({ success: false, message: "Missing razorpay_order_id" })
        }

        const razorpayInstance = getRazorpayInstance()
        const db = await getDb()
        const usersCollection = db.collection('users')
        const transactionsCollection = db.collection('transactions')

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo.status !== "paid") {
            return res.json({ success: false, message: "Payment not completed" })
        }

        const transactionData = await transactionsCollection.findOne({
            _id: orderInfo.receipt,
        })

        if (!transactionData) {
            return res.json({ success: false, message: "Transaction not found" })
        }

        if (transactionData.payment){
            return res.json({ success: true, message: "Credits already added"})
        }

        const updatedUser = await usersCollection.findOneAndUpdate(
            { clerkId: transactionData.clerkId },
            {
                $inc: { creditBalance: transactionData.credits },
                $set: { updatedAt: new Date() },
            },
            {
                returnDocument: 'after',
            }
        )

        if (!updatedUser) {
            return res.json({ success: false, message: "User not found for transaction" })
        }

        await transactionsCollection.updateOne(
            { _id: transactionData._id },
            {
                $set: {
                    payment: true,
                    paymentDate: Date.now(),
                    razorpay_order_id,
                },
            }
        )

        res.json({
            success: true,
            message: "Credits Added",
            creditBalance: updatedUser.creditBalance,
        });
    }catch(error){
        console.log(error.message)
        res.json({ success: false, message: error.message})
    }
}



export {clerkWebhooks, userCredits, paymentRazorpay, verifyRazorPay}
