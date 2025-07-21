const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Initiate the password reset process with phone number
exports.forgotPassword = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    console.log(`Received forgot password request for phone: ${phoneNumber}`);

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Find the user with this phone number
    const user = await User.findOne({ 
      $or: [
        { phoneNumber },
        { displayPhoneNumber: phoneNumber.replace('+855', '0') }
      ] 
    });

    if (!user) {
      console.log(`No user found with phone number: ${phoneNumber}`);
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number'
      });
    }

    console.log(`User found: ${user.name}, creating OTP`);

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in user's document with expiry
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    await user.save();
    
    // Send SMS using Twilio
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      
      if (!accountSid || !authToken || !twilioPhone) {
        throw new Error('Twilio credentials not configured');
      }

      const client = require('twilio')(accountSid, authToken);
      
      await client.messages.create({
        body: `Your OTP for password reset is: ${otp}. This code will expire in 5 minutes.`,
        from: twilioPhone,
        to: phoneNumber
      });

      console.log(`SMS sent successfully to ${phoneNumber}`);
    } catch (smsError) {
      console.error('Failed to send SMS:', smsError);
      throw new Error('Failed to send OTP via SMS');
    
    }
  } catch (err) {
    console.error('Password reset initiation failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate password reset',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Verify OTP and update password
exports.verifyPasswordResetOtp = async (req, res) => {
  try {
    const { verificationId, otp, newPassword } = req.body;

    if (!verificationId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Verification ID, OTP and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Verify the verification ID
    let decoded;
    try {
      decoded = jwt.verify(verificationId, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Reset session expired or invalid. Please restart the password reset process.'
      });
    }

    // Check if this token was meant for password reset
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token purpose'
      });
    }

    const phoneNumber = decoded.phoneNumber;

    // Find user with the phone number
    const user = await User.findOne({
      $or: [
        { phoneNumber },
        { displayPhoneNumber: phoneNumber.replace('+855', '0') }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For testing, accept any OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`DEBUG: Accepting any OTP for testing`);
      // Proceed with password reset
    } else {
      // Verify OTP
      if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP code'
        });
      }

      // Check OTP expiry
      if (!user.resetPasswordOtpExpiry || user.resetPasswordOtpExpiry < Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiry = undefined;
    await user.save();

    // Generate new authentication token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    // Save token to database
    user.token = token;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        displayPhoneNumber: user.displayPhoneNumber,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('OTP verification failed:', err);
    res.status(500).json({
      success: false,
      message: 'Verification failed due to a server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Reset password with verified OTP
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Reset session expired or invalid. Please restart the password reset process.' 
      });
    }
    
    // Check if this token was meant for confirmed password reset
    if (decoded.purpose !== 'password_reset_confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset token purpose' 
      });
    }
    
    const phoneNumber = decoded.phoneNumber;
    
    // Find user with the phone number
    const user = await User.findOne({ 
      $or: [
        { phoneNumber },
        { displayPhoneNumber: phoneNumber.replace('+855', '0') }
      ] 
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Update password (don't hash manually, let model middleware handle it)
    user.password = newPassword;
    await user.save();
    
    // Generate new authentication token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );
    
    // Save token to database
    user.token = token;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        displayPhoneNumber: user.displayPhoneNumber,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('Password reset failed:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Password reset failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
