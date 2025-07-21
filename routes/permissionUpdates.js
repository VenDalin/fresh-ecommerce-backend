const express = require('express');
const router = express.Router();
const User = require('../models/user');
const requireLogin = require('../middleware/requireLogin');
const checkRole = require('../middleware/checkRole');

/**
 * Update permissions for all users of a specific role
 * @route POST /api/system/update-role-permissions
 * @access Admin/SuperAdmin
 */
router.post('/update-role-permissions', requireLogin, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { role, permissionsToAdd, permissionsToRemove } = req.body;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }
    
    if ((!permissionsToAdd || !permissionsToAdd.length) && (!permissionsToRemove || !permissionsToRemove.length)) {
      return res.status(400).json({
        success: false,
        message: 'At least one permission to add or remove is required'
      });
    }
    
    // Find all users with the specified role
    const users = await User.find({ role });
    
    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: `No users found with role: ${role}`
      });
    }
    
    let updatedCount = 0;
    
    // Update each user's permissions
    for (const user of users) {
      let updated = false;
      
      // Initialize permissions array if it doesn't exist
      if (!user.permissions) {
        user.permissions = [];
      }
      
      // Add permissions
      if (permissionsToAdd && permissionsToAdd.length) {
        for (const permission of permissionsToAdd) {
          if (!user.permissions.includes(permission)) {
            user.permissions.push(permission);
            updated = true;
          }
        }
      }
      
      // Remove permissions
      if (permissionsToRemove && permissionsToRemove.length) {
        for (const permission of permissionsToRemove) {
          const index = user.permissions.indexOf(permission);
          if (index !== -1) {
            user.permissions.splice(index, 1);
            updated = true;
          }
        }
      }
      
      // Save if permissions were updated
      if (updated) {
        await user.save();
        updatedCount++;
      }
    }
    
    return res.json({
      success: true,
      message: `Successfully updated permissions for ${updatedCount} out of ${users.length} users with role '${role}'`
    });
    
  } catch (error) {
    console.error(`Error updating role permissions: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
