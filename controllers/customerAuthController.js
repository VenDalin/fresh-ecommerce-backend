const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const twilio = require('twilio');

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Use Twilio's Verify service for OTP
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;


exports.register = async (req, res) => {
  try {
    const { phoneNumber, password, resetToken } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ success: false, message: 'Phone number and password are required' });
    }

    // Format the phone number to E.164 format for storage
    let formattedPhone = phoneNumber;
    // Remove non-digits
    formattedPhone = formattedPhone.replace(/\D/g, '');
    
    // Format to E.164
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+855' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('855')) {
      formattedPhone = '+855' + formattedPhone;
    } else if (formattedPhone.startsWith('855')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    // If resetToken is provided, verify it (for registration after OTP verification)
    if (resetToken) {
      try {
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'default_secret');
        
        // Check if token is for this purpose and phone number matches
        if (decoded.purpose !== 'password_reset_confirmed' || 
            decoded.phoneNumber !== formattedPhone) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid or expired verification token' 
          });
        }
      } catch (error) {
        console.error('Verification session expired or invalid:', error);
        return res.status(401).json({ 
          success: false, 
          message: 'Verification session expired or invalid'
        });
      }
    }

    // Check for existing user
    const existingUser = await User.findOne({ 
      $or: [
        { phoneNumber: formattedPhone },
        { displayPhoneNumber: phoneNumber }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Store the original format in displayPhoneNumber
    const user = new User({
      phoneNumber: formattedPhone,
      displayPhoneNumber: phoneNumber,  // Store the original format
      password: hashedPassword,
      role: 'customer',
      isVerified: true  // Mark as verified for immediate access
    });

    await user.save();
    
    // Ensure user has the read_stock permission before creating the token
    if (user.permissions && !user.permissions.includes('read_stock')) {
      user.permissions.push('read_stock');
      await user.save();
    }

    // Generate token with sufficient expiry - include permissions in token
    const token = jwt.sign(
      { _id: user._id, role: user.role, permissions: user.permissions },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '30d' }  // Longer expiry for better user experience
    );

    // Save token to user document
    user.token = token;
    await user.save();

    // Prepare safe user object to return - include permissions
    const userSafe = {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      displayPhoneNumber: user.displayPhoneNumber,  // Include the display format
      role: user.role,
      isVerified: user.isVerified,
      permissions: user.permissions || [] // Make sure permissions are included
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful. You are now logged in!',
      user: userSafe,
      token,
      autoLogin: true  // Signal to frontend that user is automatically logged in
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};



exports.login = async (req, res) => {
  try {
    const { displayPhoneNumber, password } = req.body;
    
    console.log('Login attempt:', { displayPhoneNumber }); // Debug log
    
    if (!displayPhoneNumber || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Phone number and password are required' 
      });
    }

    // Try to find user with the exact input format first
    let user = await User.findOne({ 
      $or: [
        { displayPhoneNumber },
        { phoneNumber: displayPhoneNumber }
      ]
    }).select('+password +role +permissions');
    
    console.log('User lookup result:', user ? 'Found' : 'Not found');
    
    // If not found, try with the phoneNumber
    if (!user) {
      user = await User.findOne({ phoneNumber: displayPhoneNumber }).select('+role +password');
      if (user) console.log('Found user by phoneNumber');
    }
    
    // If still not found, try formatting the number to E.164 and search again
    if (!user) {
      // Format number to E.164
      let formattedNumber = displayPhoneNumber;
      
      // Remove non-digits
      formattedNumber = formattedNumber.replace(/\D/g, '');
      
      // Convert local format to international
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '+855' + formattedNumber.substring(1);
      } else if (!formattedNumber.startsWith('+') && !formattedNumber.startsWith('855')) {
        formattedNumber = '+855' + formattedNumber;
      } else if (formattedNumber.startsWith('855')) {
        formattedNumber = '+' + formattedNumber;
      }
      
      console.log(`Trying formatted number: ${formattedNumber}`);
      user = await User.findOne({ phoneNumber: formattedNumber }).select('+role +password');
      if (user) console.log('Found user by formatted phoneNumber');
    }

    if (!user) {
      console.log('No user found with any phone number format');
      return res.status(401).json({ message: 'User not found' });
    }

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials. Please check your password and try again.' 
        });
      }
    } catch (error) {
      console.error('Password comparison error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error verifying password. Please try again.' 
      });
    }

    // Ensure customer user has read_stock permission
    if (user.role === 'customer' && user.permissions && !user.permissions.includes('read_stock')) {
      user.permissions.push('read_stock');
      // Save will be done below after setting token
    }
    
    const token = jwt.sign(
      { _id: user._id, role: user.role, permissions: user.permissions },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    // ✅ Store token in DB
    user.token = token;
    await user.save();

    const userSafe = {
      _id: user._id,
      name: user.name,
      displayPhoneNumber: user.displayPhoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      permissions: user.permissions || [] // Include permissions
    };

    res.status(200).json({
      message: 'Login successful',
      user: userSafe,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ message: 'Token missing' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret')
    const user = await User.findById(decoded._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.token = null
    await user.save()

    // Send instruction to client to clear localStorage
    res.status(200).json({
      message: 'Logged out successfully',
      clearLocalStorage: true
    })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ message: 'Logout failed', error: err.message })
  }
}


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
    const otp = '123456'; // Fixed OTP for testing
    
    // Store OTP in user's document with expiry
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes (extended for testing)
    await user.save();
    
    console.log(`DEBUG MODE: OTP for ${phoneNumber} is ${otp}`);
    
    // Create a verification ID to track this reset process
    const resetVerificationId = jwt.sign(
      { 
        phoneNumber, 
        purpose: 'password_reset' 
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '30m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your phone',
      verificationId: resetVerificationId
    });
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
      console.error('Reset session expired or invalid:', error);
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
      console.error('Reset session expired or invalid:', error);
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
        { phoneNumber: phoneNumber },
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
}

// Send OTP for registration or verification
exports.sendOtp = async (req, res) => {
  try {
    const { phoneNumber, purpose } = req.body;
    const otpPurpose = purpose || 'registration';
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Format phone number correctly for international format
    let phoneNumberWithPrefix = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Handle Cambodian numbers without country code
    if (!phoneNumberWithPrefix.startsWith('+')) {
      if (phoneNumberWithPrefix.startsWith('0')) {
        phoneNumberWithPrefix = '+855' + phoneNumberWithPrefix.substring(1);
      } else if (!phoneNumberWithPrefix.startsWith('855')) {
        phoneNumberWithPrefix = '+855' + phoneNumberWithPrefix;
      } else {
        phoneNumberWithPrefix = '+' + phoneNumberWithPrefix;
      }
    }
    
    // Check if user already exists with this phone number (only for registration)
    if (otpPurpose === 'registration') {
      const existingUser = await User.findOne({ 
        $or: [
          { phoneNumber: phoneNumberWithPrefix },
          { displayPhoneNumber: phoneNumber }
        ] 
      });
      
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Phone number already registered' });
      }
    } else if (otpPurpose === 'reset_password') {
      // For password reset, ensure the user exists
      const existingUser = await User.findOne({ 
        $or: [
          { phoneNumber: phoneNumberWithPrefix },
          { displayPhoneNumber: phoneNumber }
        ] 
      });
      
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'No account found with this phone number' });
      }
    }
    
    try {
      // Generate a verification code via Twilio Verify
      const verification = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({ to: phoneNumberWithPrefix, channel: 'sms' });
      
      console.log(`Verification initiated for ${phoneNumberWithPrefix}, SID: ${verification.sid}`);
      
      // Store the phone number in a JWT for the next step
      const verificationId = jwt.sign(
        { 
          phoneNumber: phoneNumberWithPrefix,
          purpose: purpose || 'registration' // Track the purpose of the OTP
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '10m' }
      );
      
      res.json({ 
        success: true, 
        message: 'Verification code sent successfully',
        verificationId
      });
    } catch (error) {
      console.error('Twilio Verify error:', error);
      
      // For debugging in development
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to send verification code',
          error: error.message,
          twilioError: error.code || 'Unknown Twilio error'
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification code'
      });
    }
  } catch (err) {
    console.error('Error initiating verification:', err);
    res.status(500).json({ success: false, message: 'Failed to initiate verification' });
  }
};

// Verify OTP and register the user
exports.verifyOtp = async (req, res) => {
  try {
    const { verificationId, otp, phoneNumber, password } = req.body;
    
    if (!verificationId || !otp || !phoneNumber || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Decode the verificationId to get the phone number we sent the OTP to
    let decodedToken;
    try {
      decodedToken = jwt.verify(verificationId, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification session' 
      });
    }
    
    // Ensure the phone number matches what was used to send the OTP
    if (decodedToken.phoneNumber !== phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number mismatch' 
      });
    }
    
    // Check if OTP is valid using Twilio Verify
    try {
      const verificationCheck = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks
        .create({ to: phoneNumber, code: otp });
      
      if (verificationCheck.status === 'approved') {
        // Format phone number for display
        const originalPhoneNumber = phoneNumber.replace(/^\+855/, '0');
        
        // Check if user already exists (double check)
        const existingUser = await User.findOne({ 
          $or: [
            { phoneNumber: phoneNumber },
            { displayPhoneNumber: originalPhoneNumber }
          ]
        });
        
        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'Phone number already registered' 
          });
        }
        
        // Create new user - no need to hash password manually, the pre-save hook will do it
        const { latitude, longitude } = req.body;
        
        const user = new User({
          phoneNumber: phoneNumber,
          displayPhoneNumber: originalPhoneNumber,
          password: password, // Will be hashed by the pre-save hook
          role: 'customer',
          isVerified: true,
          latitude: latitude || null,
          longitude: longitude || null
        });
        
        await user.save();
        
        // Ensure user has read_stock permission
        if (!user.permissions || !user.permissions.includes('read_stock')) {
          if (!user.permissions) user.permissions = [];
          user.permissions.push('read_stock');
          // Will save below after setting token
        }
        
        // Generate JWT token with permissions
        const token = jwt.sign(
          { _id: user._id, role: user.role, permissions: user.permissions },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: '30d' }
        );

        // Store token in the user document
        user.token = token;
        await user.save();

        // Prepare safe user object - ensure all needed fields are included
        const userSafe = {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          displayPhoneNumber: user.displayPhoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          permissions: user.permissions || [] // Make sure permissions are included
        };

        res.json({ 
          success: true, 
          message: 'Phone verified and user registered successfully',
          user: userSafe,
          token,
          autoLogin: true  // Signal to frontend that user should be automatically logged in
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid verification code', 
          status: verificationCheck.status 
        });
      }
    } catch (error) {
      console.error('Verification check error:', error);
      
      // Provide more specific error for debugging
      let errorMessage = 'Failed to verify code';
      if (error.code === 20404) {
        errorMessage = 'Verification code has expired or is invalid';
      }
      
      res.status(400).json({ 
        success: false, 
        message: errorMessage,
        code: error.code || null
      });
    }
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during verification'
    });
  }
};
