// app/routes/webRoutes/store/id/update.js
const pool = require('@db');
const { isUUID } = require('validator');

/**
 * @swagger
 * /web/store/{id}:
 *   put:
 *     tags:
 *       - Store
 *     summary: Update a global store item by ID
 *     description: Updates an existing global store item. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique UUID of the store item to update.
 *     requestBody:
 *       required: true
 *       description: A JSON object containing the fields to update. At least one field must be provided.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The updated name for the store item.
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: The updated description for the store item.
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 description: The updated URL for the item's image.
 *               cost:
 *                 type: integer
 *                 minimum: 0
 *                 description: The updated price of the item in mana points.
 *               quantity:
 *                 type: integer
 *                 nullable: true
 *                 minimum: 0
 *                 description: The updated available stock. NULL for infinite.
 *               is_active:
 *                 type: boolean
 *                 description: The updated visibility status in the store.
 *     responses:
 *       200:
 *         description: Store item updated successfully.
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
 *                 message:
 *                   type: string
 *                   example: "Store item updated successfully."
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const updateStoreItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, image_url, cost, quantity, is_active } = req.body;

        if (!isUUID(id)) {
            const err = new Error('Invalid ID format');
            err.statusCode = 400;
            err.code = 'INVALID_ID';
            return next(err);
        }

        const allowedFields = { name, description, image_url, cost, quantity, is_active };
        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;

        if (Object.keys(req.body).length === 0) {
            const err = new Error('At least one field to update must be provided.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        // Validations
        if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
            const err = new Error('Name, if provided, cannot be an empty string.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }
        if (cost !== undefined && (!Number.isInteger(cost) || cost < 0)) {
            const err = new Error('Cost, if provided, must be a non-negative integer.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }
        if (quantity !== undefined && (quantity !== null && (!Number.isInteger(quantity) || quantity < 0))) {
            const err = new Error('Quantity, if provided, must be a non-negative integer or null.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }
        if (is_active !== undefined && typeof is_active !== 'boolean') {
            const err = new Error('is_active, if provided, must be a boolean.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
        }

        for (const key in allowedFields) {
            if (allowedFields[key] !== undefined) {
                updateFields.push(`${key} = $${paramIndex++}`);
                queryParams.push(allowedFields[key]);
            }
        }

        updateFields.push(`updated_at = NOW()`);
        queryParams.push(id);

        const updateQuery = `UPDATE store_items SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND is_global = true AND deleted_at IS NULL RETURNING *`;

        const { rows } = await pool.query(updateQuery, queryParams);

        if (rows.length === 0) {
            const err = new Error(`Global store item with ID ${id} not found.`);
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            return next(err);
        }

        res.locals.data = rows[0];
        res.locals.message = 'Store item updated successfully.';
        next();

    } catch (err) {
        next(err);
    }
};

module.exports = updateStoreItem;
