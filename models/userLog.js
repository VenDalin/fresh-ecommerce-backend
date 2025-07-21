const mongoose = require('mongoose');

const userLogSchema = new mongoose.Schema({

    userId: {
        type: String,
        required: true
    },

    deviceLog: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        required: true
    },


    createdAt: {
        type: Date,
        required: true
    },

})


userLogSchema.index({ userId: 1, });

module.exports = mongoose.model('UserLog', userLogSchema);