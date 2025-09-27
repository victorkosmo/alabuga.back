const express = require('express');
// mergeParams is essential for accessing :campaignId from the parent router
const router = express.Router({ mergeParams: true });
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');

const getCampaignById = require('./get');
const missionsRouter = require('../missions');
const achievementsRouter = require('../achievements');

// This route corresponds to GET /telegram/campaigns/:campaignId
router.get('/', authenticateTmaJWT, getCampaignById);

// Mount the missions sub-router for /telegram/campaigns/:campaignId/missions
router.use('/missions', missionsRouter);

// Mount the achievements sub-router for /telegram/campaigns/:campaignId/achievements
router.use('/achievements', achievementsRouter);

module.exports = router;
