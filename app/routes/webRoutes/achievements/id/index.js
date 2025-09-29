// app/routes/webRoutes/achievements/id/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

// Import handlers for /achievements/:id
const getAchievement = require('./get');
const updateAchievement = require('./update');
const deleteAchievement = require('./delete');
const missionRouter = require('./mission');
const uploadImageHandler = require('./uploadImage');

// Define routes for /achievements/:id
router.get('/', getAchievement);
router.put('/', updateAchievement);
router.delete('/', deleteAchievement);
router.post('/image', uploadImageHandler);

// Mount the sub-router for mission-related actions
router.use('/mission', missionRouter);

module.exports = router;
