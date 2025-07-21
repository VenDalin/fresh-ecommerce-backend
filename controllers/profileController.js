const User = require('../models/user');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { profilePicture: imageUrl }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to upload profile picture' });
  }
};
