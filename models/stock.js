const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", // Reference to the Product model
    required: true,
  },

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category", // Reference to the Category model
    required: true,
  },
  purchaseProducts: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    // required: true,
  },
  name: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  imageURL: {
    type: String,
    default: null,
  },
  isOutOfStock: {
    type: Boolean,
    default: false,
  },
  minThreshold: {
    type: Number,
    required: true,
  },
  maxCapacity: {
    type: Number,
    required: true,
  },
  lastRestockedAt: {
    type: Date,
    default: null,
  },
  lastSoldAt: {
    type: Date,
    default: null,
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
stockSchema.index({ productId: 1 }, { unique: true }); // Ensure unique stock per product
stockSchema.index({ isOutOfStock: 1 });
stockSchema.index({ categoryId: 1 });

module.exports = mongoose.model("Stock", stockSchema);
