// app/routes/webRoutes/store/campaigns/id/items/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/store/campaigns/{campaignId}/items/{itemId}:
 *   put:
 *     tags:
 *       - Store
 *     summary: Update a campaign-specific store item
 *     description: Updates an existing store item that belongs to a specific campaign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: The UUID of the campaign.
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: The UUID of the store item to update.
 *     requestBody:
 *       required: true
 *       description: A JSON object with the fields to update.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *               image_url: { type: string, format: uri, nullable: true }
 *               cost: { type: integer, minimum: 0 }
 *               quantity: { type: integer, nullable: true, minimum: 0 }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Store item updated successfully.
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
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateCampaignStoreItem = async (req, res, next) => {
    try {
        const { campaignId, itemId } = req.params;
        const { name, description, image_url, cost, quantity, is_active } = req.body;

        if (!isUUID(campaignId) || !isUUID(itemId)) {
            const err = new Error('Invalid campaign or item ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        if (Object.keys(req.body).length === 0) {
            const err = new Error('At least one field to update must be provided.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        const allowedFields = { name, description, image_url, cost, quantity, is_active };
        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;

        for (const key in allowedFields) {
            if (allowedFields[key] !== undefined) {
                updateFields.push(`${key} = $${paramIndex++}`);
                queryParams.push(allowedFields[key]);
            }
        }

        updateFields.push(`updated_at = NOW()`);
        queryParams.push(itemId);
        queryParams.push(campaignId);

        const updateQuery = `
            UPDATE store_items 
            SET ${updateFields.join(', ')} 
            WHERE id = $${paramIndex} AND campaign_id = $${paramIndex + 1} AND deleted_at IS NULL 
            RETURNING *`;

        const { rows } = await pool.query(updateQuery, queryParams);

        if (rows.length === 0) {
            const err = new Error(`Store item with ID ${itemId} not found in campaign ${campaignId}.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Campaign store item updated successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = updateCampaignStoreItem;
