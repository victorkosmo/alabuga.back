// app/routes/webRoutes/store/campaigns/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const itemsRouter = require('./items');

router.use('/items', itemsRouter);

module.exports = router;
