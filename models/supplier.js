const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, 
    },
    address: {
        type: String,
        required: true,
    },
    contact: {
        type: String,
        required: true, 
    },
    description: {
        type: String,
        default: "",},
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

// Indexes for efficient querying
supplierSchema.index({ name: 1 });
supplierSchema.index({ status: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);