// app/routes/webRoutes/missions/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Import sub-routers
const typeUrlRouter = require('./typeUrl');
// Import route handlers
const getMissionTypes = require('./types');

// Authentication middleware for all mission routes
router.use(authenticateJWT);

/**
 * @swagger
 * components:
 *   schemas:
 *     Mission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         campaign_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         category:
 *           type: string
 *         required_rank_id:
 *           type: string
 *           format: uuid
 *         experience_reward:
 *           type: integer
 *         mana_reward:
 *           type: integer
 *         competency_rewards:
 *           type: object
 *           nullable: true
 *         awarded_artifact_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         type:
 *           $ref: '#/components/schemas/MissionType'
 *         created_by:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     MissionType:
 *       type: string
 *       enum: [MANUAL_URL, QUIZ, QR_CODE]
 *       description: The type of logic used to complete the mission.
 */

// Route to get supported mission types
router.get('/types', getMissionTypes);

// Mount sub-routers for different mission types
router.use('/type-url', typeUrlRouter);

module.exports = router;
