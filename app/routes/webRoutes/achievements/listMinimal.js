// app/routes/webRoutes/achievements/listMinimal.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/achievements/list-minimal:
 *   get:
 *     tags:
 *       - Achievements
 *     summary: List achievements in a minimal format
 *     description: Retrieve a minimal list of achievements (ID and name) for a specific campaign, suitable for UI selectors.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaign_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the campaign to filter achievements by.
 *     responses:
 *       200:
 *         description: A minimal list of achievements.
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
 *                       name:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
const listMinimalAchievements = async (req, res, next) => {
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
            `SELECT id, name FROM achievements
             WHERE campaign_id = $1
             ORDER BY name ASC`,
            [campaignId]
        );

        res.locals.data = rows;
        res.locals.message = 'Minimal achievement list retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listMinimalAchievements;
