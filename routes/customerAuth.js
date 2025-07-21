const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  logout,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
  sendOtp,
  verifyOtp
} = require('../controllers/customerAuthController');

const requireLogin = require('../middleware/requireLogin');

// Customer auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', requireLogin, logout);

// Registration flow
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Password reset flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyPasswordResetOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
