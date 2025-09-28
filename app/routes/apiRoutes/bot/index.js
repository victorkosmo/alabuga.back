// app/routes/apiRoutes/bot/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const ping = require('./ping');
const joinCampaign = require('./joinCampaign');
const completeQrMission = require('./completeQrMission');

// Define routes
router.get('/ping', ping);
router.post('/join-campaign', joinCampaign);
router.post('/complete-qr-mission', completeQrMission);

module.exports = router;
