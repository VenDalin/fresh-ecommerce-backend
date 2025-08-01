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

// Helper function to format phone number to E.164 format
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle Cambodian phone numbers
  if (cleaned.startsWith('0')) {
    // Convert local format (0XX XXX XXX) to international (+855XX XXX XXX)
    return '+855' + cleaned.substring(1);
  } else if (cleaned.startsWith('855')) {
    // Already has country code, just add +
    return '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    // Assume it's a local number without leading 0
    return '+855' + cleaned;
  }
  
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
};

// Helper function to get display format from E.164
const getDisplayFormat = (e164Number) => {
  if (e164Number.startsWith('+855')) {
    return '0' + e164Number.substring(4);
  }
  return e164Number;
};

exports.register = async (req, res) => {
  try {
    const { phoneNumber, password, resetToken } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and password are required' 
      });
    }

    // Format the phone number to E.164 format
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const displayPhone = getDisplayFormat(formattedPhone);
    
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
        { displayPhoneNumber: displayPhone }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number already registered' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      phoneNumber: formattedPhone,
      displayPhoneNumber: displayPhone,
      password: hashedPassword,
      role: 'customer',
      isVerified: true,
      permissions: ['read_stock'] // Set default permissions
    });

    await user.save();

    // Generate token with permissions
    const token = jwt.sign(
      { _id: user._id, role: user.role, permissions: user.permissions },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '30d' }
    );

    // Save token to user document
    user.token = token;
    await user.save();

    // Prepare safe user object to return
    const userSafe = {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      displayPhoneNumber: user.displayPhoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      permissions: user.permissions || []
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful. You are now logged in!',
      user: userSafe,
      token,
      autoLogin: true
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { displayPhoneNumber, password } = req.body;
    
    console.log('Login attempt:', { displayPhoneNumber });
    
    if (!displayPhoneNumber || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Phone number and password are required' 
      });
    }

    // Format the input phone number
    const formattedPhone = formatPhoneNumber(displayPhoneNumber);
    const displayPhone = getDisplayFormat(formattedPhone);

    // Find user with multiple format attempts
    const user = await User.findOne({ 
      $or: [
        { displayPhoneNumber: displayPhoneNumber },
        { phoneNumber: displayPhoneNumber },
        { phoneNumber: formattedPhone },
        { displayPhoneNumber: displayPhone }
      ]
    }).select('+password +role +permissions');
    
    if (!user) {
      console.log('No user found with phone number:', displayPhoneNumber);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Ensure customer user has read_stock permission
    if (user.role === 'customer' && (!user.permissions || !user.permissions.includes('read_stock'))) {
      if (!user.permissions) user.permissions = [];
      user.permissions.push('read_stock');
    }
    
    const token = jwt.sign(
      { _id: user._id, role: user.role, permissions: user.permissions },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    // Store token in DB
    user.token = token;
    await user.save();

    const userSafe = {
      _id: user._id,
      name: user.name,
      displayPhoneNumber: user.displayPhoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      permissions: user.permissions || []
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userSafe,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token missing' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    user.token = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      clearLocalStorage: true
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed', 
      error: err.message 
    });
  }
};

// Send OTP for registration or password reset
exports.sendOtp = async (req, res) => {
  try {
    const { phoneNumber, purpose = 'registration' } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }

    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const displayPhone = getDisplayFormat(formattedPhone);
    
    console.log(`Sending OTP to: ${formattedPhone} (display: ${displayPhone}) for purpose: ${purpose}`);
    
    // Check user existence based on purpose
    const existingUser = await User.findOne({ 
      $or: [
        { phoneNumber: formattedPhone },
        { displayPhoneNumber: displayPhone }
      ] 
    });
    
    if (purpose === 'registration' && existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number already registered' 
      });
    }
    
    if (purpose === 'password_reset' && !existingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this phone number' 
      });
    }
    
    try {
      // Send OTP using Twilio Verify service
      const verification = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({ 
          to: formattedPhone, 
          channel: 'sms',
          locale: 'en' // You can change this to 'km' for Khmer if supported
        });
      
      console.log(`Verification initiated for ${formattedPhone}:`, {
        sid: verification.sid,
        status: verification.status,
        channel: verification.channel
      });
      
      // Create verification ID for tracking
      const verificationId = jwt.sign(
        { 
          phoneNumber: formattedPhone,
          displayPhoneNumber: displayPhone,
          purpose: purpose,
          verificationSid: verification.sid // Store Twilio's verification SID
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '10m' }
      );
      
      res.json({ 
        success: true, 
        message: 'Verification code sent successfully',
        verificationId,
        // Don't expose these in production
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            formattedPhone,
            verificationSid: verification.sid,
            status: verification.status
          }
        })
      });
      
    } catch (twilioError) {
      console.error('Twilio Verify error:', {
        message: twilioError.message,
        code: twilioError.code,
        status: twilioError.status
      });
      
      // Handle specific Twilio errors
      let errorMessage = 'Failed to send verification code';
      
      switch (twilioError.code) {
        case 60200:
          errorMessage = 'Invalid phone number format';
          break;
        case 60203:
          errorMessage = 'Phone number is not a valid mobile number';
          break;
        case 60205:
          errorMessage = 'SMS not supported for this phone number';
          break;
        case 60212:
          errorMessage = 'Too many attempts. Please try again later';
          break;
        default:
          if (process.env.NODE_ENV === 'development') {
            errorMessage = `Twilio error: ${twilioError.message}`;
          }
      }
      
      return res.status(400).json({ 
        success: false, 
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          twilioError: {
            code: twilioError.code,
            message: twilioError.message
          }
        })
      });
    }
    
  } catch (err) {
    console.error('Error initiating verification:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate verification' 
    });
  }
};

// Verify OTP for registration
exports.verifyOtp = async (req, res) => {
  try {
    const { verificationId, otp, password } = req.body;
    
    if (!verificationId || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification ID and OTP are required' 
      });
    }
    
    // Decode the verificationId
    let decodedToken;
    try {
      decodedToken = jwt.verify(verificationId, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification session' 
      });
    }
    
    const { phoneNumber, displayPhoneNumber, purpose } = decodedToken;
    
    // For registration, password is required
    if (purpose === 'registration' && !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required for registration' 
      });
    }
    
    try {
      // Verify OTP with Twilio
      const verificationCheck = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks
        .create({ 
          to: phoneNumber, 
          code: otp 
        });
      
      console.log('Verification check result:', {
        status: verificationCheck.status,
        valid: verificationCheck.valid
      });
      
      if (verificationCheck.status !== 'approved') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired verification code' 
        });
      }
      
      // Handle different purposes
      if (purpose === 'registration') {
        // Check if user already exists (double check)
        const existingUser = await User.findOne({ 
          $or: [
            { phoneNumber: phoneNumber },
            { displayPhoneNumber: displayPhoneNumber }
          ]
        });
        
        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'Phone number already registered' 
          });
        }
        
        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
          phoneNumber: phoneNumber,
          displayPhoneNumber: displayPhoneNumber,
          password: hashedPassword,
          role: 'customer',
          isVerified: true,
          permissions: ['read_stock']
        });
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
          { _id: user._id, role: user.role, permissions: user.permissions },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: '30d' }
        );

        // Store token in user document
        user.token = token;
        await user.save();

        const userSafe = {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          displayPhoneNumber: user.displayPhoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          permissions: user.permissions || []
        };

        return res.json({ 
          success: true, 
          message: 'Phone verified and user registered successfully',
          user: userSafe,
          token,
          autoLogin: true
        });
        
      } else if (purpose === 'password_reset') {
        // For password reset, create a confirmed reset token
        const resetToken = jwt.sign(
          { 
            phoneNumber: phoneNumber,
            purpose: 'password_reset_confirmed'
          },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: '15m' }
        );
        
        return res.json({ 
          success: true, 
          message: 'Phone verified successfully. You can now reset your password.',
          resetToken
        });
      }
      
    } catch (twilioError) {
      console.error('Verification check error:', twilioError);
      
      let errorMessage = 'Failed to verify code';
      
      switch (twilioError.code) {
        case 20404:
          errorMessage = 'Verification code has expired or is invalid';
          break;
        case 60202:
          errorMessage = 'Maximum check attempts reached';
          break;
        default:
          if (process.env.NODE_ENV === 'development') {
            errorMessage = `Twilio error: ${twilioError.message}`;
          }
      }
      
      return res.status(400).json({ 
        success: false, 
        message: errorMessage
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

// Initiate password reset with phone number (alternative to sendOtp for password reset)
exports.forgotPassword = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Use the sendOtp function for consistency
    req.body.purpose = 'password_reset';
    return exports.sendOtp(req, res);
    
  } catch (err) {
    console.error('Password reset initiation failed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate password reset'
    });
  }
};

// Verify OTP and update password (combined function)
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

    // First verify the OTP
    const verifyResult = await new Promise((resolve) => {
      const mockReq = { body: { verificationId, otp } };
      const mockRes = {
        json: (data) => resolve(data),
        status: (code) => ({ json: (data) => resolve({ ...data, statusCode: code }) })
      };
      exports.verifyOtp(mockReq, mockRes);
    });

    if (!verifyResult.success) {
      return res.status(verifyResult.statusCode || 400).json(verifyResult);
    }

    // If verification successful and we have a resetToken, proceed with password reset
    if (verifyResult.resetToken) {
      const resetReq = { 
        body: { 
          resetToken: verifyResult.resetToken, 
          newPassword 
        } 
      };
      return exports.resetPassword(resetReq, res);
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid verification result'
    });

  } catch (err) {
    console.error('Password reset verification failed:', err);
    res.status(500).json({
      success: false,
      message: 'Verification failed due to a server error'
    });
  }
};

// Reset password with verified token
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
        message: 'Reset session expired or invalid' 
      });
    }
    
    if (decoded.purpose !== 'password_reset_confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset token' 
      });
    }
    
    const phoneNumber = decoded.phoneNumber;
    
    // Find user
    const user = await User.findOne({ 
      $or: [
        { phoneNumber: phoneNumber },
        { displayPhoneNumber: getDisplayFormat(phoneNumber) }
      ] 
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    // Generate new authentication token
    const token = jwt.sign(
      { _id: user._id, role: user.role, permissions: user.permissions },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );
    
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
        isVerified: user.isVerified,
        permissions: user.permissions
      }
    });
  } catch (err) {
    console.error('Password reset failed:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Password reset failed'
    });
  }
};