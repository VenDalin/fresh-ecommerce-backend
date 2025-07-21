const axios = require('axios');
const Transaction = require('../models/transactions');
const System = require('../models/system');
const { findOrCreateGuestUser } = require('../utils/userHelpers');

const bakongKhqr = require('bakong-khqr');
const { IndividualInfo } = require('bakong-khqr/src/model/information');
const { khqrData } = require('bakong-khqr/src/constant');

exports.generateQR = async (req, res) => {
  try {
    const {
      amount,
      name,
      password,
      currentLocation,
      phoneNumber = null,
      currency = 'KHR',
      accountId = process.env.BAKONG_ACCOUNT_ID,
      storeLabel = 'Ecommerce',
      terminalLabel = 'Web Payment',
      billNumber = `BILL${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      callbackUrl = process.env.QR_SCAN_CALLBACK_URL || null,
      orderId = null,
    } = req.body;

    console.log('Received request data:', {
      amount,
      name,
      currentLocation,
      phoneNumber,
      currency,
      accountId,
      storeLabel,
      terminalLabel,
      billNumber
    });

    // Validation checks
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    if (!name || !password || !currentLocation) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!accountId) {
      return res.status(500).json({ message: 'Missing BAKONG_ACCOUNT_ID in env or request' });
    }
    if (!['KHR', 'USD'].includes(currency.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid currency. Only KHR and USD are supported' });
    }

    // Restore guest user logic
    const guest = await findOrCreateGuestUser({ 
      name, 
      phoneNumber: phoneNumber || 'unknown',
      password, 
      currentLocation 
    });
    const userId = guest._id;
    const customerId = guest._id;

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
      // Create IndividualInfo with proper validation
      const individualInfoData = {
        currency: khqrData.currency.khr,
        amount: Math.round(amount),
        billNumber,
        storeLabel,
        terminalLabel,
        mobileNumber: phoneNumber,
        expirationTimestamp: expiresAt.getTime(),
        merchantCategoryCode: "5999"
      };

      console.log('Creating IndividualInfo with data:', {
        accountId,
        name,
        currentLocation,
        ...individualInfoData
      });

      const individualInfo = new IndividualInfo(
        accountId,
        name,
        currentLocation,
        individualInfoData
      );

      console.log('IndividualInfo created successfully:', individualInfo);

      // Create BakongKHQR instance
      const khqr = new bakongKhqr.BakongKHQR();
      console.log('BakongKHQR instance created');

      // Generate QR code
      const response = khqr.generateIndividual(individualInfo);
      console.log('QR Generation response:', {
        success: !!response,
        hasData: !!(response && response.data),
        hasQR: !!(response && response.data && response.data.qr)
      });

      if (!response || !response.data || !response.data.qr) {
        console.error('Invalid QR generation response:', response);
        throw new Error('Failed to generate QR code data: Invalid response structure');
      }

      const qrCodeData = response.data.qr;
      console.log('QR code data generated successfully');

      // Create transaction record
      const tx = await Transaction.create({
        userId,
        customerId,
        orderId: orderId || null,
        fromAccountId: null,
        toAccountId: accountId,
        amount,
        currency,
        qrCodeUrl: qrCodeData,
        bakongRefId: billNumber,
        paymentMethod: 'bakong',
        transactionType: 'checkout',
        paymentStatus: 'pending',
        qrExpiresAt: expiresAt,
        status: true,
        createdBy: userId,
        callbackUrl: callbackUrl
      })
    

      console.log('Transaction created successfully:', {
        id: tx._id,
        bakongRefId: tx.bakongRefId,
        amount: tx.amount,
        currency: tx.currency
      });

      return res.status(201).json({
        message: '✅ QR generated successfully',
        data: tx,
        expiresAt,
        callbackUrl: tx.callbackUrl
      });

    } catch (qrError) {
      console.error('QR Generation Error Details:', {
        message: qrError.message,
        stack: qrError.stack,
        name: qrError.name
      });
      return res.status(500).json({ 
        message: 'Failed to generate QR code', 
        error: qrError.message,
        details: qrError.stack
      });
    }

  } catch (err) {
    console.error('Transaction Error:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return res.status(500).json({ 
      message: 'QR generation failed', 
      error: err.message,
      details: err.stack
    });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    return res.status(200).json(transaction);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get transaction', error: err.message });
  }
};

// 1. Handle Bakong/bank webhook (payment confirmation)
exports.handleWebhook = async (req, res) => {
  try {
    // Example: Extract transaction reference and payer account from webhook payload
    const { bakongRefId, fromAccountId, paymentStatus } = req.body;
    const tx = await Transaction.findOneAndUpdate(
      { bakongRefId },
      {
        paymentStatus: paymentStatus || 'paid',
        fromAccountId,
        updatedAt: new Date(),
        paidAt: paymentStatus === 'paid' ? new Date() : null
      },
      { new: true }
    );
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    return res.status(200).json({ message: 'Transaction updated', data: tx });
  } catch (err) {
    return res.status(500).json({ message: 'Webhook error', error: err.message });
  }
};

// 2. Admin/manual update of payment status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const tx = await Transaction.findByIdAndUpdate(
      id,
      { paymentStatus, updatedAt: new Date() },
      { new: true }
    );
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    return res.status(200).json({ message: 'Status updated', data: tx });
  } catch (err) {
    return res.status(500).json({ message: 'Update status error', error: err.message });
  }
};

// 3. Record QR scan event (for analytics/UI)
exports.updateScanned = async (req, res) => {
  try {
    const { transactionId, scannerInfo } = req.body;
    const tx = await Transaction.findByIdAndUpdate(
      transactionId,
      { scannedAt: new Date(), scannerInfo },
      { new: true }
    );
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    return res.status(200).json({ message: 'Scan recorded', data: tx });
  } catch (err) {
    return res.status(500).json({ message: 'Scan update error', error: err.message });
  }
};


exports.confirmTransaction = async (req, res) => {
  const userId = req.user._id;
  const trx = await Transaction.findOne({
    userId,
    paymentStatus: 'paid'
  }).sort({ paidAt: -1 });

  if (!trx) {
    return res.status(400).json({ success: false, message: 'No confirmed payment found.' });
  }

  return res.json({ success: true, data: trx });
};

