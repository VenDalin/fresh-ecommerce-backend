const mongoose = require("mongoose");

const purchaseProductSchema = new mongoose.Schema({
  products: {
    type: [Map], // Array of maps to store product details
    of: mongoose.Schema.Types.Mixed,
    default: [], // Default to an empty array
  },
  productIds: {
    type: [mongoose.Schema.Types.ObjectId], // Array of product IDs
    ref: "Product", // Reference to the Product model
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  status: {
    type: Boolean,
    default: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
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

purchaseProductSchema.index({ supplierId: 1 });
purchaseProductSchema.index({ status: 1 });
purchaseProductSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PurchaseProduct", purchaseProductSchema);