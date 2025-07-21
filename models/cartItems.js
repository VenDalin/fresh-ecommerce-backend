const mongoose = require("mongoose");

const cartItemsSchema = new mongoose.Schema({
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
    quantity: {
        type: Number,
        default: 1,
        min: 1, // Ensure quantity is at least 1
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

// Compound index to ensure a user cannot add the same product to their cart multiple times
cartItemsSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Index for status field
cartItemsSchema.index({ status: 1 });

module.exports = mongoose.model("Cart", cartItemsSchema);