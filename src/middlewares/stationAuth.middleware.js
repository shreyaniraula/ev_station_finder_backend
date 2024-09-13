import { Station } from "../models/station.model.js";
import { ApiError } from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";

export const verifyStationJWT = asyncHandler(async(req, _, next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const station = await Station.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!station){
            throw new ApiError(401, "Invalid access token")
        }
    
        req.station = station
        next()
    } catch (error) {
        console.log(error)
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})