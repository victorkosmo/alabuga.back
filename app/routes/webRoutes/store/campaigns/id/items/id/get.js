// app/routes/webRoutes/store/campaigns/id/items/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/store/campaigns/{campaignId}/items/{itemId}:
 *   get:
 *     tags:
 *       - Store
 *     summary: Get a campaign-specific store item by ID
 *     description: Retrieve a single store item that belongs to a specific campaign. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the campaign.
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the store item to retrieve.
 *     responses:
 *       200:
 *         description: The requested store item details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StoreItem'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getCampaignStoreItem = async (req, res, next) => {
    try {
        const { campaignId, itemId } = req.params;

        if (!isUUID(campaignId) || !isUUID(itemId)) {
            const err = new Error('Invalid campaign or item ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const { rows } = await pool.query(
            'SELECT * FROM store_items WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL',
            [itemId, campaignId]
        );

        if (rows.length === 0) {
            const err = new Error(`Store item with ID ${itemId} not found in campaign ${campaignId}.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getCampaignStoreItem;
