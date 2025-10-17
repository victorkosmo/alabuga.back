// app/routes/webRoutes/ranks/list.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/ranks:
 *   get:
 *     tags:
 *       - Ranks
 *     summary: List all ranks
 *     description: Retrieve a paginated list of all ranks, ordered by their priority. Can be filtered by campaign. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: The number of items per page (max 100).
 *       - in: query
 *         name: campaign_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional campaign ID to filter ranks. Returns ranks for that campaign plus global ranks. If not provided, returns only global ranks.
 *     responses:
 *       200:
 *         description: A paginated list of ranks.
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
 *                     $ref: '#/components/schemas/Rank'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const listRanks = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { campaign_id: campaignId } = req.query;

        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            const err = new Error('Invalid pagination parameters. Query parameters "page" (integer, >=1) and "limit" (integer, 1-100) are required.');
            err.statusCode = 400;
            err.code = 'INVALID_PAGINATION';
            return next(err);
        }

        if (campaignId && !isUUID(campaignId)) {
            const err = new Error('If provided, campaign_id must be a valid UUID.');
            err.statusCode = 400;
            err.code = 'INVALID_QUERY_PARAM';
            return next(err);
        }

        const offset = (page - 1) * limit;

        const queryParams = [];
        let whereClause = 'WHERE deleted_at IS NULL';

        if (campaignId) {
            whereClause += ' AND (is_global = true OR campaign_id = $1)';
            queryParams.push(campaignId);
        } else {
            whereClause += ' AND is_global = true';
        }

        const countQuery = `SELECT COUNT(*) FROM ranks ${whereClause}`;
        const countPromise = pool.query(countQuery, queryParams);

        const dataQueryParams = [...queryParams, limit, offset];
        const dataQuery = `SELECT * FROM ranks 
             ${whereClause}
             ORDER BY priority ASC 
             LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        const dataPromise = pool.query(dataQuery, dataQueryParams);

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
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listRanks;
