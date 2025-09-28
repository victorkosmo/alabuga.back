// app/routes/webRoutes/missions/typeQr/index.js
const express = require('express');
const router = express.Router();

// Import route handlers
const createQrMission = require('./post');
const idRouter = require('./id');

// Define routes for /missions/type-qr
router.post('/', createQrMission);

// Mount the dedicated sub-router for all /:id paths
router.use('/:id', idRouter);

module.exports = router;
