const express = require('express');
const router = express.Router();
const { 
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword
} = require('../controllers/passwordReset');

// Password reset flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyPasswordResetOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
