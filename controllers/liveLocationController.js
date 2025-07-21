// controllers/liveLocationController.js
const User = require('../models/user');

// 📍 Update user's location in DB
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    req.user.latitude = latitude;
    req.user.longitude = longitude;
    await req.user.save();

    res.json({ message: 'Location updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update location', error: err.message });
  }
};

// 📍 Get all users with valid locations
exports.getAllLocations = async (req, res) => {
  try {
    const users = await User.find({
      latitude: { $ne: null },
      longitude: { $ne: null }
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get live users', error: err.message });
  }
};
