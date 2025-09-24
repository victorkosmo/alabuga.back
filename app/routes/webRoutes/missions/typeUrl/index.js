// app/routes/webRoutes/missions/typeUrl/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const createUrlMission = require('./post');
const updateUrlMission = require('./update');

// Define routes
router.post('/', createUrlMission);
router.put('/:id', updateUrlMission);

module.exports = router;
