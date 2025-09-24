// app/routes/webRoutes/missions/typeUrl/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const createUrlMission = require('./post');
const idRouter = require('./id');

// Define routes for /missions/type-url
router.post('/', createUrlMission);

// Mount the dedicated sub-router for all /:id paths
router.use('/:id', idRouter);

module.exports = router;
