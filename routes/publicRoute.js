const express = require('express');
const router = express.Router();
const getDataController = require('../controllers/getDataController');

// Example Controller Function
router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Public route working!' });
});

// ✅ No auth required - Public endpoints
router.get('/products', getDataController.getPublicProducts);
router.get('/promotion', getDataController.getPublicPromotion);

module.exports = router;
