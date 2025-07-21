const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({

    status: {
        type: Boolean,
        default: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    createdBy: {
        type: String,
        required: true
    },
    updatedBy: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: null
    },
    description: {
        type: String,
        default: ""
    }


});

// build in dex
categorySchema.index({ status: 1 });
module.exports = mongoose.model("Category", categorySchema);