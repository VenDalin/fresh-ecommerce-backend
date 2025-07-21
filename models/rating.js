const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to the User model
        required: true,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // Reference to the Product model
        // required: true,
    },
    RTCTrackEvent: {
        type: Number,
        required: true,
        min: 1, // Minimum rating value
        max: 5, // Maximum rating value
    },
    review: {
        type: String,
        default: "", // Optional textual review
    },
    status: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
    updatedBy: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: null,
    },
});

// Compound index to ensure a user cannot rate the same product multiple times
ratingSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Index for status field
ratingSchema.index({ status: 1 });

module.exports = mongoose.model("Rate", ratingSchema);