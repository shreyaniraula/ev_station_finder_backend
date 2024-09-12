import mongoose, { Schema } from 'mongoose'

const reservationSchema = new Schema({
    reservedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    reservedTo: {
        type: Schema.Types.ObjectId,
        ref: "Station"
    },
    paymentAmount: {
        type: Number,
        required: true
    }
},
    {
        timestamps: true
    },
);

export const Reservation = mongoose.model("Reservation", reservationSchema)