const express = require('express');
const router = express.Router();
const requireLogin = require('../middleware/requireLogin');

// ✅ Use your existing controller
const {
  insertDoc,
  updateDoc,
  deleteDoc,
  getAllDocs,
  getPagination,
  getDocByMultipleId
} = require('../controllers/getDataController');

// Use the same controller, but specify collectionName = Order via URL or request body

// Example route to create an order
router.post('/create', requireLogin, (req, res, next) => {
  req.params.collectionName = 'Order';
  insertDoc(req, res, next);
});

// You can add other routes similarly
router.get('/list', requireLogin, (req, res, next) => {
  req.params.collectionName = 'Order';
  getAllDocs(req, res, next);
});

router.get('/', requireLogin, (req, res, next) => {
  req.params.collectionName = 'Order';
  getAllDocs(req, res, next);
});

module.exports = router;
