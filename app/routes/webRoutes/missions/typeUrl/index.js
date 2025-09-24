// app/routes/webRoutes/missions/typeUrl/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const createUrlMission = require('./post');

// Define routes
router.post('/', createUrlMission);

module.exports = router;
