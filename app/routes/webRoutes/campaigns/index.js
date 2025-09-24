// app/routes/webRoutes/campaigns/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Authentication middleware for all campaign routes
router.use(authenticateJWT);

/**
 * @swagger
 * components:
 *   schemas:
 *     Campaign:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the campaign.
 *           example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         title:
 *           type: string
 *           description: The display name of the campaign.
 *           example: "Летняя стажировка 2024"
 *         description:
 *           type: string
 *           nullable: true
 *           description: A detailed description of the campaign.
 *           example: "Кампания по онбордингу и вовлечению новых стажеров."
 *         activation_code:
 *           type: string
 *           description: The unique 6-digit code users enter to join the campaign.
 *           example: "321654"
 *         status:
 *           type: string
 *           enum: [DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED]
 *           description: The current status of the campaign.
 *           example: "DRAFT"
 *         start_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: The date when the campaign becomes active.
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: The date when the campaign closes.
 *         max_participants:
 *           type: integer
 *           nullable: true
 *           description: Maximum number of participants. Null for unlimited.
 *           example: 100
 *         created_by:
 *           type: string
 *           format: uuid
 *           description: The ID of the manager who created the campaign.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the campaign was created.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the campaign was last updated.
 *       required:
 *         - id
 *         - title
 *         - activation_code
 *         - status
 *         - created_by
 *         - created_at
 *         - updated_at
 */

// Import route handlers
const listCampaigns = require('./list');
const createCampaign = require('./post');
const idRouter = require('./id');

// Define routes
router.get('/', listCampaigns);
router.post('/', createCampaign);

// Mount the dedicated sub-router for all /:id paths.
router.use('/:id', idRouter);

module.exports = router;
