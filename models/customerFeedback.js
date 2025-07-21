const mongoose = require("mongoose");

const customerFeedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        default: ""
    },
    phoneNumber: {
        type: String,
        required: true
    },
    
    feedback: {
        type: String,
        default: ""
    },

    createdBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
  
}, { timestamps: true });

// build in dex
module.exports = mongoose.model("CustomerFeedback", customerFeedbackSchema);