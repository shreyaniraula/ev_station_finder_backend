import { Reservation } from "../models/reservation.model.js";
import { Station } from "../models/station.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

//To be done by the station if some other EV is charged outside the app
const updateReservation = asyncHandler(async (req, res) => {
    const { startingTime, endingTime, paymentAmount, remarks } = req.body

    const station = await Station.findById(req.station._id)

    const availableSpots = station.noOfSlots - station.reservedSlots;
    if (availableSpots <= 0) {
        return res.status(400).json(
            new ApiResponse(400, {}, "No available spots for reservation")
        )
    }

    const reservation = await Reservation.create({
        reservedBy: req.station?._id,
        reservedTo: req.station?._id,
        paymentAmount,
        startingTime,
        endingTime,
        remarks,
    })

    console.log(reservation)

    if (!reservation) {
        return res.status(400).json(
            new ApiResponse(400, reservation, "Some error occurred while adding reservation")
        )
    }

    //Increase the number of reserved slots by 1 if reservation is done
    station.reservedSlots += 1
    station.save()

    return res.status(200).json(
        new ApiResponse(200, reservation, "Reservation added successfully")
    )
})

const addReservation = asyncHandler(async (req, res) => {
    const stationId = req.params.stationId
    const userId = req.user?._id

    const { paymentAmount, startingTime, endingTime, remarks } = req.body
    console.log(paymentAmount, startingTime, endingTime, remarks)

    const station = await Station.findById(stationId)

    if (!station) {
        return res.status(404).json(
            new ApiResponse(404, {}, "Station not found")
        )
    }

    if (!station.isVerified) {
        return res.status(401).json(
            new ApiResponse(401, {}, "Station not verified")
        )
    }

    const availableSpots = station.noOfSlots - station.reservedSlots;
    if (availableSpots <= 0) {
        return res.status(400).json(
            new ApiResponse(400, {}, "No available spots for reservation")
        )
    }

    console.log('Here')

    const reservation = await Reservation.create({
        reservedBy: userId ? userId : stationId,
        reservedTo: stationId,
        paymentAmount,
        startingTime,
        endingTime,
        remarks,
    })

    console.log('Reservation')
    console.log(reservation)

    if (!reservation) {
        return res.status(400).json(
            new ApiResponse(400, reservation, "Some error occurred while adding reservation")
        )
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
        return res.status(400).json(
            new ApiResponse(400, {}, "Unable to cancel reservation")
        )
    }

    //Decrease the number of reserved slots by 1 if reservation is cancelled
    const station = await Station.findById(stationId)
    station.reservedSlots -= 1
    station.save()

    return res.status(200).json(
        new ApiResponse(200, cancelledReservation, "Reservation cancelled successfully.")
    )
})

const viewReservations = asyncHandler(async (req, res) => {
    const stationId = req.station._id;

    const reservations = await Reservation.find({ reservedTo: stationId })

    if (!reservations) {
        return res.status(400).json(
            new ApiResponse(
                400, reservations, "Something went wrong while fetching reservations",
            ),
        )
    }

    return res.status(200).json(
        new ApiResponse(
            200, reservations, "Reservations fetched successfully",
        ),
    )
})

export {
    addReservation,
    updateReservation,
    cancelReservation,
    viewReservations

}