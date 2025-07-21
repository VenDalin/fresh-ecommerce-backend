const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  idCustom: {
    type: String,
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category", // Reference to the Category model
    required: true,
  },
  currency: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},

},

  name: {
    type: String,
    required: true,
  },
  note: {
    type: String,
    default: "", // Add default
  },
  salePrice: {
    type: Number,
    required: true,
  },
  purchasePrice: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  totalStock: {
    type: Number,
    default: 0, // Add default
  },

  totalPrice: {
    type: Number,
    default: 0,
  },
  unit: {
    type: String,
    default: "",
  },

  status: {
    type: Boolean,
    default: true,
  },
  imageURL: {
    type: String,
    default: "",
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: null, // Add default
  },
  updatedBy: {
    type: String,
    default: null,
  },
});

// build index
productSchema.index({ status: 1 });

module.exports = mongoose.model("Product", productSchema);
