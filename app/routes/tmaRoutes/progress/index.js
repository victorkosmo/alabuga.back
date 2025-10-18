const express = require('express');
const router = express.Router();
const { authenticateTmaJWT } = require('@middleware/authenticateTmaJWT');
const getGlobalCompetencies = require('./globalCompetencies');
const getUserAchievementsProgress = require('./achievements');

// This route corresponds to GET /telegram/progress/global-competencies
router.get('/global-competencies', authenticateTmaJWT, getGlobalCompetencies);

// This route corresponds to GET /telegram/progress/achievements
router.get('/achievements', authenticateTmaJWT, getUserAchievementsProgress);

module.exports = router;
