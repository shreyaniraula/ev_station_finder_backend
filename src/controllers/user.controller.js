import asyncHandler from '../utils/asyncHandler.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import Jwt from 'jsonwebtoken'
import { ApiResponse } from '../utils/apiResponse.js'

//TODO: apply otp

// const verifyOTP = asyncHandler(async (phoneNumber) => {
//     const accountSid = process.env.TWILIO_SID;
//     const authToken = TWILIO_AUTH_TOKEN;
//     const client = require('twilio')(accountSid, authToken);

//     client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
//         .verifications
//         .create({ to: phoneNumber, channel: 'sms' });
// })

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findOne(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        console.log(error);
    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    const { username, fullName, password, phoneNumber, image } = req.body;

    if ([username, fullName, password, phoneNumber, image].some((field) =>
        field?.trim === ""
    )) {
        return res.status(400).json(
            new ApiResponse(400, {}, "All fields are required")
        )
    }

    if (phoneNumber.length != 10) {
        return res.status(401).json(
            new ApiResponse(401, {}, "Invalid phone number")
        )
    }

    // check if user already exists: , 
    const userExists = await User.findOne({
        $or: [{ username }, { phoneNumber }]
    })

    if (userExists) {
        return res.status(409).json(
            new ApiResponse(409, {}, "User with this username or phone number already exists")
        )
    }

    // create user object - create entry in db
    const user = await User.create({
        username,
        fullName,
        password,
        phoneNumber,
        image,
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // check for user creation
    if (!createdUser) {
        return res.status(500).json(
            new ApiResponse(500, {}, "Something went wrong while registering user")
        )
    }

    // return res   
    return res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res, next) => {
    //extract data from req.body
    const { username, password } = req.body;

    //check if phone number is entered
    if (!username || !password) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    {},
                    "All fields are required"
                )
            )
    }

    //Check if user is registered
    const user = await User.findOne({ username })

    if (!user) {
        return res
            .status(404)
            .json(
                new ApiResponse(404, {}, "User does not exist")
            )
    }

    //Check password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        return res
            .status(401)
            .json(
                new ApiResponse(401, {}, "Incorrect user credentials")
            )
    }

    //access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    Jwt.sign(accessToken, "accessToken")

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //send cookie
    const options = {
        httpOnly: true,
        secure: true
    }


    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, ...user._doc
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {

            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully"
            )
        )

})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        return res
            .status(401)
            .json(
                new ApiResponse(
                    401,
                    {},
                    "Unauthorized request"
                )
            )
    }

    const decodedToken = Jwt.verify(incomingRefreshToken, process.env.USER_REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)
    if (!user) {
        return res
            .status(401)
            .json(
                new ApiResponse(
                    401,
                    {},
                    "Invalid refresh token"
                )
            )
    }

    if (incomingRefreshToken !== user.refreshToken) {
        return res
            .status(401)
            .json(
                new ApiResponse(
                    401,
                    {},
                    "Refresh token is expired or used"
                )
            )
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id)

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newrefreshToken
                },
                "Access token refreshed"
            )
        )
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    {},
                    "Invalid password"
                )
            )
    }

    user.password = newPassword

    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully"
            )
        )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user)
    return res
        .status(200)
        .json({ ...user._doc, accessToken: req.token })
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { username, fullName, phoneNumber } = req.body
    console.log(username)

    if (!username && !fullName && !phoneNumber) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    {},
                    "At least one field is required"
                )
            )
    }

    const userExists = await User.findOne({
        $or: [{ username }, { phoneNumber }]
    })

    if (userExists) {
        return res.status(409).json(
            new ApiResponse(409, {}, "User with this username or phone number already exists")
        )
    }

    if (phoneNumber && phoneNumber.length != 10) {
        return res
            .status(401)
            .json(
                new ApiResponse(
                    401,
                    {},
                    "Invalid phone number"
                )
            )
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                phoneNumber,
            },
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    user
                },
                "Account details updated successfully"
            )
        )
})

const updateImage = asyncHandler(async (req, res) => {
    const { imageUrl } = req.body

    if (!imageUrl) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    {},
                    "Image is missing"
                )
            )
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                image: imageUrl
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, user, "image updated successfully"
            )
        )
})

const verifyToken = asyncHandler(async (req, res) => {
    const token = req.header('user-auth-token')
    if (!token) return res.json(false)
    const verified = Jwt.verify(token, process.env.USER_ACCESS_TOKEN_SECRET)
    if (!verified) return res.json(false)

    const user = await User.findById(verified._id)
    if (!user) return res.json(false)
    res.json(true)
})

export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    updateImage,
    updateUserDetails,
    getCurrentUser,
    refreshAccessToken,
    verifyToken
}