const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout
} = require('../controllers/authController');

const requireLogin = require('../middleware/requireLogin');

// 📌 Register route
router.post('/register', register);

router.post('/login', login);

// 📌 customer login route
router.post('/customer/login',login);

router.post('/logout', requireLogin, logout);

module.exports = router;
