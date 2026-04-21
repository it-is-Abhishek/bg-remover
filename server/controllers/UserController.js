import { Webhook } from 'svix'
import { getDb } from '../configs/mongodb.js'
import razorpay from 'razorpay';
import transactionModel from '../models/transactionModel.js';

const defaultCredits = 5;

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
        const clerkId = req.auth?.clerkId
        const db = await getDb()
        const userData = await db.collection('users').findOneAndUpdate(
            { clerkId },
            {
                $setOnInsert: {
                    clerkId,
                    creditBalance: defaultCredits,
                    createdAt: new Date(),
                },
                $set: {
                    updatedAt: new Date(),
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
            }
        )

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
        const userData = await db.collection('users').findOneAndUpdate(
            { clerkId },
            {
                $setOnInsert: {
                    clerkId,
                    creditBalance: defaultCredits,
                    createdAt: new Date(),
                },
                $set: {
                    updatedAt: new Date(),
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
            }
        )

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
            date
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
const verifyRazorPay = async () => {
    try{

        const { razorpay_order_id } = req.body

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo.status === "paid"){
            const transactionData = await transactionModel.findById(orderInfo.receipt)

            if (transactionData.payment){
                return res.json({ sucess: false, message: "Payment Failed"})
            }

            // Adding credits in user data
            const userdata = await userModel.findOne({ clerkId : transactionData.clerkId})
            const creditBalance = userData.creditBalance + transactionData.credits

            await userModel.findByIdAndUpdate(userData._id, {creditBalance})

            // making the payment true
            await transactionModel.findByIdAndUpdate(transactionData._id, {payment: true})

            res.json({ success: true, message: " Credits Added"});

        }


    }catch(error){
        console.log(error.message)
        res.json({ sucess: false, message: error.message})
    }
}



export {clerkWebhooks, userCredits, paymentRazorpay, verifyRazorPay}
