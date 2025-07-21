const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user');
const rolePermissions = require('../config/rolePermissions');

dotenv.config();

const assignPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find();

    for (const user of users) {
      const role = user.role;
      const defaultPermissions = rolePermissions[role];

      if (!defaultPermissions) {
        console.warn(`⚠️ No permissions defined for role: ${role}`);
        continue;
      }

      // Only update if permissions are empty or outdated
      const isDifferent = !user.permissions || user.permissions.sort().join(',') !== defaultPermissions.sort().join(',');

      if (isDifferent) {
        user.permissions = defaultPermissions;
        await user.save();
        console.log(`🔄 Updated permissions for ${user.name} (${role})`);
      } else {
        console.log(`✅ Permissions already up-to-date for ${user.name} (${role})`);
      }
    }

    console.log('🎉 Done assigning permissions!');
    process.exit();
  } catch (err) {
    console.error('❌ Error assigning permissions:', err.message);
    process.exit(1);
  }
};

assignPermissions();
