// app/routes/webRoutes/ui/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Authentication middleware for all UI helper routes
router.use(authenticateJWT);

/**
 * @swagger
 * tags:
 *   name: UI Helpers
 *   description: API endpoints to support UI components like selectors and search bars.
 */

const achievementsRouter = require('./achievements');
const missionsRouter = require('./missions');
const competenciesRouter = require('./competencies');
const campaignsRouter = require('./campaigns');

router.use('/achievements', achievementsRouter);
router.use('/missions', missionsRouter);
router.use('/competencies', competenciesRouter);
router.use('/campaigns', campaignsRouter);

module.exports = router;
