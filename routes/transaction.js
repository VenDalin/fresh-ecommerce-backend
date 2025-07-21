
const router = require('express').Router();
const transactionController = require('../controllers/transactionController');
const requireLogin = require('../middleware/requireLogin');
const { confirmTransaction } = require('../controllers/transactionController');

router.post('/generate-qr', transactionController.generateQR);
router.get('/:id', transactionController.getTransaction);
router.post('/webhook', transactionController.handleWebhook);
router.patch('/update-status/:id', requireLogin, transactionController.updateStatus);
router.post('/update-scanned', transactionController.updateScanned);
router.get('/confirm', confirmTransaction);


module.exports = router;
