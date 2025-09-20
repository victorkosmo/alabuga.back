const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('@middleware/authenticateApiKey');

// Apply API key authentication to all API routes
router.use(authenticateApiKey);

// Import API route handlers
const getUserCount = require('./users/count');

// Define API routes
router.get('/users/count', getUserCount);

module.exports = router;
