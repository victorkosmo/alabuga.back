// app/routes/webRoutes/missions/typeUrl/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const createUrlMission = require('./post');
const updateUrlMission = require('./update');
const getUrlMission = require('./get');

// Define routes
router.post('/', createUrlMission);
router.put('/:id', updateUrlMission);
router.get('/:id', getUrlMission);

module.exports = router;
