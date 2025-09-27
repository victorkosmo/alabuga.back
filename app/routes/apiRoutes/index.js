// app/routes/apiRoutes/index.js
const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('@middleware/authenticateApiKey');

// Apply API key authentication to all API routes
router.use(authenticateApiKey);

// Import API route handlers
const botRoutes = require('./bot');

/**
 * @swagger
 * tags:
 *   name: API - Bot
 *   description: Endpoints for communication with the Telegram bot serverless function.
 */

// Define API routes
router.use('/bot', botRoutes);

module.exports = router;
