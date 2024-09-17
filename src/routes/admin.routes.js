import { Router } from 'express'
import { getUnverifiedStations, verifyStation } from '../controllers/admin.controller.js'
const adminRouter = Router()

adminRouter.route('/unverified-stations').get(getUnverifiedStations)
adminRouter.route('/verify-station/:stationId').post(verifyStation)

export default adminRouter