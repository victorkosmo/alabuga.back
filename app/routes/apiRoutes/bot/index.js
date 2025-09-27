// app/routes/apiRoutes/bot/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const ping = require('./ping');
const joinCampaign = require('./joinCampaign');

// Define routes
router.get('/ping', ping);
router.post('/join-campaign', joinCampaign);

module.exports = router;
