const mongoose = require("mongoose");

const currencySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    symbol: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {},
        unique: true
    },
    status: {
        type: Boolean,
        default: true
    },
    typeOfRounding: {
        type: String,
        default: ""
    },
    numberOfDecimalPlaces: {
        type: Number,
        default: 0
    },

    createdBy: {
        type: String,
        required: true
    },
    updatedBy: {
        type: String,
        default: ""
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,

    }
});

module.exports = mongoose.model("Currency", currencySchema);
