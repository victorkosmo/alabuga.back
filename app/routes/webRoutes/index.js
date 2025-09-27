// app/routes/webRoutes/index.js
const express = require('express');
const router = express.Router();
const achievementsRouter = require('./achievements');
const uiRouter = require('./ui'); // Import the new UI router

// Mount other routers...
router.use('/achievements', achievementsRouter);

// Add the new UI router
router.use('/ui', uiRouter);

module.exports = router;
