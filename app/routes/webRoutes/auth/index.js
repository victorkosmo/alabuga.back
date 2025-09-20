// routes/auth/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Import individual auth route files
const loginUser = require('./login');
const getCurrentUser = require('./me');
const refreshTokens = require('./refresh');

// Define routes
router.post('/login', loginUser);
router.get('/me', authenticateJWT, getCurrentUser);
router.post('/refresh', refreshTokens);

module.exports = router;
