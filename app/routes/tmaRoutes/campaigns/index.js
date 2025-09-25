const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const joinCampaign = require('./join');
const listUserCampaigns = require('./list');
const missionsRouter = require('./missions');

router.post('/join', authenticateTmaJWT, joinCampaign);
router.get('/', authenticateTmaJWT, listUserCampaigns);

// Mount the missions sub-router
router.use('/:campaignId/missions', missionsRouter);

module.exports = router;
