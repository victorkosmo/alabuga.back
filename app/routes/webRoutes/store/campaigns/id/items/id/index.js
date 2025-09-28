// app/routes/webRoutes/store/campaigns/id/items/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const getCampaignStoreItem = require('./get');

router.get('/', getCampaignStoreItem);

module.exports = router;
