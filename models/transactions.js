const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerOrder" },
  fromAccountId: { type: String },
  toAccountId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "KHR" },
  qrCodeUrl: { type: String, default: null },
  bakongRefId: { type: String, default: null, unique: true },
  callbackUrl: { type: String, default: null },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "expired", "failed"],
    default: "pending",
  },
  paymentMethod: { type: String, required: true },
  transactionType: {
    type: String,
    enum: ["checkout", "topup", "refund"],
    required: true,
  },
  qrExpiresAt: { type: Date, default: null },
  scannedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  status: { type: Boolean, default: true },
  description: { type: String, default: null },
  scannerInfo: {
    accountId: String,
    bankName: String,
    deviceInfo: String
  },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null }
}, { timestamps: true });

transactionSchema.index({ userId: 1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ customerId: 1 });
transactionSchema.index({ paymentStatus: 1 });
transactionSchema.index({ transactionType: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
