// app/routes/webRoutes/competencies/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Authentication middleware for all competency routes
router.use(authenticateJWT);

/**
 * @swagger
 * components:
 *   schemas:
 *     Competency:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the competency.
 *           example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         name:
 *           type: string
 *           description: The name of the competency.
 *           example: "Аналитика"
 *         description:
 *           type: string
 *           description: A description for the competency.
 *           example: "Способность анализировать данные и делать выводы."
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the competency was created.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the competency was last updated.
 *       required:
 *         - id
 *         - name
 *         - created_at
 *         - updated_at
 */

// Import route handlers
const listCompetencies = require('./list');
const createCompetency = require('./post');
const idRouter = require('./id'); // For future use

// Define routes
router.get('/', listCompetencies);
router.post('/', createCompetency);

// Mount the dedicated sub-router for all /:id paths.
router.use('/:id', idRouter);

module.exports = router;
