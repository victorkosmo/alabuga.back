// app/routes/webRoutes/achievements/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

// Import handlers for /achievements/:id
const getAchievement = require('./get');
const updateAchievement = require('./update');
const deleteAchievement = require('./delete');
const missionRouter = require('./mission');

// Define routes for /achievements/:id
router.get('/', getAchievement);
router.put('/', updateAchievement);
router.delete('/', deleteAchievement);

// Mount the sub-router for mission-related actions
router.use('/mission', missionRouter);

module.exports = router;
