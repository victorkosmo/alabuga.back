// app/routes/apiRoutes/bot/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const ping = require('./ping');

// Define routes
router.get('/ping', ping);

module.exports = router;
