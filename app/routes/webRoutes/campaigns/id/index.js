// app/routes/webRoutes/campaigns/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

// Import handlers for /campaigns/:id
const getCampaign = require('./get');
const updateCampaign = require('./update');
const deleteCampaign = require('./delete');
const uploadCoverHandler = require('./uploadCover');
const uploadIconHandler = require('./uploadIcon');

// Define routes for /campaigns/:id
router.get('/', getCampaign);
router.put('/', updateCampaign);
router.delete('/', deleteCampaign);
router.post('/cover', uploadCoverHandler);
router.post('/icon', uploadIconHandler);

module.exports = router;
