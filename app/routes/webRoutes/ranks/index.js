// app/routes/webRoutes/ranks/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Import route handlers
const listRanks = require('./list');
const listMinimalRanks = require('./listMinimal');
const createRank = require('./post');
const idRouter = require('./id');

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
router.post('/', upload.single('image'), createRank);
router.use('/:id', idRouter);

module.exports = router;
