import { Reservation } from "../models/reservation.model.js";
import { Station } from "../models/station.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

//TODO: write code to get all reservation statuses
const getReservationStatus = asyncHandler(async(req, res)=>{
    const stationId = parseInt(req.params.id);
    const station = findStationById(stationId);

    if (!station) {
        return res.status(404).json({ error: 'Station not found' });
    }

    const availableSpots = station.totalSpots - station.reservedSpots;
    res.json({
        stationId: station.id,
        totalSpots: station.totalSpots,
        reservedSpots: station.reservedSpots,
        availableSpots: availableSpots
    });
})

//TODO: modify code to accept charging time efficiently
const addReservation = asyncHandler(async(req, res)=>{
    const stationId = req.params.stationId
    const userId = req.user._id

    const { paymentAmount, chargingTime, remarks} = req.body

    const station = await Station.findById(stationId)

    if (!station) {
        throw new ApiError(404, "Station not found")
    }

    if(!station.isVerified){
        throw new ApiError(401, "Station not verified")
    }

    const availableSpots = station.noOfSlots - station.reservedSlots;
    if (availableSpots <= 0) {
        return res.status(400).json({ error: 'No available spots for reservation' });
    }

    const reservation = await Reservation.create({ reservedBy: userId, reservedTo: stationId, paymentAmount, chargingTime, remarks })

    if (!reservation) {
        throw new ApiError(400, "Some error occurred while adding comment")
    }

    station.reservedSlots+=1

    return res.status(200).json(
        new ApiResponse(200, reservation, "Reservation added successfully")
    )
})

export {addReservation}