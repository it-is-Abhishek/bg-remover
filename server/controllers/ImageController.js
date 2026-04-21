import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { getDb } from '../configs/mongodb.js';

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


//Controller function to remove bg form image
const removeBgImage = async (req, res) => {
    let imagePath = null;
    try {
        const clerkId = req.auth?.clerkId
        const db = await getDb()
        const usersCollection = db.collection('users')

        if (!req.file?.path) {
            return res.json({ success: false, message: 'Please upload an image file' });
        }

        if (!process.env.CLIPDROP_API) {
            return res.json({ success: false, message: 'Background removal API key is missing on the server' });
        }

        const userSeed = buildUserSeed(req.auth);
        if (!userSeed) {
            return res.json({ success: false, message: 'User profile is incomplete. Please sign out and sign in again.' });
        }

        const { creditBalance, ...profileFields } = userSeed;

        const user = await usersCollection.findOneAndUpdate(
            { clerkId },
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
                maxTimeMS: 3000,
            }
        );

        if (user.creditBalance <= 0){
            return res.json({ success: false, message: 'No Credit Balance', creditBalance: user.creditBalance });
        }

        imagePath = req.file.path;
        console.log('Processing image:', imagePath);

        // Reading the image File 
        const imageFile = fs.createReadStream(imagePath)

        const formdata = new FormData()
        formdata.append('image_file', imageFile)

        console.log('Calling Clipdrop API...');
        const { data } = await axios.post('https://clipdrop-api.co/remove-background/v1', formdata, {
            headers: {
                ...formdata.getHeaders(),
                'x-api-key': process.env.CLIPDROP_API,
            },
            responseType: 'arraybuffer',
            timeout: 30000
        })
        console.log('Clipdrop API response received, size:', data.length);

        const base64Image = Buffer.from(data, 'binary').toString('base64')
        const resultImage = `data:image/png;base64, ${base64Image}` // fixed mimetype to png for transparent BG

        const updatedUser = await usersCollection.findOneAndUpdate(
            { clerkId, creditBalance: { $gt: 0 } },
            { $inc: { creditBalance: -1 } },
            {
                returnDocument: 'after',
                maxTimeMS: 3000,
            }
        );

        if (!updatedUser) {
            if (imagePath) {
                fs.unlinkSync(imagePath);
                imagePath = null;
            }

            return res.json({ success: false, message: 'Failed to update credit balance in database' });
        }

        fs.unlinkSync(imagePath);
        imagePath = null;
        res.json({
            success: true,
            resultImage,
            creditBalance: updatedUser.creditBalance,
            message: 'Background Removed'
        });

    } catch(error){
        console.error('Remove BG error:', error.message);
        if (imagePath) {
            try {
                fs.unlinkSync(imagePath);
            } catch (unlinkErr) {
                console.error('Cleanup error:', unlinkErr.message);
            }
        }
        res.json({ success: false, message: error.message });
    }
}

export { removeBgImage};
