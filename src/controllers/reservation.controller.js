import { Reservation } from "../models/reservation.model.js";
import { Station } from "../models/station.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

//To be done by the station if some other EV is charged outside the app
const updateReservation = asyncHandler(async (req, res) => {
    const { reservedSlots, reservedTill } = req.body

    const station = await Station.findById(req.station._id)

    if (station.noOfSlots < reservedSlots) {
        throw new ApiError(401, "Reserved slots cannot be more than total slots.")
    }
    station.reservedSlots = reservedSlots
    station.endingTime = reservedTill
    station.save()

    return res.status(200).json(
        new ApiResponse(

            200,
            { station },
            "Reservation information updated successfully."
        )
    )
})

const addReservation = asyncHandler(async (req, res) => {
    const stationId = req.params.stationId
    const userId = req.user._id

    const { paymentAmount, startingTime, endingTime, remarks } = req.body

    const station = await Station.findById(stationId)

    if (!station) {
        throw new ApiError(404, "Station not found")
    }

    if (!station.isVerified) {
        throw new ApiError(401, "Station not verified")
    }

    const availableSpots = station.noOfSlots - station.reservedSlots;
    if (availableSpots <= 0) {
        return res.status(400).json({ error: 'No available spots for reservation' });
    }

    const reservation = await Reservation.create({
        reservedBy: userId,
        reservedTo: stationId,
        paymentAmount,
        startingTime,
        endingTime,
        remarks,
    })

    if (!reservation) {
        throw new ApiError(400, "Some error occurred while adding comment")
    }

    //Increase the number of reserved slots by 1 if reservation is done
    station.reservedSlots += 1
    station.save()

    return res.status(200).json(
        new ApiResponse(200, reservation, "Reservation added successfully")
    )
})

const cancelReservation = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const stationId = req.params;
    const cancelledReservation = await Reservation.deleteOne({
        reservedBy: userId,
        reservedTo: stationId
    })

    if (!cancelledReservation) {
        throw new ApiError(400, "Unable to cancel reservation")
    }

    //Decrease the number of reserved slots by 1 if reservation is cancelled
    const station = await Station.findById(stationId)
    station.reservedSlots -= 1
    station.save()

    return res.status(200).json(
        new ApiResponse(200, cancelledReservation, "Reservation cancelled successfully.")
    )
})

export { addReservation, updateReservation, cancelReservation }