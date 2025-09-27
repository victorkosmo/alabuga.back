// app/routes/webRoutes/ui/missions/listMinimal.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/ui/missions/list-minimal:
 *   get:
 *     tags:
 *       - UI Helpers
 *     summary: List missions in a minimal format (UI helper)
 *     description: Retrieve a minimal list of missions (ID and title) for a specific campaign, suitable for UI selectors.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaign_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the campaign to filter missions by.
 *     responses:
 *       200:
 *         description: A minimal list of missions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
const listMinimalMissions = async (req, res, next) => {
    try {
        const { campaign_id: campaignId } = req.query;

        if (!campaignId || !isUUID(campaignId)) {
            const err = new Error('A valid campaign_id query parameter is required.');
            err.statusCode = 400;
            err.code = 'INVALID_QUERY_PARAM';
            return next(err);
        }

        const campaignCheck = await pool.query('SELECT 1 FROM campaigns WHERE id = $1 AND deleted_at IS NULL', [campaignId]);
        if (campaignCheck.rowCount === 0) {
            const err = new Error(`Campaign with ID ${campaignId} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const { rows } = await pool.query(
            `SELECT id, title FROM missions
             WHERE campaign_id = $1 AND deleted_at IS NULL
             ORDER BY title ASC`,
            [campaignId]
        );

        res.locals.data = rows;
        res.locals.message = 'Minimal mission list retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listMinimalMissions;
