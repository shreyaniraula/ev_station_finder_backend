import { Router } from 'express'
import { loginUser, logoutUser, registerUser } from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

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
userRouter.route('/logout').post(verifyJWT, logoutUser)

export default userRouter