// app/routes/webRoutes/store/campaigns/id/items/list.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/store/campaigns/{campaignId}/items:
 *   get:
 *     tags:
 *       - Store
 *     summary: List store items for a specific campaign
 *     description: Retrieve a paginated list of all store items associated with a specific campaign.
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
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: The page number for pagination.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *         description: The number of items per page.
 *     responses:
 *       200:
 *         description: A paginated list of campaign store items.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/StoreItem' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     pagination: { $ref: '#/components/schemas/Pagination' }
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listCampaignStoreItems = async (req, res, next) => {
    try {
        const { campaignId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!isUUID(campaignId)) {
            const err = new Error('Invalid campaign ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const offset = (page - 1) * limit;

        const countPromise = pool.query(
            'SELECT COUNT(*) FROM store_items WHERE campaign_id = $1 AND deleted_at IS NULL',
            [campaignId]
        );
        const dataPromise = pool.query(
            `SELECT * FROM store_items 
             WHERE campaign_id = $1 AND deleted_at IS NULL 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [campaignId, limit, offset]
        );

        const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);

        const total = parseInt(countResult.rows[0].count, 10);
        const pages = Math.ceil(total / limit);

        res.locals.data = dataResult.rows;
        res.locals.meta = { pagination: { page, limit, total, pages } };
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listCampaignStoreItems;
