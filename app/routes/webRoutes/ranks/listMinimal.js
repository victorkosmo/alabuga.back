// app/routes/webRoutes/ranks/listMinimal.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/ranks/minimal:
 *   get:
 *     tags:
 *       - Ranks
 *     summary: List all ranks in a minimal format
 *     description: Retrieves a non-paginated list of all ranks with only their ID and title, ordered by priority. This is useful for populating dropdowns in a UI. Can be filtered by campaign. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaign_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional campaign ID to filter ranks. Returns ranks for that campaign plus global ranks. If not provided, returns only global ranks.
 *     responses:
 *       200:
 *         description: A minimal list of ranks.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                 message:
 *                   type: string
 *                   example: "Minimal rank list retrieved successfully."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listMinimalRanks = async (req, res, next) => {
    try {
        const { campaign_id: campaignId } = req.query;

        if (campaignId && !isUUID(campaignId)) {
            const err = new Error('If provided, campaign_id must be a valid UUID.');
            err.statusCode = 400;
            err.code = 'INVALID_QUERY_PARAM';
            return next(err);
        }

        const queryParams = [];
        let whereClause = 'WHERE deleted_at IS NULL';

        if (campaignId) {
            whereClause += ' AND (is_global = true OR campaign_id = $1)';
            queryParams.push(campaignId);
        } else {
            whereClause += ' AND is_global = true';
        }

        const query = `SELECT id, title FROM ranks ${whereClause} ORDER BY priority ASC`;

        const { rows } = await pool.query(query, queryParams);

        res.locals.data = rows;
        res.locals.message = 'Minimal rank list retrieved successfully.';
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = listMinimalRanks;
