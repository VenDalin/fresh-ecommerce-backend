const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');


exports.register = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ success: false, message: 'Phone number and password are required' });
    }

    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      phoneNumber,
      password: hashedPassword,
      role: 'customer', // ✅ assign customer role by default
      isVerified: false
    });

    await user.save();

    // generate token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    user.token = token;
    await user.save();

    const userSafe = {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: userSafe,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};



exports.login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password)
      return res.status(400).json({ message: 'Phone and password required' });

    const user = await User.findOne({ phoneNumber }).select('+role +password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Wrong password' });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    // ✅ Store token in DB
    user.token = token;
    await user.save();

    const userSafe = {
      _id: user._id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified
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