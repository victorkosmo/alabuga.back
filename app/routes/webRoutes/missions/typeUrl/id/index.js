// app/routes/webRoutes/missions/typeUrl/id/index.js
const express = require('express');
// MANDATORY: mergeParams allows access to :id from the parent router
const router = express.Router({ mergeParams: true });

// Import handlers
const getUrlMission = require('./get');
const updateUrlMission = require('./update');

// Define routes for /missions/type-url/:id
router.get('/', getUrlMission);
router.put('/', updateUrlMission);

module.exports = router;
