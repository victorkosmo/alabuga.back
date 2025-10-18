// app/routes/webRoutes/ui/campaigns/index.js
const express = require('express');
const router = express.Router();

const listMinimalCampaigns = require('./listMinimal');

router.get('/list-minimal', listMinimalCampaigns);

module.exports = router;
