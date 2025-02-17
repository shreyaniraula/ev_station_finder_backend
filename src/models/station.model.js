import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  STATION_ACCESS_TOKEN_SECRET,
  STATION_REFRESH_TOKEN_SECRET,
} from "../config/index.js";

const stationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    location: {
      type: String,
      required: true,
    },
    panCard: {
      type: String, //cloudinary url
      required: true,
    },
    stationImage: {
      type: String, //cloudinary url
      required: true,
    },
    noOfSlots: {
      type: Number,
      required: true,
    },
    reservedSlots: {
      type: Number,
    },
    isVerified: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

//Encrypt password before saving in DB
stationSchema.pre("save", async function (next) {
  //Run the function only if password is modified
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//Create a method to check password
stationSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

stationSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      name: this.name,
    },
    STATION_ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
};

stationSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    STATION_REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const Station = mongoose.model("Station", stationSchema);
