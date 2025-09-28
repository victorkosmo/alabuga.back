// app/routes/webRoutes/store/id/get.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/store/{id}:
 *   get:
 *     tags:
 *       - Store
 *     summary: Get a global store item by ID
 *     description: Retrieve a single global store item by its unique ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the store item to retrieve.
 *     responses:
 *       200:
 *         description: The requested store item details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StoreItem'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const getStoreItem = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const { rows } = await pool.query(
            'SELECT * FROM store_items WHERE id = $1 AND is_global = true AND deleted_at IS NULL',
            [id]
        );

        if (rows.length === 0) {
            const err = new Error(`Global store item with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = getStoreItem;
