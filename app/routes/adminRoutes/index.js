const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('@middleware/authenticateApiKey');

/**
 * @swagger
 * components:
 *   schemas:
 *     Manager:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the manager.
 *         email:
 *           type: string
 *           format: email
 *           description: The manager's login email.
 *         full_name:
 *           type: string
 *           description: The manager's full name.
 *         role:
 *           type: string
 *           enum: [HR, ORGANIZER, ADMIN]
 *           description: The role defining the manager's permissions.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp of when the manager was created.
 */

// Apply API key authentication to all API routes
router.use(authenticateApiKey);

// Import API route handlers
const getUserCount = require('./users/count');
const createManager = require('./managers/post');

// Define API routes
router.get('/users/count', getUserCount);
router.post('/managers', createManager);

module.exports = router;
