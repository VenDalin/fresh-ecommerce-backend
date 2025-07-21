const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // Reference to the Product model
        required: true,
    },
    description: {
        type: String,
        default: "", // Optional description of the discount
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0, // Minimum percentage
        max: 100, // Maximum percentage
    },
    discountAmount: {
        type: Number,
        required: true,
        min: 0, // Ensure discount amount is non-negative
    },
    startDate: {
        type: Date,
        required: true, // Start date of the discount
    },
    endDate: {
        type: Date,
        required: true, // End date of the discount
    },
    status: {
        type: Boolean,
        default: true, // Indicates if the discount is active
    },
    createdBy: {
        type: String,
        required: true, // Tracks who created the discount
    },
    updatedBy: {
        type: String,
        default: null, // Tracks who last updated the discount
    },
    createdAt: {
        type: Date,
        default: Date.now, // Timestamp when the discount was created
    },
    updatedAt: {
        type: Date,
        default: null, // Timestamp when the discount was last updated
    },
});

// Indexes for efficient querying
discountSchema.index({ productId: 1 });
discountSchema.index({ status: 1 });
discountSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model("Discount", discountSchema);