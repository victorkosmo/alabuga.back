// app/routes/webRoutes/store/campaigns/id/items/id/delete.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/store/campaigns/{campaignId}/items/{itemId}:
 *   delete:
 *     tags:
 *       - Store
 *     summary: Delete a campaign-specific store item
 *     description: Soft-deletes a store item belonging to a specific campaign. The item cannot be deleted if it has been ordered.
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
 *         description: The UUID of the store item to delete.
 *     responses:
 *       204:
 *         description: Store item deleted successfully.
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const deleteCampaignStoreItem = async (req, res, next) => {
    try {
        const { campaignId, itemId } = req.params;

        if (!isUUID(campaignId) || !isUUID(itemId)) {
            const err = new Error('Invalid campaign or item ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        // Check for relations in the orders table
        const relationCheck = await pool.query(
            'SELECT 1 FROM orders WHERE item_id = $1 LIMIT 1',
            [itemId]
        );

        if (relationCheck.rowCount > 0) {
            const err = new Error('Cannot delete store item. It has been referenced in one or more orders.');
            err.statusCode = 409; // Conflict
            err.code = 'RELATION_EXISTS';
            return next(err);
        }

        const { rowCount } = await pool.query(
            `UPDATE store_items 
             SET deleted_at = NOW() 
             WHERE id = $1 AND campaign_id = $2 AND deleted_at IS NULL`,
            [itemId, campaignId]
        );

        if (rowCount === 0) {
            const err = new Error(`Store item with ID ${itemId} not found in campaign ${campaignId}.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.statusCode = 204;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = deleteCampaignStoreItem;
