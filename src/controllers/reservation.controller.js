import { Reservation } from "../models/reservation.model.js";
import { Station } from "../models/station.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { queue, isStationBusy, BASE_SERVICE_TIME, MIN_SERVICE_TIME, setStationBusy } from "../index.js";
import { User } from "../models/user.model.js";
import { Queue } from "../models/queue.model.js";

const updateReservation = asyncHandler(async (req, res) => {
    const { startingTime, endingTime, paymentAmount, remarks } = req.body

    const station = await Station.findById(req.station._id)

    const overlappingReservations = await Reservation.find({
        reservedTo: req.station._id,
        $or: [
            {
                startingTime: { $lt: endingTime },
                endingTime: { $gt: startingTime }
            }
        ]
    });

    const availableSpots = station.noOfSlots - overlappingReservations.length;
    if (availableSpots <= 0) {
        let earliestEndTime = overlappingReservations.reduce((earliest, reservation) => {
            const resEnd = new Date(reservation.endingTime);
            return resEnd < earliest ? resEnd : earliest;
        }, new Date(overlappingReservations[0].endingTime));

        return res.status(400).json(
            new ApiResponse(400, {}, "No available spots for reservation. The earliest available slot is at " + earliestEndTime)
        );
    }

    const reservation = await Reservation.create({
        reservedBy: req.station?._id,
        reservedTo: req.station?._id,
        reserverName: req.station?.username,
        reservedStation: req.station?.name,
        location: req.station?.location,
        paymentAmount,
        startingTime,
        endingTime,
        remarks,
    })

    if (!reservation) {
        return res.status(400).json(
            new ApiResponse(400, reservation, "Some error occurred while adding reservation")
        )
    }

    station.save()

    return res.status(200).json(
        new ApiResponse(200, reservation, "Reservation added successfully")
    )
})

const addReservation = asyncHandler(async (req, res) => {
    const stationId = req.params.stationId
    const userId = req.user?._id

    const { paymentAmount, startingTime, endingTime, remarks } = req.body

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

    const overlappingReservations = await Reservation.find({
        reservedTo: stationId,
        $or: [
            {
                startingTime: { $lt: endingTime },
                endingTime: { $gt: startingTime }
            }
        ]
    });

    const availableSpots = station.noOfSlots - overlappingReservations.length;
    if (availableSpots <= 0) {
        let earliestEndTime = overlappingReservations.reduce((earliest, reservation) => {
            const resEnd = new Date(reservation.endingTime);
            return resEnd < earliest ? resEnd : earliest;
        }, new Date(overlappingReservations[0].endingTime));

        return res.status(409).json(
            new ApiResponse(409, {}, "No available spots for reservation. The earliest available slot is at " + earliestEndTime)
        );
    }

    const reservation = await Reservation.create({
        reservedBy: userId ? userId : stationId,
        reservedTo: stationId,
        reserverName: req.user?.username,
        reservedStation: station.name,
        location: station.location,
        paymentAmount,
        startingTime,
        endingTime,
        remarks,
    })

    if (!reservation) {
        return res.status(400).json(
            new ApiResponse(400, reservation, "Some error occurred while adding reservation")
        )
    }

    //Increase the number of reserved slots by 1 if reservation is done
    station.save()

    return res.status(200).json(
        new ApiResponse(200, reservation, "Reservation added successfully")
    )
})

const cancelReservation = asyncHandler(async (req, res) => {
    const reservationId = req.params.reservationId
    const cancelledReservation = await Reservation.findByIdAndDelete(reservationId)

    if (!cancelledReservation) {
        return res.status(400).json(
            new ApiResponse(400, {}, "Unable to cancel reservation")
        )
    }

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

const myReservations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const reservations = await Reservation.find({ reservedBy: userId })

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

const joinQueue = asyncHandler(async (req, res) => {
    const { username, priority } = req.body;
    const stationId = req.station._id;
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(404).json(
            new ApiResponse(404, {}, "User not found")
        )
    }
    const userId = user._id;

    const userPriority = (priority !== undefined ? priority : 5);
    console.log(`User ${userId} with priority ${userPriority} joined the queue`);

    const newQueueItem = await Queue.create({
        userId,
        stationId,
        priority: userPriority,
        joinedAt: new Date(),
        status: 'waiting',
    });

    // Optionally, calculate the user's position in the queue for that station
    const waitingItems = await Queue.find({ stationId, status: 'waiting' }).sort({ priority: 1, joinedAt: 1 });
    const position = waitingItems.findIndex(item => item._id.equals(newQueueItem._id)) + 1;

    console.log(`User ${username} is at position ${position} in the queue for station ${stationId}`);
    console.log(`Current queue: ${JSON.stringify(waitingItems)}`);

    queue.push(newQueueItem);
    processQueue(stationId);

    res.json({ message: 'Joined queue', queuePosition: position });
}
);

const queueStatus = asyncHandler(async (req, res) => {
    const stationId = req.station._id;
    const queue = await Queue.find({ stationId }).sort({ priority: 1, joinedAt: 1 });
    res.json({ queue, isStationBusy });
});

// Process the queue if the station is free
const processQueue = async (stationId) => {
    console.log('Processing queue for station', stationId);
    if (!isStationBusy) {
        const nextItem = await Queue.findOne({ stationId, status: 'waiting' }).sort({ priority: 1, joinedAt: 1 });
        console.log('Next item in queue', nextItem);
        if (nextItem) {
            setStationBusy(true);
            nextItem.status = 'processing';
            await nextItem.save();

            // Dynamically adjust the service time
            const waitingCount = await Queue.countDocuments({ stationId, status: 'waiting' });
            const dynamicServiceTime = Math.max(MIN_SERVICE_TIME, BASE_SERVICE_TIME - (waitingCount * 500));
            console.log(`Dynamic service time for user ${nextItem.userId} at station ${stationId} is ${dynamicServiceTime} ms`);

            // Notify clients that the station is allocated
            console.log('stationAllocated', { userId: nextItem.userId, stationId });
            console.log(queue)

            // Simulate station usage
            setTimeout(async () => {
                console.log(`User ${nextItem.userId} finished using station ${stationId}`);
                nextItem.status = 'completed';
                await nextItem.save();
                setStationBusy(false);
                console.log('stationReleased', { userId: nextItem.userId, stationId });
                processQueue(stationId); // Process the next user for this station
            }, dynamicServiceTime);
        }
    }
}

const cleanupCompletedItems = async () => {
    try {
        const result = await Queue.deleteMany({ status: 'completed' });
        console.log(`Cleanup: Removed ${result.deletedCount} completed items from the queue`);
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};
setInterval(cleanupCompletedItems, 30*60*1000); // Cleanup every 30 minute

export {
    addReservation,
    updateReservation,
    cancelReservation,
    viewReservations,
    myReservations,
    queueStatus,
    joinQueue,
}