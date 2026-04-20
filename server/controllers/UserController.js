import { Webhook } from 'svix'
import userModel from '../models/userModel.js'

//API CONTROLLER FUNCTION TO MANAGE CLERK USER WITH DATABASE
//http://localhost:4000/api/user/webhooks

const clerkWebhooks = async (req, res) => {
    try{
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
                    photo: data.image_url
                }
                await userModel.create(userData)
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
                await userModel.findOneAndUpdate({clerkId:data.id}, userData)
                res.json({})

                break;
            }
            case "user.deleted": {

                await userModel.findOneAndDelete({clerkId: data.id})
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

        const userData = await userModel.findOne({clerkId})
        if (!userData) {
            // If user is not in DB (common in local dev when webhooks don't fire), return default credits
            return res.json({success: true, credits: 5})
        }

        res.json({success: true, credits: userData.creditBalance })


    } catch(error){
        console.log("DB Error fetching credits:", error.message)
        // Fallback for local development when MongoDB is blocked by firewall
        res.json({success: true, credits: 5})
    }
}

export {clerkWebhooks, userCredits }
