const mongoose = require("mongoose");

const systemSchema = new mongoose.Schema({
    bakongWalletId: {
        type: String,
        required: true, },

    bakongToken: {
        type: String,
        required: true, 
    },
    bakongTokenExpiresAt: {
        type: Date,
        required: true,
    },
    telegramBotToken: {
        type: String,
        required: true, 
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
systemSchema.index({ bakongWalletId: 1 });
systemSchema.index({ bakongTokenExpiresAt: 1 });

module.exports = mongoose.model("System", systemSchema);