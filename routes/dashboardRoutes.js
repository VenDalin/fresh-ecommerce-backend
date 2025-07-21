const express = require('express')
const router = express.Router()
const DashboardController = require('../controllers/DashboardController')

// Optionally you can protect with auth middleware
// const authenticate = require('../middleware/authenticate')

router.get('/data', DashboardController.getDashboardData)

module.exports = router
