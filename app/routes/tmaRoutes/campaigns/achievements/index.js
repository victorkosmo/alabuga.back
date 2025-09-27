const express = require('express');
// mergeParams is essential for accessing :campaignId from the parent router
const router = express.Router({ mergeParams: true });
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');

const listUserCampaignAchievements = require('./list');

// This route corresponds to GET /telegram/campaigns/:campaignId/achievements
router.get('/', authenticateTmaJWT, listUserCampaignAchievements);

module.exports = router;
