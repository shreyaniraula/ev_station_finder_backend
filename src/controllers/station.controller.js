import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import Jwt from 'jsonwebtoken'
import { ApiResponse } from '../utils/apiResponse.js'
import { Station } from '../models/station.model.js'

const generateAccessAndRefreshTokens = async (stationId) => {
    try {
        const station = await Station.findOne(stationId)
        const accessToken = station.generateAccessToken()
        const refreshToken = station.generateRefreshToken()

        station.refreshToken = refreshToken
        await station.save({ validateBeforeSave: false })
        return { refreshToken, accessToken }
    }
    catch (e) {
        console.log(e)
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerStation = asyncHandler(async (req, res, next) => {
    const { name, username, password, phoneNumber, location, noOfSlots } = req.body;

    if ([name, username, password, phoneNumber, location, noOfSlots].some((field) =>
        field?.trim === ""
    )) {
        throw new ApiError(400, "All fields are required")
    }

    if (phoneNumber.length != 10) {
        throw new ApiError(401, "Invalid phone number")
    }

    // check if station already exists: username, phone number
    const stationExists = await Station.findOne({
        $or: [{ username }, { phoneNumber }]
    })

    if (stationExists) {
        throw new ApiError(409, "Station with this username or phone number already exists")
    }

    // check for panCards
    const panCardLocalPath = req.files?.panCard[0]?.path;

    if (!panCardLocalPath) {
        throw new ApiError(400, "Pan Card image is required")
    }

    // upload them to cloudinary
    const panCard = await uploadOnCloudinary(panCardLocalPath)

    console.log("reached here")
    if (!panCard) {
        throw new ApiError(400, "Could not upload pan card. Try again.")
    }


    // create station object - create entry in db
    const station = await Station.create({
        name,
        username: username.toLowerCase(),
        password,
        phoneNumber,
        panCard: panCard.url,
        location,
        noOfSlots,
        isVerified: false,
        reservedSlots: 0
    })

    // remove password and refresh token field from response
    const createdStation = await Station.findById(station._id).select(
        "-password -refreshToken"
    )

    // check for station creation
    if (!createdStation) {
        throw new ApiError(500, "Something went wrong while registering station")
    }

    // return res   
    return res.status(201).json(
        new ApiResponse(200, createdStation, "Station registered successfully. Please wait for verification.")
    )
})

const loginStation= asyncHandler(async (req, res, next) => {
    //extract data from req.body
    const { username, password, phoneNumber } = req.body;

    //check if username email, phone number is entered
    if (!username && !phoneNumber) {
        throw new ApiError(400, "Username or phone number is required");
    }

    if (phoneNumber && phoneNumber.length != 10) {
        throw new ApiError(401, "Invalid phone number")
    }

    //Check if station is registered
    const station = await Station.findOne({
        $or: [{ username }, { phoneNumber }]
    })

    if (!station) {
        throw new ApiError(404, "Station does not exist")
    }

    //Check password
    const isPasswordValid = await station.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect station credentials")
    }

    //access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(station._id)

    const loggedInStation= await Station.findById(station._id).select("-password -refreshToken")

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
                    station: loggedInStation, accessToken, refreshToken
                },
                "Stationlogged in successfully"
            )
        )
})

const logoutStation = asyncHandler(async (req, res) => {
    await Station.findByIdAndUpdate(
        req.station._id,
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
                "Station logged out successfully"
            )
        )

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = Jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const station = await Station.findById(decodedToken?._id)
        if (!station) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== station.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(station._id)

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

    const station = await Station.findById(req.station?._id)

    const isPasswordCorrect = await station.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid password")
    }

    station.password = newPassword

    await station.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Password changed successfully"
        ))
})

const getCurrentStation = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.station, "Station fetched successfully"
            )
        )
})

const updateStationDetails = asyncHandler(async (req, res) => {
    const { name, username, phoneNumber } = req.body
    console.log(name, username, phoneNumber)

    if (!name || !username || !phoneNumber) {
        throw new ApiError(400, "All fields are required")
    }

    if (phoneNumber.length != 10) {
        throw new ApiError(401, "Invalid phone number")
    }

    const station = await Station.findByIdAndUpdate(
        req.station?._id,
        {
            $set: {
                name,
                username,
                phoneNumber,
            },
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {
                station
            },
            "Account details updated successfully"
        )
        )
})

const updatePanCard = asyncHandler(async (req, res) => {
    const panCardLocalPath = req.file?.path

    if (!panCardLocalPath) {
        throw new ApiError(400, "Pan Card image is missing")
    }

    const panCard = await uploadOnCloudinary(panCardLocalPath)

    if (!panCard) {
        throw new ApiError(400, "Error while uploading pan card")
    }

    const station = await Station.findByIdAndUpdate(
        req.station._id,
        {
            $set: {
                panCard: panCard.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, station, "pan card updated successfully"
            )
        )
})

// TODO: write code to update reservation
const updateReservation = asyncHandler(async(req, res)=>{

})

export { refreshAccessToken, registerStation, loginStation, logoutStation, changeCurrentPassword, getCurrentStation, updateStationDetails, updatePanCard }