const express = require('express');
const router = express.Router();
const multer = require('multer');
const requireLogin = require('../middleware/requireLogin');
const { getProfile, updateProfile, uploadProfilePicture } = require('../controllers/profileController');

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}.${ext}`);
  },
});
const upload = multer({ storage });

// Get current profile
router.get('/', requireLogin, getProfile);

// Update profile info
router.patch('/', requireLogin, updateProfile);

// Upload profile picture
router.post('/upload-picture', requireLogin, upload.single('file'), uploadProfilePicture);

module.exports = router;
