import { USER_ACCESS_TOKEN_SECRET } from "../config/index.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";

export const verifyUserJWT = asyncHandler(async (req, res, next) => {
  const token = req.header("user-auth-token");

  if (!token) {
    res.status(401).json(new ApiResponse(401, {}, "Unauthorized request"));
  }

  const decodedToken = Jwt.verify(token, USER_ACCESS_TOKEN_SECRET);

  const user = await User.findById(decodedToken?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    res.status(401).json(new ApiResponse(401, {}, "Invalid access token"));
  }

  req.user = user;
  req.token = token;
  next();
});
