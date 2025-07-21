
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ timestamp: Date.now() });
});

module.exports = router;
