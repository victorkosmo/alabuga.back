// app/routes/webRoutes/store/campaigns/id/items/post.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/store/campaigns/{campaignId}/items:
 *   post:
 *     tags:
 *       - Store
 *     summary: Create a new campaign-specific store item
 *     description: Creates a new store item that is only available for a specific campaign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the campaign to associate the item with.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StoreItem'
 *           example:
 *             name: "Exclusive Campaign Mug"
 *             description: "A special mug only for participants of this campaign."
 *             cost: 500
 *             quantity: 100
 *             is_active: true
 *     responses:
 *       201:
 *         description: Campaign store item created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/StoreItem' }
 *                 message: { type: string }
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const createCampaignStoreItem = async (req, res, next) => {
    try {
        const { campaignId } = req.params;
        const { name, description, image_url, cost, quantity, is_active = true } = req.body;

        if (!isUUID(campaignId)) {
            const err = new Error('Invalid campaign ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }
        // Validations from global item creation
        if (!name || typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }
        if (cost === undefined || !Number.isInteger(cost) || cost < 0) {
            const err = new Error('Cost is required and must be a non-negative integer.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const { rows } = await pool.query(
            `INSERT INTO store_items (name, description, image_url, cost, quantity, is_active, is_global, campaign_id)
             VALUES ($1, $2, $3, $4, $5, $6, false, $7)
             RETURNING *`,
            [name.trim(), description, image_url, cost, quantity, is_active, campaignId]
        );

        res.locals.data = rows[0];
        res.locals.statusCode = 201;
        res.locals.message = 'Campaign store item created successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = createCampaignStoreItem;
