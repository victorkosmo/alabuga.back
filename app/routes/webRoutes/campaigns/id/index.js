// app/routes/webRoutes/campaigns/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

// Import handlers for /campaigns/:id
const getCampaign = require('./get');
const updateCampaign = require('./update');
const deleteCampaign = require('./delete');
const achievementsRouter = require('./achievements');

// Define routes for /campaigns/:id
router.get('/', getCampaign);
router.put('/', updateCampaign);
router.delete('/', deleteCampaign);
router.use('/achievements', achievementsRouter);

module.exports = router;
