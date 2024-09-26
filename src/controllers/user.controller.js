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
        return { refreshToken, accessToken }
    } catch (error) {
        console.log(error);
    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    const { fullName, password, phoneNumber } = req.body;

    if ([fullName, password, phoneNumber].some((field) =>
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
    const userExists = await User.findOne({ phoneNumber })

    if (userExists) {
        return res.status(409).json(
            new ApiResponse(409, {}, "User with this phone number already exists")
        )
    }

    // check for images
    const imageLocalPath = req.files?.image[0]?.path;

    if (!imageLocalPath) {
        return res.status(400).json(
            new ApiResponse(400, {}, "Image is required")
        )
    }

    // upload them to cloudinary
    const image = await uploadOnCloudinary(imageLocalPath)

    if (!image) {
        return res.status(400).json(
            new ApiResponse(400, {}, "Could not upload image. Try again.")
        )
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        password,
        phoneNumber,
        image: image.url,
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
    const { phoneNumber, password } = req.body;

    //check if phone number is entered
    if (!phoneNumber) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    {},
                    "Phone number is required"
                )
            )
    }

    if (phoneNumber.length != 10) {
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

    //Check if user is registered
    const user = await User.findOne({ phoneNumber })

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
    const { accessToken, refreshToken } = generateAccessAndRefreshTokens(user._id)

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
                    user: loggedInUser, accessToken, refreshToken
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
        .json(new ApiResponse(
            200,
            {},
            "Password changed successfully"
        ))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "User fetched successfully"
            )
        )
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, phoneNumber } = req.body

    if (!fullName || !phoneNumber) {
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

    if (phoneNumber.length != 10) {
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
    const imageLocalPath = req.file?.path

    if (!imageLocalPath) {
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

    const image = await uploadOnCloudinary(imageLocalPath)

    if (!image) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400,
                    {},
                    "Error while uploading image"
                )
            )
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                image: image.url
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

export { registerUser, loginUser, logoutUser, changeCurrentPassword, updateImage, updateUserDetails, getCurrentUser, refreshAccessToken }