const express = require('express');
const multer = require('multer');
const useDataController = require('../controllers/useDataController');
const getDataController = require('../controllers/getDataController');
const checkRole = require('../middleware/checkRole');
const jwt = require('jsonwebtoken');

//  Allowed roles — adjust as needed
const allowedRoles = ['admin', 'superadmin', 'delivery', 'customer'];

// ────────────────────────────────
// 🗂 Multer config for ZIP upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const fileName = file.originalname.endsWith('.zip')
      ? file.originalname
      : `${file.originalname}.zip`;
    cb(null, `${Date.now()}-${fileName}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
    cb(null, true);
  } else {
    cb(new Error('Only zip files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const router = express.Router();

// ────────────────────────────────
//  Protected Routes with checkRole
//  You can use /api/getAllDocs/User to fetch all users from the user collection
router.post('/insertDoc/:collectionName', checkRole(allowedRoles), useDataController.insertDoc);
router.get('/getNextId/:collectionName/:branchId', checkRole(allowedRoles), useDataController.getNextDocId);
router.patch('/updateDoc/:collectionName/:id', checkRole(allowedRoles), useDataController.updateDoc);
router.delete('/deleteDoc/:collectionName/:id', checkRole(allowedRoles), useDataController.deleteDoc);
router.get('/getAllDocs/:collectionName', checkRole(allowedRoles), getDataController.getAllDocs);
router.get('/getPagination', checkRole(allowedRoles), getDataController.getPagination);

// ────────────────────────────────
//  Public Route (no token needed)
router.get('/public/products', getDataController.getPublicProducts);

// ────────────────────────────────
//  Optional legacy or dev routes
// router.get('/getPagination2', getDataController.getPagination2);

module.exports = router;
