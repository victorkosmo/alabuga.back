const express = require('express');
// mergeParams is essential for accessing :campaignId from the parent router
const router = express.Router({ mergeParams: true });
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');

const getMissionById = require('./get');

// This route corresponds to GET /telegram/campaigns/:campaignId/missions/:missionId
router.get('/', authenticateTmaJWT, getMissionById);

// Future verb handlers for a specific mission (e.g., POST for submission) can go here

module.exports = router;
