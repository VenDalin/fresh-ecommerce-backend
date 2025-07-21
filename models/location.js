// models/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  province: { type: String, required: true },
  district: { type: String, required: true },
  commune: { type: String, required: true },
  // Village is left out or can be added as optional if you want to pre-fill later:
  // village: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Location', locationSchema);
