import { Router } from 'express'
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateImage, updateUserDetails, verifyToken } from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyUserJWT } from '../middlewares/userAuth.middleware.js'

const userRouter = Router()

userRouter.route('/register').post(
    upload.fields([
        {
            name: "image",
            maxCount: 1,
        }
    ]),
    registerUser
)

userRouter.route('/login').post(loginUser)
userRouter.route('/logout').post(verifyUserJWT, logoutUser)
userRouter.route('/update-image').patch(verifyUserJWT, upload.single("image"), updateImage)
userRouter.route('/update-account').post(verifyUserJWT, updateUserDetails)
userRouter.route('/change-password').post(verifyUserJWT, changeCurrentPassword)
userRouter.route('/refresh-token').post(refreshAccessToken)
userRouter.route('/current-user').get(verifyUserJWT, getCurrentUser)
userRouter.route('/token-is-valid').get(verifyToken)

export default userRouter