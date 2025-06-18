const express = require('express');
const IPService = require('../services/ip');
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

// List available locations
router.get('/locations', async (req, res) => {
  try {
    const locations = await IPService.getAvailableLocations();
    res.json(locations);
  } catch (error) {
    logger.error('List locations error:', error);
    res.status(500).json({ error: 'Failed to list locations' });
  }
});

// List user's allocated IPs
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const ips = await IPService.getUserIPAddresses(req.user.userId);
    res.json(ips);
  } catch (error) {
    logger.error('List user IPs error:', error);
    res.status(500).json({ error: 'Failed to list user IPs' });
  }
});

// Get IP statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await IPService.getIPStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('IP stats error:', error);
    res.status(500).json({ error: 'Failed to get IP stats' });
  }
});

module.exports = router; 