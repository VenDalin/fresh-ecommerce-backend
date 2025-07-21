const mongoose = require("mongoose");

const purchaseHistorySchema = new mongoose.Schema({

   
    customerOrderId: {
        type: String,
        ref: "CustomerOrder",
        // required: true
    },
    productId: {
        type: String,
        ref: "Product",
        required: true
    },

    status: {
        type: Boolean,
        default: true,
    },
  
    createdBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
    },
    updatedBy: {
        type: String,
        default: null
    }
});

// build index
purchaseHistorySchema.index({ status: 1 });
purchaseHistorySchema.index({ customerOrderId: 1 })

module.exports = mongoose.model("PurchaseHistory", purchaseHistorySchema);