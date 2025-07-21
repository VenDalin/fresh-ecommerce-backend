/**
 * Script to update all customer users with stock update permissions
 * Run this with: node scripts/updateCustomerPermissions.js
 */
const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

async function updateCustomerPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');
    
    // Find all customers
    const customers = await User.find({ role: 'customer' });
    console.log(`Found ${customers.length} customer accounts`);
    
    let updated = 0;
    
    // Update each customer
    for (const customer of customers) {
      // Initialize permissions array if it doesn't exist
      if (!customer.permissions) {
        customer.permissions = [];
      }
      
      // Add permissions if they don't exist
      const newPermissions = ['update_stock', 'update_product'];
      let customerUpdated = false;
      
      for (const permission of newPermissions) {
        if (!customer.permissions.includes(permission)) {
          customer.permissions.push(permission);
          customerUpdated = true;
        }
      }
      
      if (customerUpdated) {
        await customer.save();
        updated++;
        console.log(`Updated user: ${customer._id} (${customer.displayPhoneNumber || customer.phoneNumber})`);
      }
    }
    
    console.log(`Updated ${updated} customers with new permissions`);
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Error updating customer permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateCustomerPermissions();
