import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const stationSchema = new Schema({
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
        type: Number,
        required: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    location: {
        type: String,
        required: true,
    },
    panCard: {
        type: String,
        required: true,
    },
    noOfSlots: {
        type: Number,
        required: true,
    },
},
    { timestamps: true },
);

export const Station = mongoose.model("Station", stationSchema);