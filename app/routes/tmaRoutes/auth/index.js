const express = require('express');
const router = express.Router();
const { authenticateTelegram } = require('@middleware/authenticateTelegram');
const tmaLogin = require('./login');

// The middleware will validate initData and attach the user to the request
router.post('/login', authenticateTelegram, tmaLogin);

module.exports = router;
