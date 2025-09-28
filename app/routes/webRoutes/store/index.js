// app/routes/webRoutes/store/index.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('@middleware/authenticateJWT');

// Authentication middleware for all store routes
router.use(authenticateJWT);

/**
 * @swagger
 * components:
 *   schemas:
 *     StoreItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the store item.
 *         name:
 *           type: string
 *           description: The name of the store item.
 *         description:
 *           type: string
 *           nullable: true
 *           description: A description for the store item.
 *         image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL for the item's image.
 *         cost:
 *           type: integer
 *           minimum: 0
 *           description: The price of the item in mana points.
 *         quantity:
 *           type: integer
 *           nullable: true
 *           description: Available stock. NULL for infinite items.
 *         is_active:
 *           type: boolean
 *           description: Toggles visibility in the store.
 *         is_global:
 *           type: boolean
 *           description: Whether this item is available across all campaigns.
 *         campaign_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: The campaign this item belongs to, if not global.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the item was created.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the item was last updated.
 *       required:
 *         - id
 *         - name
 *         - cost
 *         - is_active
 *         - is_global
 *         - created_at
 *         - updated_at
 */

// Import route handlers
const listStoreItems = require('./list');
const createStoreItem = require('./post');
const idRouter = require('./id');
const campaignsRouter = require('./campaigns');

// Define routes
router.get('/', listStoreItems);
router.post('/', createStoreItem);

// Mount the dedicated sub-router for all /:id paths.
router.use('/:id', idRouter);
router.use('/campaigns', campaignsRouter);

module.exports = router;
