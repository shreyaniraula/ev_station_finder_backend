import { Router } from 'express'
import { getCurrentStation, loginStation, logoutStation, refreshAccessToken, registerStation, updatePanCard, updateStationDetails } from '../controllers/station.controller.js'
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
stationRouter.route('/current-station').get(verifyStationJWT, getCurrentStation)

export default stationRouter