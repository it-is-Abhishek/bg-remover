import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import connectDB from './configs/mongodb.js'
import userRouter from './routes/userRoutes.js'

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
    } catch (error) {
        console.error("DB connection error in middleware:", error.message)
    }
    next()
})

//API ROUTE
app.get('/', (req, res)=> {
    res.send("API WORKING")
})
app.use("/api/user", userRouter)


if (process.env.VERCEL !== '1') {
    ensureDbConnection()
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

