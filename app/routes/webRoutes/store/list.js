// app/routes/webRoutes/store/list.js
const pool = require('@db');

/**
 * @swagger
 * /web/store:
 *   get:
 *     tags:
 *       - Store
 *     summary: List all global store items
 *     description: Retrieve a paginated list of all global store items. Requires authentication.
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
 *     responses:
 *       200:
 *         description: A paginated list of global store items.
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
 *                     $ref: '#/components/schemas/StoreItem'
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
const listStoreItems = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            const err = new Error('Invalid pagination parameters. Query parameters "page" (integer, >=1) and "limit" (integer, 1-100) are required.');
            err.statusCode = 400;
            err.code = 'INVALID_PAGINATION';
            return next(err);
        }

        const offset = (page - 1) * limit;

        const countPromise = pool.query(
            'SELECT COUNT(*) FROM store_items WHERE is_global = true AND deleted_at IS NULL'
        );
        const dataPromise = pool.query(
            `SELECT * FROM store_items 
             WHERE is_global = true AND deleted_at IS NULL 
             ORDER BY created_at DESC 
             LIMIT $1 OFFSET $2`,
            [limit, offset]
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
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = listStoreItems;
