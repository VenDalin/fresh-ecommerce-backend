const express = require('express');
const router = express.Router();
const System = require('../models/system');

router.post('/', async (req, res) => {
  try {
    const data = await System.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const config = await System.findOne();
    res.status(200).json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
