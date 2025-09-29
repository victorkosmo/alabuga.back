// app/routes/webRoutes/store/campaigns/id/items/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const getCampaignStoreItem = require('./get');
const updateCampaignStoreItem = require('./update');
const deleteCampaignStoreItem = require('./delete');
const uploadImageHandler = require('./uploadImage');

router.get('/', getCampaignStoreItem);
router.put('/', updateCampaignStoreItem);
router.delete('/', deleteCampaignStoreItem);
router.post('/image', uploadImageHandler);

module.exports = router;
