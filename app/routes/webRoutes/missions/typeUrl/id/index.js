// app/routes/webRoutes/missions/typeUrl/id/index.js
const express = require('express');
// MANDATORY: mergeParams allows access to :id from the parent router
const router = express.Router({ mergeParams: true });

// Import handlers
const getUrlMission = require('./get');
const updateUrlMission = require('./update');
const deleteUrlMission = require('./delete');
const completionsRouter = require('./completions');
const uploadUrlMissionCover = require('./uploadCover');

// Define routes for /missions/type-url/:id
router.get('/', getUrlMission);
router.put('/', updateUrlMission);
router.delete('/', deleteUrlMission);
router.post('/cover', uploadUrlMissionCover);

// Mount sub-router for completions
router.use('/completions', completionsRouter);

module.exports = router;
