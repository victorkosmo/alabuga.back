// app/routes/webRoutes/missions/typeQr/id/index.js
const express = require('express');
// MANDATORY: mergeParams allows access to :id from the parent router
const router = express.Router({ mergeParams: true });

// Import handlers
const getQrMission = require('./get');
const updateQrMission = require('./update');
const uploadQrMissionCover = require('./uploadCover');

// Define routes for /missions/type-qr/:id
router.get('/', getQrMission);
router.put('/', updateQrMission);
router.post('/cover', uploadQrMissionCover);

module.exports = router;
