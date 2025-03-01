import mongoose, { Schema } from 'mongoose'
import { type } from 'os';

const reservationSchema = new Schema({
    reservedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    reservedTo: {
        type: Schema.Types.ObjectId,
        ref: "Station"
    },
    reserverName: {
        type: String,
        required: true
    },
    reservedStation: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    paymentAmount: {
        type: Number,
        required: true
    },
    startingTime: {
        type: Date,
        required: true
    },
    endingTime: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    remarks: {
        type: String,
        required: true
    }
},
    {
        timestamps: true
    },
);

export const Reservation = mongoose.model("Reservation", reservationSchema)