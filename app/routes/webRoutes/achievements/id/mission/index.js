// app/routes/webRoutes/achievements/id/mission/index.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const attachToMission = require('./attach');
const detachFromMission = require('./detach');

router.post('/attach', attachToMission);
router.post('/detach', detachFromMission);

module.exports = router;
