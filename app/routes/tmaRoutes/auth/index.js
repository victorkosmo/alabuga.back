const express = require('express');
const router = express.Router();
const { authenticateTelegram } = require('@middleware/authenticateTelegram');
const tmaLogin = require('./login');
const tmaDevLogin = require('./loginDev');

// The middleware will validate initData and attach the user to the request
router.post('/login', authenticateTelegram, tmaLogin);

// Dev login route - does not require Telegram authentication middleware
router.post('/login-dev', tmaDevLogin);

module.exports = router;
