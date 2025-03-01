import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    stationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Station',
        required: true,
    },
    priority: {
        type: Number,
        required: true,
        default: 5,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
    // status indicates whether the user is still waiting, currently processing, or finished
    status: {
        type: String,
        enum: ['waiting', 'processing', 'completed'],
        default: 'waiting',
    },
});

export const Queue = mongoose.model('Queue', queueSchema);