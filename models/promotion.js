const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  productId: {
    type: String,
    required: true,
  },
   product: {
    type: Object, // Store the full product object here
    required: false,
  },
  promotionQtyLimit: {
    type: Number,
    min: 0,
  },
  promotionQtyStartFrom:{
    type: Number,
    min: 0,
    default: 0, // Default to 0 if not specified
  },
  promotionQtyUnit: {
    type: String,
    default: "kg",
  },
  promotionType: {
    type: String,
    required: true,
    enum: ["discount", "freeDelivery", "other"], // example types
  },
  description: {
    type: String,
    required: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },
  createdBy: {
    type: String,
    required: false,
  },
  updatedBy: {
    type: String,
    required: false,
  },
  startDate: {
    type: Date,
    required: true, // Start date of the discount
  },
  endDate: {
    type: Date,
    required: true, // End date of the discount
  },
});

module.exports = mongoose.model("Promotion", promotionSchema);
