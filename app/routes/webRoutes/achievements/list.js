// app/routes/webRoutes/achievements/list.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/achievements:
 *   get:
 *     tags:
 *       - Achievements
 *     summary: List achievements
 *     description: Retrieve a paginated list of achievements, filtered by a campaign.
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: The number of items per page.
 *     responses:
 *       200:
 *         description: A paginated list of achievements.
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
 *                     $ref: '#/components/schemas/Achievement'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listAchievements = async (req, res, next) => {
    try {
        const { campaign_id: campaignId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!campaignId || !isUUID(campaignId)) {
            const err = new Error('A valid campaign_id query parameter is required.');
            err.statusCode = 400;
            err.code = 'INVALID_QUERY_PARAM';
            return next(err);
        }

        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            const err = new Error('Invalid pagination parameters.');
            err.statusCode = 400;
            err.code = 'INVALID_PAGINATION';
            return next(err);
        }

        const offset = (page - 1) * limit;

        const campaignCheck = await pool.query('SELECT 1 FROM campaigns WHERE id = $1 AND deleted_at IS NULL', [campaignId]);
        if (campaignCheck.rowCount === 0) {
            const err = new Error(`Campaign with ID ${campaignId} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        const countPromise = pool.query(
            'SELECT COUNT(*) FROM achievements WHERE campaign_id = $1',
            [campaignId]
        );
        const dataPromise = pool.query(
            `SELECT * FROM achievements
             WHERE campaign_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [campaignId, limit, offset]
        );

        const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);

        const total = parseInt(countResult.rows[0].count, 10);
        const rows = dataResult.rows;
        const pages = Math.ceil(total / limit);

        res.locals.data = rows;
        res.locals.meta = {
            pagination: {
                page,
                limit,
                total,
                pages
            }
        };
        res.locals.message = 'Achievements retrieved successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listAchievements;
