import asyncHandler from '../utils/asyncHandler.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import Jwt from 'jsonwebtoken'
import { ApiResponse } from '../utils/apiResponse.js'
import { Station } from '../models/station.model.js'
import { STATION_ACCESS_TOKEN_SECRET } from '../config/index.js'

const generateAccessAndRefreshTokens = async (stationId) => {
    try {
        const station = await Station.findOne(stationId)
        const accessToken = station.generateAccessToken()
        const refreshToken = station.generateRefreshToken()

        station.refreshToken = refreshToken
        await station.save({ validateBeforeSave: false })
        return { refreshToken, accessToken }
    } catch (e) {
        console.log(e)
    }
}

const registerStation = asyncHandler(async (req, res, next) => {
    const { name, username, password, phoneNumber, location, noOfSlots, panCard, stationImage } = req.body;

    if ([name, username, password, phoneNumber, location, noOfSlots, panCard, stationImage].some((field) =>
        field?.trim === ""
    )) {
        return res.status(400).json(
            new ApiResponse(400, {}, "All fields are required.")
        )
    }

    if (phoneNumber.length != 10) {
        return res.status(401).json(
            new ApiResponse(401, {}, "Invalid phone number.")
        )
    }

    // check if station already exists: username, phone number
    const stationExists = await Station.findOne({
        $or: [{ username }, { phoneNumber }]
    })

    if (stationExists) {
        return res.status(409).json(
            new ApiResponse(409, {}, "Station with this username or phone number already exists")
        )
    }


    // create station object - create entry in db
    const station = await Station.create({
        name,
        username: username.toLowerCase(),
        password,
        phoneNumber,
        panCard,
        stationImage,
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
        return res.status(500).json(
            new ApiResponse(500, createdStation, "Something went wrong while registering station.")
        )
    }

    // return res   
    return res.status(200).json(
        new ApiResponse(200, createdStation, "Station registered successfully. Please wait for verification.")
    )
})

const loginStation = asyncHandler(async (req, res, next) => {
    //extract data from req.body
    const { username, password } = req.body;

    //check if username is entered
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

    //Check if station is registered
    const station = await Station.findOne({ username })

    if (!station) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    {},
                    "Station does not exist"
                )
            )
    }

    //Check password
    const isPasswordValid = await station.isPasswordCorrect(password)

    if (!isPasswordValid) {
        return res
            .status(401)
            .json(
                new ApiResponse(
                    401,
                    {},
                    "Incorrect station credentials"
                )
            )
    }

    //access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(station._id)

    Jwt.sign(accessToken, "accessToken")

    const loggedInStation = await Station.findById(station._id).select("-password -refreshToken")

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
                    accessToken, ...station._doc
                },
                "Station logged in successfully"
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

    const decodedToken = Jwt.verify(incomingRefreshToken,STATION_REFRESH_TOKEN_SECRET)

    const station = await Station.findById(decodedToken?._id)
    if (!station) {
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

    if (incomingRefreshToken !== station.refreshToken) {
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
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const station = await Station.findById(req.station?._id)

    const isPasswordCorrect = await station.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        return res
            .status(400)
            .json(new ApiResponse(
                400,
                {},
                "Invalid password"
            ))
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

const getStationDetails = asyncHandler(async (req, res) => {
    const stationUsername = req.header('stationUsername')
    console.log(req.header('stationUsername'))
    console.log(req.station?.username)

    const stationDetails = await Station.findOne({ username: stationUsername }).select('-password -refreshToken')

    if (!stationDetails) {
        return res.status(500).json(new ApiResponse(500, {}, "Something went wrong while fetching station details."))
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, stationDetails, "Station fetched successfully"
            )
        )
})

const updateStationDetails = asyncHandler(async (req, res) => {
    const { name, username, phoneNumber } = req.body
    console.log(name, username, phoneNumber)

    if (!name || !username || !phoneNumber) {
        return res
            .status(400)
            .json(new ApiResponse(
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
        .json(
            new ApiResponse(
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
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400, {}, "Pan Card image is missing"
                )
            )
    }

    const panCard = await uploadOnCloudinary(panCardLocalPath)

    if (!panCard) {
        return res
            .status(400)
            .json(
                new ApiResponse(
                    400, {}, "Error while uploading pan card"
                )
            )
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
                200, station, "Pan card updated successfully"
            )
        )
})

const getAllStations = asyncHandler(async (req, res) => {
    const stations = await Station.find().select('-password')

    if (!stations || stations.length == 0) {
        return res.status(400).json(
            new ApiResponse(
                400, {}, "Stations not found."
            )
        )
    }

    return res.status(200).json(
        new ApiResponse(
            200, stations, "Stations fetched successfully"
        )
    )
})

const verifyToken = asyncHandler(async (req, res) => {
    const token = req.header('station-auth-token')
    if (!token) return res.json(false)
    const verified = Jwt.verify(token, STATION_ACCESS_TOKEN_SECRET)
    if (!verified) return res.json(false)

    const user = await Station.findById(verified._id)
    if (!user) return res.json(false)
    res.json(true)
})

export {
    refreshAccessToken,
    registerStation,
    loginStation,
    logoutStation,
    changeCurrentPassword,
    getStationDetails,
    updateStationDetails,
    updatePanCard,
    getAllStations,
    verifyToken
}
