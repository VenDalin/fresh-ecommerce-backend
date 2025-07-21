const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, default: null, sparse: true },
  phoneNumber: { type: String, required: true, unique: true }, // Keeps the E.164 format for backend
  displayPhoneNumber: { type: String }, // Add this field for storing original format
  password: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  role: { type: String, enum: ['superadmin', 'admin', 'delivery', 'customer'], default: 'customer' },
  isVerified: { type: Boolean, default: false },
  createdBy: { type: String, default: 'Customer' },
  profilePicture: { type: String, default: '' },
  permissions: {
    type: [String],
    default: []
  },
  token: { type: String, default: null },
  resetPasswordOtp: { type: String },
  resetPasswordOtpExpiry: { type: Date },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  status: { type: Boolean, default: true },
  updatedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
  country: { type: String, default: '' },
  province: { type: String, default: '' },
  district: { type: String, default: '' },
  commune: { type: String, default: '' },
  village: { type: String, default: '' },
}, { timestamps: true });

// Add a pre-save hook to normalize the displayPhoneNumber if not set
userSchema.pre('save', function(next) {
  // If displayPhoneNumber is not set, derive it from phoneNumber
  if (!this.displayPhoneNumber && this.phoneNumber) {
    // Convert from E.164 format to user-friendly format
    let number = this.phoneNumber;
    
    // Remove the leading + if present
    if (number.startsWith('+')) {
      number = number.substring(1);
    }
    
    // If it starts with country code (855), convert to local format
    if (number.startsWith('855')) {
      number = '0' + number.substring(3); // Replace 855 with 0
    }
    
    this.displayPhoneNumber = number;
  }

  // Set default permissions for customer role
  if (this.role === 'customer' && (!this.permissions || this.permissions.length === 0)) {
    this.permissions = [
      'read_product',
      'read_category',
      'create_customerorder',
      'read_customerorder',
      'update_customerorder',
      'create_order',
      'read_order',
      'read_transaction',
      'create_transaction',
      'update_transaction',
      'update_product',
      'read_user',
      'update_user',
      'read_stock', // Added permission to read stock information
    ];
  }
  
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // only hash if new or changed
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
