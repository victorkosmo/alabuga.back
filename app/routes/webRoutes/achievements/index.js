// app/routes/webRoutes/achievements/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Authentication middleware for all achievement routes
router.use(authenticateJWT);

/**
 * @swagger
 * tags:
 *   name: Achievements
 *   description: API for managing achievements within campaigns.
 * components:
 *   schemas:
 *     Achievement:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the achievement.
 *         campaign_id:
 *           type: string
 *           format: uuid
 *           description: The ID of the campaign this achievement belongs to.
 *         name:
 *           type: string
 *           description: The display name of the achievement.
 *         description:
 *           type: string
 *           nullable: true
 *           description: A detailed description of the achievement.
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL to the achievement badge image.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the achievement was created.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the achievement was last updated.
 *       required:
 *         - id
 *         - campaign_id
 *         - name
 *         - created_at
 *         - updated_at
 */

const listAchievements = require('./list');
const listMinimalAchievements = require('./listMinimal');
const createAchievement = require('./post');
const idRouter = require('./id');

router.get('/', listAchievements);
router.get('/list-minimal', listMinimalAchievements);
router.post('/', createAchievement);

// Mount the dedicated sub-router for all /:id paths.
router.use('/:id', idRouter);

module.exports = router;
