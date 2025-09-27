// app/routes/webRoutes/ui/missions/index.js
const express = require('express');
const router = express.Router();

const listMinimalMissions = require('./listMinimal');

router.get('/list-minimal', listMinimalMissions);

module.exports = router;
