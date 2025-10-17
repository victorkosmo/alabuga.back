const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const listAvailableMissions = require('./listAvailable');
const listCompletedMissions = require('./listCompleted');

// This route corresponds to GET /telegram/missions/available
router.get('/available', authenticateTmaJWT, listAvailableMissions);

// This route corresponds to GET /telegram/missions/completed
router.get('/completed', authenticateTmaJWT, listCompletedMissions);

module.exports = router;
