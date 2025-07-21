const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to the User model
        required: true,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // Reference to the Product model
        required: true,
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

// Compound index to ensure a user cannot favorite the same product multiple times
favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Index for status field
favoriteSchema.index({ status: 1 });

module.exports = mongoose.model("Favorite", favoriteSchema);