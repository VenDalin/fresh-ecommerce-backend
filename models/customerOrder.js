const mongoose = require("mongoose");

const customerOrderSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", 
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true,
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0, 
    },
    status: {
        type: String,
        enum: ["pending", "canceled", "completed"], 
        default: "pending",
    },
    discount: {
        type: Number,
        default: 0,
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "bank"], 
        required: true,
    },
    transaction: {
        type: Map,
        of: mongoose.Schema.Types.Mixed, 
        default: {}, 
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

// Indexes for efficient querying
customerOrderSchema.index({ userId: 1 });
customerOrderSchema.index({ productId: 1 });
customerOrderSchema.index({ orderId: 1 });
customerOrderSchema.index({ status: 1 });

module.exports = mongoose.model("CustomerOrder", customerOrderSchema);