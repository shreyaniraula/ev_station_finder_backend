import { Station } from "../models/station.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";

export const verifyStationJWT = asyncHandler(async (req, _, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
        res.status(401).json(
            new ApiResponse(401, {}, "Unauthorized request")
        )
    }

    const decodedToken = Jwt.verify(token, process.env.STATION_ACCESS_TOKEN_SECRET)

    const station = await Station.findById(decodedToken?._id).select("-password -refreshToken")

    if (!station) {
        res.status(401).json(
            new ApiResponse(401, {}, "Invalid access token")
        )
    }

    req.station = station
    next()
})