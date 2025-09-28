// app/routes/webRoutes/missions/typeQr/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const createQrMission = require('./post');

// Define routes for /missions/type-qr
router.post('/', createQrMission);

module.exports = router;
