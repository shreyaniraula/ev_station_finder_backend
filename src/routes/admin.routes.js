import { Router } from 'express'
import { getUnverifiedStations, loginAdmin, logoutAdmin, verifyStation } from '../controllers/admin.controller.js'
import { verifyAdminJWT } from '../middlewares/adminAuth.middleware.js'
const adminRouter = Router()

adminRouter.route('/unverified-stations').get(getUnverifiedStations)
adminRouter.route('/verify-station/:stationId').post(verifyStation)

export default adminRouter