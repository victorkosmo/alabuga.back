// app/routes/apiRoutes/index.js
const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('@middleware/authenticateApiKey');

// Apply API key authentication to all API routes
router.use(authenticateApiKey);

// Import API route handlers
const getUserCount = require('./users/count');
const createManager = require('./managers/post');

// Define API routes
router.get('/users/count', getUserCount);
router.post('/managers', createManager);

module.exports = router;