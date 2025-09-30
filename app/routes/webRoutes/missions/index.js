// app/routes/webRoutes/missions/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Import sub-routers
const typeUrlRouter = require('./typeUrl');
const typeQrRouter = require('./typeQr');
const typeQuizRouter = require('./typeQuiz');
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
 *         required_achievement_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Optional achievement that must be earned before this mission becomes available.
 *         experience_reward:
 *           type: integer
 *         mana_reward:
 *           type: integer
 *         completion_code:
 *           type: string
 *           nullable: true
 *           description: "Secret code for QR_CODE missions."
 *         qr_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: "Public URL of the generated QR code image for QR_CODE missions."
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
 *     MissionCompletionStatus:
 *       type: string
 *       enum: [PENDING_REVIEW, APPROVED, REJECTED]
 *       description: The status of a mission completion that requires moderation.
 *     MissionCompletion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         mission_id:
 *           type: string
 *           format: uuid
 *         status:
 *           $ref: '#/components/schemas/MissionCompletionStatus'
 *         result_data:
 *           type: string
 *           nullable: true
 *           description: Data submitted by the user (e.g., a URL).
 *         moderator_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         moderator_comment:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

// Route to get supported mission types
router.get('/types', getMissionTypes);

// Mount sub-routers for different mission types
router.use('/type-url', typeUrlRouter);
router.use('/type-qr', typeQrRouter);
router.use('/type-quiz', typeQuizRouter);

module.exports = router;
