import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";

export const verifyUserJWT = asyncHandler(async (req, _, next) => {
    const token = req.header("x-auth-token")

    if (!token) {
        res.status(401).json(
            new ApiResponse(401, {}, "Unauthorized request")
        )
    }

    const decodedToken = Jwt.verify(token, process.env.USER_ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

    if (!user) {
        res.status(401).json(
            new ApiResponse(401, {}, "Invalid access token")
        )
    }

    req.user = user
    req.token = token
    next()
})