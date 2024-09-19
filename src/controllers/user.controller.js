import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import Jwt from 'jsonwebtoken'
import { ApiResponse } from '../utils/apiResponse.js'


//TODO: apply otp
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email)
}

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
    }
    catch (e) {
        console.log(e)
        throw new ApiError(500, "Something went wrong while generating access and user tokens")
    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    const { fullName, username, password, confirmPassword, phoneNumber, email } = req.body;

    if ([fullName, username, password, confirmPassword, phoneNumber, email].some((field) =>
        field?.trim === ""
    )) {
        throw new ApiError(400, "All fields are required")
    }

    if (!validateEmail(email)) {
        throw new ApiError(401, "Invalid email")
    }

    if (phoneNumber.length != 10) {
        throw new ApiError(401, "Invalid phone number")
    }

    if(password !== confirmPassword){
        throw new ApiError(401, "Password does not match with confirm password")
    }

    // check if user already exists: username, email
    const userExists = await User.findOne({
        $or: [{ username }, { phoneNumber }, { email }]
    })

    if (userExists) {
        throw new ApiError(409, "User with this email, username or phone number already exists")
    }

    // check for images
    const imageLocalPath = req.files?.image[0]?.path;

    if (!imageLocalPath) {
        throw new ApiError(400, "Image is required")
    }

    // upload them to cloudinary
    const image = await uploadOnCloudinary(imageLocalPath)

    if (!image) {
        throw new ApiError(400, "Could not upload image. Try again.")
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        password,
        phoneNumber,
        image: image.url,
        email,
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    // return res   
    return res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res, next) => {
    //extract data from req.body
    const { username, password, phoneNumber, email } = req.body;

    //check if username email, phone number is entered
    if (!username && !email && !phoneNumber) {
        throw new ApiError(400, "Username, email, or phone number is required");
    }

    if (email && !validateEmail(email)) {
        throw new ApiError(401, "Invalid email")
    }

    if (phoneNumber && phoneNumber.length != 10) {
        throw new ApiError(401, "Invalid phone number")
    }

    //Check if user is registered
    const user = await User.findOne({
        $or: [{ username }, { email }, { phoneNumber }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    //Check password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect user credentials")
    }

    //access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

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
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = Jwt.verify(incomingRefreshToken, process.env.USER_REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
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
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid password")
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
    const { fullName, username, email, phoneNumber } = req.body

    if (!fullName || !username || !email || !phoneNumber) {
        throw new ApiError(400, "All fields are required")
    }

    if (!validateEmail(email)) {
        throw new ApiError(401, "Invalid email")
    }

    if (phoneNumber.length != 10) {
        throw new ApiError(401, "Invalid phone number")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                username,
                email,
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
        throw new ApiError(400, "Image is missing")
    }

    const image = await uploadOnCloudinary(imageLocalPath)

    if (!image) {
        throw new ApiError(400, "Error while uploading image")
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