// app/routes/webRoutes/store/campaigns/index.js
const express = require('express');
const router = express.Router();

const idRouter = require('./id');

router.use('/:campaignId', idRouter);

module.exports = router;
