// app/routes/webRoutes/missions/typeQr/id/index.js
const express = require('express');
// MANDATORY: mergeParams allows access to :id from the parent router
const router = express.Router({ mergeParams: true });

// Import handlers
const getQrMission = require('./get');
const updateQrMission = require('./update');

// Define routes for /missions/type-qr/:id
router.get('/', getQrMission);
router.put('/', updateQrMission);

module.exports = router;
