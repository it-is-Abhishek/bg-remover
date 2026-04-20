import { Webhook } from 'svix'
import { getDb } from '../configs/mongodb.js'

//API CONTROLLER FUNCTION TO MANAGE CLERK USER WITH DATABASE
//http://localhost:4000/api/user/webhooks

const clerkWebhooks = async (req, res) => {
    try{
        const db = await getDb()
        const usersCollection = db.collection('users')

        // CREATEB A SVIX INSTANCE WITH CLERK WEBHOOK INSTANCE
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
        await whook.verify(JSON.stringify(req.body),{
            "svix-id":req.headers["svix-id"],
            "svix-timestamp":req.headers["svix-timestamp"],
            "svix-signature":req.headers["svix-signature"]
        })

        const {data, type} = req.body

        switch (type){
            case "user.created": {

                const userData = {
                    clerkId: data.id,
                    email: data.email_addresses[0].email_address,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    photo: data.image_url,
                    creditBalance: 5
                }
                await usersCollection.updateOne(
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
                await usersCollection.updateOne(
                    { clerkId: data.id },
                    { $set: userData },
                    { upsert: true }
                )
                res.json({})

                break;
            }
            case "user.deleted": {

                await usersCollection.deleteOne({ clerkId: data.id })
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
        const usersCollection = db.collection('users')

        const clerkId = req.auth?.clerkId

        const userData = await usersCollection.findOneAndUpdate(
            { clerkId },
            {
                $setOnInsert: {
                    clerkId,
                    creditBalance: 5,
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

export {clerkWebhooks, userCredits }
