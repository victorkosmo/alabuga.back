// app/routes/webRoutes/ranks/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Import route handlers
const listRanks = require('./list');
const listMinimalRanks = require('./listMinimal');

// Authentication middleware for all rank routes
router.use(authenticateJWT);

/**
 * @swagger
 * components:
 *   schemas:
 *     Rank:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         image_url:
 *           type: string
 *           format: url
 *           nullable: true
 *         priority:
 *           type: integer
 *         unlock_conditions:
 *           type: object
 *           description: JSON object with conditions to unlock this rank.
 *           example: {"required_experience": 500, "required_missions": ["uuid1", "uuid2"]}
 *         is_global:
 *           type: boolean
 *           description: Whether the rank is global or campaign-specific.
 *         campaign_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: The campaign this rank belongs to if it's not global.
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * tags:
 *   - name: Ranks
 *     description: Operations related to game ranks
 */

// Define routes
router.get('/', listRanks);
router.get('/minimal', listMinimalRanks);

module.exports = router;
