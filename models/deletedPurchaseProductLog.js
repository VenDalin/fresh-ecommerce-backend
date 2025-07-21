const mongoose = require("mongoose");

const deletePurchaseLogSchema = new mongoose.Schema({
  purchaseProducts: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true,
  },
  deletedBy: {
    type: String,
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
});

deletePurchaseLogSchema.index({ deletedAt: -1 });
deletePurchaseLogSchema.index({ deletedBy: 1 });

module.exports = mongoose.model("DeletePurchaseLog", deletePurchaseLogSchema);
