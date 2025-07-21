// routes/liveLocation.js
const express = require('express');
const router = express.Router();

const requireLogin = require('../middleware/requireLogin');
const liveLocationController = require('../controllers/liveLocationController');

router.post('/update-location', requireLogin, liveLocationController.updateLocation);
router.get('/all', requireLogin, liveLocationController.getAllLocations);

module.exports = router;
