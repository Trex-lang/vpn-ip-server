const express = require('express');
const PaymentService = require('../services/payment');
const DatabaseService = require('../services/database');
const logger = require('../services/logger');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Initiate payment for an IP address
router.post('/initiate', authMiddleware, async (req, res) => {
  try {
    const { location, durationMonths } = req.body;
    if (!location) return res.status(400).json({ error: 'Location is required' });
    const payment = await PaymentService.createPayment(req.user.userId, location, durationMonths || 1);
    res.json(payment);
  } catch (error) {
    logger.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// Check payment status
router.get('/status/:paymentId', authMiddleware, async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const status = await PaymentService.getPaymentStatus(paymentId);
    res.json(status);
  } catch (error) {
    logger.error('Payment status error:', error);
    res.status(500).json({ error: 'Payment status check failed' });
  }
});

// List user payments
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const payments = await PaymentService.getUserPayments(req.user.userId);
    res.json(payments);
  } catch (error) {
    logger.error('List user payments error:', error);
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

module.exports = router; 