// app/routes/webRoutes/campaigns/id/delete.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/campaigns/{id}:
 *   delete:
 *     tags:
 *       - Campaigns
 *     summary: Delete a campaign by ID
 *     description: Soft-deletes a campaign by its ID. The campaign cannot be deleted if it has any missions associated with it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the campaign to delete.
 *     responses:
 *       204:
 *         description: Campaign deleted successfully.
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - The campaign is in use and cannot be deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               RelationExists:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "RELATION_EXISTS"
 *                     message: "Cannot delete campaign. It has one or more missions attached."
 *                   data: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const deleteCampaign = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        // Check for relations in missions table
        const relationCheck = await pool.query(
            'SELECT 1 FROM missions WHERE campaign_id = $1 LIMIT 1',
            [id]
        );

        if (relationCheck.rowCount > 0) {
            const err = new Error('Cannot delete campaign. It has one or more missions attached.');
            err.statusCode = 409; // Conflict
            err.code = 'RELATION_EXISTS';
            return next(err);
        }

        const { rowCount } = await pool.query(
            `UPDATE campaigns 
             SET deleted_at = NOW() 
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (rowCount === 0) {
            const err = new Error(`Campaign with ID ${id} not found.`);
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

module.exports = deleteCampaign;
