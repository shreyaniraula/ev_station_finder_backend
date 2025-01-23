import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { CORS_ORIGIN } from "./config";
const app = express();
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//import routes

import userRouter from "./routes/user.routes.js";
import stationRouter from "./routes/station.routes.js";
import reservationRouter from "./routes/reservation.routes.js";
import { CORS_ORIGIN } from "./config/index.js";

//declare routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/stations", stationRouter);
app.use("/api/v1/reserve", reservationRouter);

export default app;
