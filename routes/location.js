const express = require('express');
const router = express.Router();
const Location = require('../models/location');

// GET /api/locations - fetch all locations
router.get('/', async (req, res) => {
  try {
    const locations = await Location.find().sort({ province: 1, district: 1, commune: 1 });
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
});

module.exports = router;
