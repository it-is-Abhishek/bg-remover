import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import userModel from '../models/userModel.js';


//Controller function to remove bg form image
const removeBgImage = async (req, res) => {
    let imagePath = null;
    try {
        const clerkId = req.auth?.clerkId

        if (!req.file?.path) {
            return res.json({ success: false, message: 'Please upload an image file' });
        }

        if (!process.env.CLIPDROP_API) {
            return res.json({ success: false, message: 'Background removal API key is missing on the server' });
        }

        let user;
        try {
            user = await userModel.findOne({clerkId}).maxTimeMS(3000).lean();
        } catch (dbErr) {
            console.log('DB user lookup failed, using fallback:', dbErr.message);
            user = null; // trigger fallback
        }
        
        if (user && user.creditBalance === 0){
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

        let newCredits = user ? user.creditBalance - 1 : 5;
        if (user) {
            try {
                await userModel.findByIdAndUpdate(user._id, {creditBalance: newCredits}).maxTimeMS(3000);
            } catch (updateErr) {
                console.log('DB update failed:', updateErr.message);
            }
        }

        fs.unlinkSync(imagePath);
        res.json({
            success: true,
            resultImage,
            creditBalance: newCredits,
            message: user ? 'Background Removed' : 'Background Removed (credit sync unavailable)'
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
