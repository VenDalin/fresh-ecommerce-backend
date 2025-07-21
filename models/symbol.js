const mongoose = require("mongoose");

const symbolCurrencySchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    status: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        default: ""
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

});

module.exports = mongoose.model("SymbolCurrency", symbolCurrencySchema);