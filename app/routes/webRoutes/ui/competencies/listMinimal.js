// app/routes/webRoutes/ui/competencies/listMinimal.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/ui/competencies/list-minimal:
 *   get:
 *     tags:
 *       - UI Helpers
 *     summary: List competencies in a minimal format (UI helper)
 *     description: |
 *       Retrieve a minimal list of competencies (ID and name), suitable for UI selectors.
 *       - If `campaign_id` is provided, it returns all competencies for that campaign PLUS all global competencies.
 *       - If `campaign_id` is omitted, it returns ONLY global competencies.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaign_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the campaign to filter competencies by. If omitted, only global competencies are returned.
 *     responses:
 *       200:
 *         description: A minimal list of competencies.
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
const listMinimalCompetencies = async (req, res, next) => {
    try {
        const { campaign_id: campaignId } = req.query;

        let query;
        const params = [];

        if (campaignId) {
            if (!isUUID(campaignId)) {
                const err = new Error('If provided, campaign_id must be a valid UUID.');
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

            query = `
                SELECT id, name FROM competencies
                WHERE (campaign_id = $1 OR is_global = true) AND deleted_at IS NULL
                ORDER BY name ASC
            `;
            params.push(campaignId);
        } else {
            query = `
                SELECT id, name FROM competencies
                WHERE is_global = true AND deleted_at IS NULL
                ORDER BY name ASC
            `;
        }

        const { rows } = await pool.query(query, params);

        res.locals.data = rows;
        res.locals.message = 'Minimal competency list retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listMinimalCompetencies;
