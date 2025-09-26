// app/routes/webRoutes/campaigns/id/achievements/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const listAchievements = require('./list');
const createAchievement = require('./post');

router.get('/', listAchievements);
router.post('/', createAchievement);

module.exports = router;
