// app/routes/apiRoutes/index.js
const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('@middleware/authenticateApiKey');

// Apply API key authentication to all API routes
router.use(authenticateApiKey);

// Import API route handlers
const botRoutes = require('./bot');
const qrRoutes = require('./qr');

/**
 * @swagger
 * tags:
 *   name: API - Bot
 *   description: Endpoints for communication with the Telegram bot serverless function.
 */
/**
 * @swagger
 * tags:
 *   name: API - QR
 *   description: Endpoints for retrieving QR code information.
 */

// Define API routes
router.use('/bot', botRoutes);
router.use('/qr', qrRoutes);

module.exports = router;
