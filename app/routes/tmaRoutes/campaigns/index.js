const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const joinCampaign = require('./join');
const listUserCampaigns = require('./list');
const idRouter = require('./id');

router.post('/join', authenticateTmaJWT, joinCampaign);
router.get('/', authenticateTmaJWT, listUserCampaigns);

// Mount the sub-router for all /:campaignId paths
router.use('/:campaignId', idRouter);

module.exports = router;
