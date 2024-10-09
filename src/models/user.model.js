import mongoose, {Schema} from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
    },
    type:{
        type: String,
        default: 'user'
    },
    image: {
        type: String,       //cloudinary url
        required: true,
    },
    refreshToken: {
        type: String,
    },
},
{
    timestamps: true
},
);

//Encrypt password before saving in DB
userSchema.pre("save", async function (next) {
    //Run the function only if password is modified
    if (!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

//Create a method to check password
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            phoneNumber: this.phoneNumber,
            username: this.username,
            fullName: this.fullName
        },
        process.env.USER_ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.USER_REFRESH_TOKEN_SECRET ,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);