// app/routes/webRoutes/index.js
const express = require('express');
const router = express.Router();

// Import routers for the web group
const authRouter = require('./auth/index');
const competenciesRouter = require('./competencies/index');
const campaignsRouter = require('./campaigns/index');
const missionsRouter = require('./missions/index');

router.use('/auth', authRouter);
router.use('/competencies', competenciesRouter);
router.use('/campaigns', campaignsRouter);
router.use('/missions', missionsRouter);

module.exports = router;
