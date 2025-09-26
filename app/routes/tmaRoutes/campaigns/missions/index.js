const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const listCampaignMissions = require('./list');
const idRouter = require('./id');

// This route corresponds to GET /telegram/campaigns/:campaignId/missions
router.get('/', authenticateTmaJWT, listCampaignMissions);

// Mount the sub-router for all /:missionId paths
router.use('/:missionId', idRouter);

module.exports = router;
