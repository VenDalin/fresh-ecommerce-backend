const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      name: { type: String, default: "" },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      image: { type: String, default: "" }
    }
  ],
  totalCost: { type: Number, required: true, min: 0 },
  deliveryMethod: { type: String, default: "" },
  deliveryAddress: { type: String, default: "" },
  paymentMethod: { type: String, default: "" },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid", "failed", "pending"],
    default: "pending"
  },
  status: {
    type: String,
    enum: ["pending", "rejected", "delivering", "confirmed", "completed", "got_product"],
    default: "pending"
  },
  orderPlacedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: null },
  deliveringAt: { type: Date, default: null },
  gotProductAt: { type: Date, default: null },
  note: { type: String, default: "" },
  trackingNumber: { type: String, default: null },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, default: null },
}, {
  timestamps: true // Automatically adds createdAt & updatedAt
});

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "items.productId": 1 });

module.exports = mongoose.model("Order", orderSchema);
