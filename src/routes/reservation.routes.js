import { Router } from 'express'
import { verifyUserJWT } from '../middlewares/userAuth.middleware.js'
import { addReservation, updateReservation, viewReservations, myReservations, cancelReservation, joinQueue, queueStatus } from '../controllers/reservation.controller.js'
import { verifyStationJWT } from '../middlewares/stationAuth.middleware.js'

const reservationRouter = Router()

reservationRouter.route('/reserve-station/:stationId').post(verifyUserJWT, addReservation)
reservationRouter.route('/update-reservation').post(verifyStationJWT, updateReservation)
reservationRouter.route('/view-reservation').get(verifyStationJWT, viewReservations)
reservationRouter.route('/cancel-reservation/:reservationId').delete(verifyUserJWT, cancelReservation)
reservationRouter.route('/my-reservations').get(verifyUserJWT, myReservations)
reservationRouter.route('/join-queue').post(verifyStationJWT, joinQueue)
reservationRouter.route('/queue-status').get(verifyStationJWT, queueStatus)

export default reservationRouter