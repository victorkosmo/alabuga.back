const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const listAvailableMissions = require('./listAvailable');

// This route corresponds to GET /telegram/missions/available
router.get('/available', authenticateTmaJWT, listAvailableMissions);

module.exports = router;
