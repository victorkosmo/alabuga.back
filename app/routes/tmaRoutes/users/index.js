const express = require('express');
const router = express.Router();
const authenticateJWT = require('@middleware/authenticateJWT');
const getCurrentUser = require('./me');

router.get('/me', authenticateJWT, getCurrentUser);

module.exports = router;
