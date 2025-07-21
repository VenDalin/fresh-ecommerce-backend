const User = require('../models/user');
const bcrypt = require('bcrypt');

// 🔍 Create or find a guest user by phone number
exports.findOrCreateGuestUser = async ({ name, phoneNumber, password, currentLocation }) => {
  let user = await User.findOne({ phoneNumber });

  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      phoneNumber,
      password: hashedPassword,
      role: 'customer',
      createdBy: 'guest',
      isVerified: false,
      currentLocation,
    });
  }

  return user;
};
