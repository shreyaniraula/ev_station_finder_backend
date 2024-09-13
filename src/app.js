import express from "express";
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "200kb"}))
app.use(express.urlencoded({extended: true, limit: "200kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//import routes

import userRouter from "./routes/user.routes.js";
import stationRouter from './routes/station.routes.js'

//declare routes
app.use('/api/v1/users', userRouter)
app.use('/api/v1/stations', stationRouter)

export default app;