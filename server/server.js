import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import connectDB from './configs/mongodb.js'

//API CONFIG
const PORT = process.env.PORT || 4000
const app = express()
await connectDB()

//INITIALIZE MIDDLEWARE
app.use(express.json())
app.use(cors())

//API ROUTE
app.get('/', (req, res)=> {
    res.send("API WORKING")
})


app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}`)
});


