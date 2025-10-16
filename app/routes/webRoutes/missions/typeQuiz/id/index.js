// app/routes/webRoutes/missions/typeQuiz/id/index.js
const express = require('express');
// MANDATORY: mergeParams allows access to :id from the parent router
const router = express.Router({ mergeParams: true });

// Import handlers
const getQuizMission = require('./get');
const updateQuizMission = require('./update');
const uploadQuizMissionCover = require('./uploadCover');

// Define routes for /missions/type-quiz/:id
router.get('/', getQuizMission);
router.put('/', updateQuizMission);
router.post('/cover', uploadQuizMissionCover);

module.exports = router;
