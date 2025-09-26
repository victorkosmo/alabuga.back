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
 *       required:
 *         - id
 *         - campaign_id
 *         - name
 *         - created_at
 */

// Routes for individual achievements (e.g., GET /:id, PUT /:id) can be added here later.

module.exports = router;
