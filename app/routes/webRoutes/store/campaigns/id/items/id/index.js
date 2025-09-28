// app/routes/webRoutes/store/campaigns/id/items/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const getCampaignStoreItem = require('./get');
const updateCampaignStoreItem = require('./update');
const deleteCampaignStoreItem = require('./delete');

router.get('/', getCampaignStoreItem);
router.put('/', updateCampaignStoreItem);
router.delete('/', deleteCampaignStoreItem);

module.exports = router;
