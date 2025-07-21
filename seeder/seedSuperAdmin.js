const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const exists = await User.findOne({ role: 'superadmin' });
    if (exists) {
      console.log('⚠️ Superadmin already exists');
      process.exit();
    }

    const superadmin = await User.create({
      name: 'Super Admin',
      phoneNumber: '12345678',
      displayPhoneNumber: '012345678',
      password: '12345678',
      role: 'superadmin',
      permissions: ['ALL'],
      createdBy: 'system',
      isVerified: true
    });

    console.log('✅ Superadmin created:', superadmin.phoneNumber);
    process.exit();
  } catch (err) {
    console.error('❌ Failed to seed superadmin:', err.message);
    process.exit(1);
  }
};

seedSuperAdmin();
