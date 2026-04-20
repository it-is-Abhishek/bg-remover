import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import connectDB from './configs/mongodb.js'
import userRouter from './routes/userRoutes.js'
import imageRouter from './routes/imageRoutes.js'

dotenv.config({ path: new URL('./.env', import.meta.url), quiet: true })
dotenv.config({ quiet: true })

//API CONFIG
const PORT = process.env.PORT || 4000
const app = express()

//INITIALIZE MIDDLEWARE
app.use(express.json())
app.use(cors())
app.use('/api/image', imageRouter)

// Removed per-request DB connect middleware to avoid timeouts


//API ROUTE
app.get('/', (req, res)=> {
    res.send("API WORKING")
})
app.use("/api/user", userRouter)


if (process.env.VERCEL !== '1') {
    connectDB()
        .then(() => {
            console.log("DB connection established on startup");
        })
        .catch((error) => {
            console.error('Warning: Failed to connect to DB on startup:', error.message)
        })

    app.listen(PORT, ()=> {
        console.log(`Server is running on port ${PORT}`)
    })
}

export default app
