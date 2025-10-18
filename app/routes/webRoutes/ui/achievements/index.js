// app/routes/webRoutes/ui/achievements/index.js
const express = require('express');
const router = express.Router();

const listMinimalAchievements = require('./listMinimal');
const listGlobalAchievements = require('./listGlobal');

router.get('/list-minimal', listMinimalAchievements);
router.get('/list-global', listGlobalAchievements);

module.exports = router;
