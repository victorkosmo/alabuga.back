// app/routes/boilerplate_entity/list.js
const pool = require('@db');

/**
 * @swagger
 * /boilerplate_entity:
 *   get:
 *     tags:
 *       - boilerplate_entity
 *     summary: List all boilerplate_entities
 *     description: Retrieve a paginated list of all boilerplate_entities. Requires authentication.
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
 *         description: A paginated list of boilerplate_entities.
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
 *                     $ref: '#/components/schemas/BoilerplateEntity' # <-- Reference the schema defined in index.js
 *                 meta:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination' # <-- Reference the global Pagination schema
 *       400:
 *         $ref: '#/components/responses/BadRequestError' # Reference global bad request response
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError' # Reference global unauthorized response
 *       500:
 *         $ref: '#/components/responses/InternalServerError' # Reference global server error response
 */
const listEntities = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Validate pagination parameters more robustly
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            const err = new Error('Invalid pagination parameters. Query parameters "page" (integer, >=1) and "limit" (integer, 1-100) are required.');
            err.statusCode = 400;
            err.code = 'INVALID_PAGINATION'; // Consistent error code
            return next(err);
        }

        const offset = (page - 1) * limit;

        // Execute count and data queries in parallel for efficiency
        const countPromise = pool.query(
            'SELECT COUNT(*) FROM boilerplate_entities WHERE deleted_at IS NULL'
        );
        const dataPromise = pool.query(
            `SELECT * FROM boilerplate_entities 
             WHERE deleted_at IS NULL 
             ORDER BY created_at DESC 
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);

        const total = parseInt(countResult.rows[0].count, 10);
        const rows = dataResult.rows; // Assuming these rows match the BoilerplateEntity schema
        const pages = Math.ceil(total / limit);

        // Set response data for the response formatter middleware
        res.locals.data = rows;
        res.locals.meta = {
            pagination: {
                page,
                limit,
                total,
                pages
            }
        };
        // Default status code is 200, no need to set res.locals.statusCode unless it's different
        next();

    } catch (err) {
        // Pass database or other errors to the central handler
        next(err);
    }
};

module.exports = listEntities;
