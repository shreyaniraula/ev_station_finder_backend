import { Router } from 'express'
import { verifyUserJWT } from '../middlewares/userAuth.middleware.js'
import { addReservation } from '../controllers/reservation.controller.js'

const reservationRouter = Router()

reservationRouter.route('/reserve-station/:stationId').post(verifyUserJWT, addReservation)

export default reservationRouter