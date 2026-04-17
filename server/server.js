import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import connectDB from './configs/mongodb.js'

//API CONFIG
const PORT = process.env.PORT || 4000
const app = express()
let isDbConnected = false

const ensureDbConnection = async () => {
    if (isDbConnected) return
    await connectDB()
    isDbConnected = true
}

//INITIALIZE MIDDLEWARE
app.use(express.json())
app.use(cors())

app.use(async (req, res, next) => {
    try {
        await ensureDbConnection()
        next()
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database connection failed' })
    }
})

//API ROUTE
app.get('/', (req, res)=> {
    res.send("API WORKING")
})


if (process.env.VERCEL !== '1') {
    ensureDbConnection()
        .then(() => {
            app.listen(PORT, ()=> {
                console.log(`Server is running on port ${PORT}`)
            })
        })
        .catch((error) => {
            console.error('Failed to start server due to DB connection error:', error.message)
            process.exit(1)
        })
}

export default app

