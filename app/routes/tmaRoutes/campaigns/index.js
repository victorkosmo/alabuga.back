const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const joinCampaign = require('./join');
const listUserCampaigns = require('./list');

router.post('/join', authenticateTmaJWT, joinCampaign);
router.get('/', authenticateTmaJWT, listUserCampaigns);

module.exports = router;
