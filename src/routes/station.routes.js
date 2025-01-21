import { Router } from 'express'
import { getAllStations, getStationDetails, loginStation, logoutStation, refreshAccessToken, registerStation, updatePanCard, updateStationDetails, verifyToken } from '../controllers/station.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyStationJWT } from '../middlewares/stationAuth.middleware.js'

const stationRouter = Router()

stationRouter.route('/register').post(
    upload.fields([
        {
            name: "panCard",
            maxCount: 1,
        }
    ]),
    registerStation
)

stationRouter.route('/login').post(loginStation)
stationRouter.route('/logout').post(verifyStationJWT, logoutStation)
stationRouter.route('/update-pan-card').patch(verifyStationJWT, upload.single("panCard"), updatePanCard)
stationRouter.route('/update-account').post(verifyStationJWT, updateStationDetails)
stationRouter.route('/refresh-token').post(refreshAccessToken)
stationRouter.route('/station-details').get(getStationDetails)
stationRouter.route('/get-all-stations').get(getAllStations)
stationRouter.route('/token-is-valid').get(verifyToken)

export default stationRouter