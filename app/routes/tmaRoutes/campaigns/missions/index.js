const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const listCampaignMissions = require('./list');

// This route corresponds to GET /telegram/campaigns/:campaignId/missions
router.get('/', authenticateTmaJWT, listCampaignMissions);

module.exports = router;
