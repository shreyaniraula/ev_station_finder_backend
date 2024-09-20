import { Station } from "../models/station.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getUnverifiedStations = asyncHandler(async (req, res, next) => {
    const unverifiedStations = await Station.find({ 'isVerified': false });

    if (!unverifiedStations) {
        return res.status(400).json(
            new ApiResponse(400, {}, "Something went wrong while fetching unverified stations")
        )
    }

    return res.status(200).json(
        new ApiResponse(200, unverifiedStations, "Unverified stations fetched successfully")
    )
})

const verifyStation = asyncHandler(async (req, res, next) => {
    const stationId = req.params.stationId

    const verifedStation = await Station.findByIdAndUpdate(
        stationId,
        {
            $set: {
                isVerified: true
            }
        },
        {new: true}
    ).select("-password")

    if(!verifedStation){
        return res
        .status(400)
        .json(
            new ApiResponse(
                400,
                {},
                "Something went wrong while verifying station"
            )
        )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    verifedStation
                },
                "Account details updated successfully"
            )
        )
})

export { loginAdmin, logoutAdmin, refreshAccessToken, getUnverifiedStations, verifyStation }