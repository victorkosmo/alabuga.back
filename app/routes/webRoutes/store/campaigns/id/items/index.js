// app/routes/webRoutes/store/campaigns/id/items/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const listCampaignStoreItems = require('./list');
const createCampaignStoreItem = require('./post');
const idRouter = require('./id');

router.get('/', listCampaignStoreItems);
router.post('/', createCampaignStoreItem);
router.use('/:itemId', idRouter);

module.exports = router;
